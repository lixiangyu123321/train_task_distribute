#!/usr/bin/env python3
"""
MAE (Masked Auto-Encoder) 训练脚本 — CIFAR-10
==============================================
基于论文 "Masked Autoencoders Are Scalable Vision Learners" (He et al., 2021)

架构:
  - 输入: CIFAR-10 32×32 RGB 图像
  - Patch化: 4×4 patches → 共 64 个 patch tokens
  - 随机 mask 75% patches（约 48 个）
  - Encoder: ViT (depth=6, embed=192, heads=3) 仅处理可见 patches
  - Decoder: 轻量 ViT (depth=2, embed=128, heads=4) 重建全部 patches
  - 损失: MSE 仅计算被 mask 的 patches

输出约定 (被 Worker executor 解析):
  PROGRESS: step=N/TOTAL loss=X.XXXX
  METRICS: {"step":N,"loss":X.XX,"lr":X.XX,"epoch":N,"gpu_util":XX.X}
"""

import argparse
import json
import math
import os
import sys
import time
from typing import Tuple

import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import DataLoader
from torchvision import datasets, transforms


# ═══════════════════════════════════════════
# 数据增强 / 预处理
# ═══════════════════════════════════════════

CIFAR_MEAN = (0.4914, 0.4822, 0.4465)
CIFAR_STD  = (0.2470, 0.2435, 0.2616)

def build_transforms(is_train: bool):
    if is_train:
        return transforms.Compose([
            transforms.RandomCrop(32, padding=4),
            transforms.RandomHorizontalFlip(),
            transforms.ToTensor(),
            transforms.Normalize(CIFAR_MEAN, CIFAR_STD),
        ])
    return transforms.Compose([
        transforms.ToTensor(),
        transforms.Normalize(CIFAR_MEAN, CIFAR_STD),
    ])


# ═══════════════════════════════════════════
# ViT 组件
# ═══════════════════════════════════════════

class PatchEmbed(nn.Module):
    """将图像切分为 patch 并线性投影到 embedding 空间"""
    def __init__(self, img_size=32, patch_size=4, in_chans=3, embed_dim=192):
        super().__init__()
        self.img_size = img_size
        self.patch_size = patch_size
        self.num_patches = (img_size // patch_size) ** 2
        self.proj = nn.Conv2d(in_chans, embed_dim, kernel_size=patch_size, stride=patch_size)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x: (B, C, H, W) → (B, embed_dim, H/P, W/P) → (B, num_patches, embed_dim)
        x = self.proj(x)
        return x.flatten(2).transpose(1, 2)


def get_2d_sincos_pos_embed(embed_dim: int, grid_size: int) -> torch.Tensor:
    """2D sin-cos 位置编码 (来自 MAE 官方实现)"""
    grid_h = torch.arange(grid_size, dtype=torch.float32)
    grid_w = torch.arange(grid_size, dtype=torch.float32)
    grid = torch.stack(torch.meshgrid(grid_h, grid_w, indexing='ij'), dim=0).reshape(2, 1, -1)
    # grid: (2, 1, grid_size*grid_size)

    emb_h = _get_1d_sincos_pos_embed(embed_dim // 2, grid[0])  # (grid_size^2, embed_dim/2)
    emb_w = _get_1d_sincos_pos_embed(embed_dim // 2, grid[1])
    return torch.cat([emb_h, emb_w], dim=-1).unsqueeze(0)  # (1, num_patches, embed_dim)


def _get_1d_sincos_pos_embed(embed_dim: int, pos: torch.Tensor) -> torch.Tensor:
    # pos: (1, N)
    assert embed_dim % 2 == 0
    omega = torch.arange(embed_dim // 2, dtype=torch.float32) / (embed_dim // 2)
    omega = 1.0 / (10000 ** omega)  # (embed_dim/2,)
    out = pos.transpose(0, 1) * omega.unsqueeze(1)  # (N, embed_dim/2) * (embed_dim/2, 1) → (N, embed_dim/2)
    return torch.cat([torch.sin(out), torch.cos(out)], dim=-1).squeeze(1)  # (N, embed_dim)


class MLP(nn.Module):
    def __init__(self, in_features: int, hidden_features: int, out_features: int, dropout: float = 0.0):
        super().__init__()
        self.fc1 = nn.Linear(in_features, hidden_features)
        self.act = nn.GELU()
        self.fc2 = nn.Linear(hidden_features, out_features)
        self.drop = nn.Dropout(dropout)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.fc1(x)
        x = self.act(x)
        x = self.drop(x)
        x = self.fc2(x)
        x = self.drop(x)
        return x


class Attention(nn.Module):
    def __init__(self, dim: int, num_heads: int = 3, dropout: float = 0.0):
        super().__init__()
        self.num_heads = num_heads
        head_dim = dim // num_heads
        self.scale = head_dim ** -0.5
        self.qkv = nn.Linear(dim, dim * 3)
        self.proj = nn.Linear(dim, dim)
        self.drop = nn.Dropout(dropout)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        B, N, C = x.shape
        qkv = self.qkv(x).reshape(B, N, 3, self.num_heads, C // self.num_heads).permute(2, 0, 3, 1, 4)
        q, k, v = qkv[0], qkv[1], qkv[2]
        attn = (q @ k.transpose(-2, -1)) * self.scale
        attn = F.softmax(attn, dim=-1)
        x = (attn @ v).transpose(1, 2).reshape(B, N, C)
        return self.proj(self.drop(x))


class TransformerBlock(nn.Module):
    def __init__(self, dim: int, num_heads: int, mlp_ratio: float = 4.0, dropout: float = 0.0):
        super().__init__()
        self.norm1 = nn.LayerNorm(dim)
        self.attn = Attention(dim, num_heads, dropout)
        self.norm2 = nn.LayerNorm(dim)
        self.mlp = MLP(dim, int(dim * mlp_ratio), dim, dropout)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = x + self.attn(self.norm1(x))
        x = x + self.mlp(self.norm2(x))
        return x


# ═══════════════════════════════════════════
# MAE 模型
# ═══════════════════════════════════════════

class MaskedAutoencoder(nn.Module):
    def __init__(
        self,
        img_size: int = 32,
        patch_size: int = 4,
        in_chans: int = 3,
        embed_dim: int = 192,
        encoder_depth: int = 6,
        encoder_heads: int = 3,
        decoder_embed_dim: int = 128,
        decoder_depth: int = 2,
        decoder_heads: int = 4,
        mask_ratio: float = 0.75,
    ):
        super().__init__()
        self.patch_size = patch_size
        self.mask_ratio = mask_ratio
        self.num_patches = (img_size // patch_size) ** 2
        self.patch_embed = PatchEmbed(img_size, patch_size, in_chans, embed_dim)

        # Encoder
        self.cls_token = nn.Parameter(torch.zeros(1, 1, embed_dim))
        self.pos_embed = nn.Parameter(torch.zeros(1, self.num_patches + 1, embed_dim), requires_grad=False)
        self.encoder_blocks = nn.ModuleList([
            TransformerBlock(embed_dim, encoder_heads) for _ in range(encoder_depth)
        ])
        self.encoder_norm = nn.LayerNorm(embed_dim)

        # Decoder
        self.decoder_embed = nn.Linear(embed_dim, decoder_embed_dim)
        self.mask_token = nn.Parameter(torch.zeros(1, 1, decoder_embed_dim))
        self.decoder_pos_embed = nn.Parameter(
            torch.zeros(1, self.num_patches + 1, decoder_embed_dim), requires_grad=False
        )
        self.decoder_blocks = nn.ModuleList([
            TransformerBlock(decoder_embed_dim, decoder_heads) for _ in range(decoder_depth)
        ])
        self.decoder_norm = nn.LayerNorm(decoder_embed_dim)
        self.decoder_pred = nn.Linear(decoder_embed_dim, patch_size * patch_size * in_chans)

        self._init_weights()

    def _init_weights(self):
        # 初始化位置编码
        pos_embed = get_2d_sincos_pos_embed(self.pos_embed.shape[-1], int(self.num_patches ** 0.5))
        self.pos_embed.data.copy_(torch.cat([torch.zeros(1, 1, self.pos_embed.shape[-1]), pos_embed], dim=1))
        dec_pos = get_2d_sincos_pos_embed(self.decoder_pos_embed.shape[-1], int(self.num_patches ** 0.5))
        self.decoder_pos_embed.data.copy_(torch.cat([torch.zeros(1, 1, self.decoder_pos_embed.shape[-1]), dec_pos], dim=1))

        # 初始化参数
        nn.init.normal_(self.cls_token, std=0.02)
        nn.init.normal_(self.mask_token, std=0.02)
        for m in self.modules():
            if isinstance(m, nn.Linear):
                nn.init.xavier_uniform_(m.weight)
                if m.bias is not None:
                    nn.init.constant_(m.bias, 0)
            elif isinstance(m, nn.LayerNorm):
                nn.init.constant_(m.bias, 0)
                nn.init.constant_(m.weight, 1.0)

    def random_masking(self, x: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        """随机 mask patches, 返回 (visible_patches, mask_indices, ids_restore)"""
        B, N, D = x.shape
        len_keep = int(N * (1 - self.mask_ratio))  # 保留的 patch 数

        noise = torch.rand(B, N, device=x.device)
        ids_shuffle = torch.argsort(noise, dim=1)   # 升序: 前 len_keep 个保留
        ids_restore = torch.argsort(ids_shuffle, dim=1)

        ids_keep = ids_shuffle[:, :len_keep]
        x_visible = torch.gather(x, dim=1, index=ids_keep.unsqueeze(-1).expand(-1, -1, D))

        mask = torch.ones(B, N, device=x.device)
        mask[:, :len_keep] = 0
        mask = torch.gather(mask, dim=1, index=ids_restore)  # unmask 恢复

        return x_visible, mask, ids_restore

    def forward_encoder(self, x: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        # x: (B, C, H, W)
        x = self.patch_embed(x)  # (B, N, D)
        x = x + self.pos_embed[:, 1:, :]

        x_visible, mask, ids_restore = self.random_masking(x)

        cls_tokens = self.cls_token.expand(x_visible.shape[0], -1, -1)
        x_visible = torch.cat([cls_tokens, x_visible], dim=1)  # 添加 cls token (无位置编码)
        # 只给 patch tokens 加位置编码 (cls token 不加)

        for blk in self.encoder_blocks:
            x_visible = blk(x_visible)
        x_visible = self.encoder_norm(x_visible)
        return x_visible, mask, ids_restore

    def forward_decoder(self, x: torch.Tensor, ids_restore: torch.Tensor) -> torch.Tensor:
        x = self.decoder_embed(x)

        # mask tokens
        mask_tokens = self.mask_token.repeat(x.shape[0], ids_restore.shape[1] + 1 - x.shape[1], 1)
        x_full = torch.cat([x[:, 1:, :], mask_tokens], dim=1)  # 去掉 encoder cls
        x_full = torch.gather(x_full, dim=1, index=ids_restore.unsqueeze(-1).expand(-1, -1, x_full.shape[2]))

        cls_token = x[:, :1, :]
        x_full = torch.cat([cls_token, x_full], dim=1)

        x_full = x_full + self.decoder_pos_embed

        for blk in self.decoder_blocks:
            x_full = blk(x_full)
        x_full = self.decoder_norm(x_full)

        # 去掉 cls token 然后重建 patches
        x_full = x_full[:, 1:, :]
        x_full = self.decoder_pred(x_full)
        return x_full

    def forward(self, imgs: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        latent, mask, ids_restore = self.forward_encoder(imgs)
        pred = self.forward_decoder(latent, ids_restore)
        return pred, mask

    def forward_loss(self, imgs: torch.Tensor, pred: torch.Tensor, mask: torch.Tensor) -> torch.Tensor:
        """MSE 损失, 仅计算被 mask 的 patches"""
        target = self.patch_embed(imgs)  # (B, N, patch_dim^2*3)
        loss = (pred - target) ** 2
        loss = loss.mean(dim=-1)  # 每个 patch 的均值
        loss = (loss * mask).sum() / mask.sum()
        return loss


# ═══════════════════════════════════════════
# 训练循环
# ═══════════════════════════════════════════

def get_gpu_util():
    """获取 GPU 利用率 (nvidia-smi), 不可用时返回 -1"""
    try:
        import subprocess
        out = subprocess.check_output(
            ["nvidia-smi", "--query-gpu=utilization.gpu", "--format=csv,noheader,nounits"],
            timeout=2
        ).decode().strip()
        return float(out.split("\n")[0])
    except Exception:
        return -1.0


def train(args):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"DEVICE: {device}")
    print(f"ARGS: {json.dumps(vars(args), indent=2, default=str)}")

    # 数据集
    train_dataset = datasets.CIFAR10(
        root="./data", train=True, download=True, transform=build_transforms(True)
    )
    train_loader = DataLoader(
        train_dataset, batch_size=args.batch_size, shuffle=True,
        num_workers=min(2, os.cpu_count() or 1), pin_memory=(device.type == "cuda"),
    )

    # 模型
    model = MaskedAutoencoder(
        img_size=32, patch_size=4, in_chans=3,
        embed_dim=192, encoder_depth=6, encoder_heads=3,
        decoder_embed_dim=128, decoder_depth=2, decoder_heads=4,
        mask_ratio=args.mask_ratio,
    ).to(device)

    n_params = sum(p.numel() for p in model.parameters()) / 1e6
    print(f"MODEL: MAE ViT — {n_params:.2f}M params")

    optimizer = torch.optim.AdamW(model.parameters(), lr=args.learning_rate, weight_decay=0.05)
    total_steps = args.total_steps if args.total_steps > 0 else len(train_loader) * args.epochs
    warmup_steps = int(total_steps * 0.05)

    def lr_schedule(step):
        """线性 warmup + 余弦衰减"""
        if step < warmup_steps:
            return step / max(1, warmup_steps)
        progress = (step - warmup_steps) / max(1, total_steps - warmup_steps)
        return 0.5 * (1.0 + math.cos(math.pi * progress))

    model.train()
    global_step = 0
    running_loss = 0.0
    best_loss = float("inf")
    start_time = time.time()

    output_dir = args.output_dir or "../output"
    ckpt_dir = os.path.join(output_dir, "checkpoints")
    os.makedirs(ckpt_dir, exist_ok=True)

    for epoch in range(args.epochs):
        epoch_loss = 0.0
        for imgs, _ in train_loader:
            imgs = imgs.to(device)

            # 调整学习率
            lr = args.learning_rate * lr_schedule(global_step)
            for g in optimizer.param_groups:
                g["lr"] = lr

            pred, mask = model(imgs)
            loss = model.forward_loss(imgs, pred, mask)

            optimizer.zero_grad()
            loss.backward()
            optimizer.step()

            global_step += 1
            running_loss += loss.item()
            epoch_loss += loss.item()

            # 每 10 步输出进度
            if global_step % 10 == 0:
                avg_loss = running_loss / 10
                elapsed = time.time() - start_time
                gpu = get_gpu_util()
                print(f"PROGRESS: step={global_step}/{total_steps} loss={avg_loss:.4f}")
                print(f"METRICS: {json.dumps({
                    'step': global_step, 'total_steps': total_steps,
                    'loss': round(avg_loss, 4), 'lr': round(lr, 8),
                    'epoch': round(epoch + global_step / len(train_loader), 2),
                    'gpu_util': gpu, 'elapsed_s': round(elapsed, 1),
                })}")
                running_loss = 0.0

            if global_step >= total_steps:
                break

        epoch_avg = epoch_loss / max(1, len(train_loader))
        print(f"EPOCH {epoch+1}/{args.epochs} avg_loss={epoch_avg:.4f} lr={lr:.6f}")

        # 保存检查点
        if epoch_avg < best_loss:
            best_loss = epoch_avg
            torch.save({
                "epoch": epoch, "global_step": global_step,
                "model_state_dict": model.state_dict(),
                "optimizer_state_dict": optimizer.state_dict(),
                "loss": best_loss, "args": vars(args),
            }, os.path.join(ckpt_dir, "best_model.pt"))

        if global_step >= total_steps:
            break

    # 保存最终模型
    torch.save({
        "epoch": args.epochs, "global_step": global_step,
        "model_state_dict": model.state_dict(),
        "args": vars(args),
    }, os.path.join(ckpt_dir, "final_model.pt"))

    elapsed = time.time() - start_time
    print(f"\nTRAINING COMPLETE: {global_step} steps in {elapsed:.1f}s, best_loss={best_loss:.4f}")


def main():
    parser = argparse.ArgumentParser(description="MAE Training on CIFAR-10")
    parser.add_argument("--learning_rate", type=float, default=1.5e-4)
    parser.add_argument("--epochs", type=int, default=100)
    parser.add_argument("--batch_size", type=int, default=128)
    parser.add_argument("--mask_ratio", type=float, default=0.75)
    parser.add_argument("--warmup_epochs", type=int, default=5)
    parser.add_argument("--total_steps", type=int, default=0,
                        help="总训练步数 (0 = 使用 epochs × steps_per_epoch)")
    parser.add_argument("--output_dir", type=str, default="",
                        help="输出目录 (模型/日志), 默认 ../output")
    args = parser.parse_args()
    train(args)


if __name__ == "__main__":
    main()
