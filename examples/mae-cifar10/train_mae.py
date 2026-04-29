#!/usr/bin/env python3
"""
MAE (Masked Auto-Encoder) 训练脚本 — CIFAR-10
==============================================
基于论文 "Masked Autoencoders Are Scalable Vision Learners" (He et al., 2021)

架构:
  - CIFAR-10 32×32 RGB 图像 → 4×4 patches (64 tokens)
  - 随机 mask 75% patches → Encoder 仅处理可见 patches (~16个)
  - Decoder 重建全部 patches → MSE 损失仅计算被 mask 区域

输出约定 (被 Worker executor 解析):
  PROGRESS: step=N/TOTAL loss=X.XXXX
  METRICS: {"step":N,"loss":X.XX,"lr":X.XX,"epoch":N,"gpu_util":XX.X}
"""

import argparse
import json
import math
import os
import signal
import sys
import time


def check_imports():
    """检查依赖，给出明确错误信息"""
    missing = []
    for mod in ["torch", "torchvision", "numpy"]:
        try:
            __import__(mod)
        except ImportError:
            missing.append(mod)
    if missing:
        print(f"ERROR: 缺少依赖包: {', '.join(missing)}")
        print("Worker 应已预装 torch/torchvision/numpy，请检查 venv 环境")
        sys.exit(1)

check_imports()

import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import DataLoader
from torchvision import datasets, transforms
from typing import Tuple


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
    def __init__(self, img_size=32, patch_size=4, in_chans=3, embed_dim=192):
        super().__init__()
        self.num_patches = (img_size // patch_size) ** 2
        self.proj = nn.Conv2d(in_chans, embed_dim, kernel_size=patch_size, stride=patch_size)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.proj(x).flatten(2).transpose(1, 2)


def get_2d_sincos_pos_embed(embed_dim: int, grid_size: int) -> torch.Tensor:
    grid_h = torch.arange(grid_size, dtype=torch.float32)
    grid_w = torch.arange(grid_size, dtype=torch.float32)
    grid = torch.stack(torch.meshgrid(grid_h, grid_w, indexing='ij'), dim=0).reshape(2, 1, -1)
    emb_h = _get_1d_sincos_pos_embed(embed_dim // 2, grid[0])
    emb_w = _get_1d_sincos_pos_embed(embed_dim // 2, grid[1])
    return torch.cat([emb_h, emb_w], dim=-1).unsqueeze(0)


def _get_1d_sincos_pos_embed(embed_dim: int, pos: torch.Tensor) -> torch.Tensor:
    omega = torch.arange(embed_dim // 2, dtype=torch.float32) / (embed_dim // 2)
    omega = 1.0 / (10000 ** omega)
    out = pos.transpose(0, 1) * omega.unsqueeze(1)
    return torch.cat([torch.sin(out), torch.cos(out)], dim=-1).squeeze(1)


class MLP(nn.Module):
    def __init__(self, in_features: int, hidden_features: int, out_features: int, dropout: float = 0.0):
        super().__init__()
        self.fc1 = nn.Linear(in_features, hidden_features)
        self.act = nn.GELU()
        self.fc2 = nn.Linear(hidden_features, out_features)
        self.drop = nn.Dropout(dropout)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.fc1(x); x = self.act(x); x = self.drop(x)
        x = self.fc2(x); x = self.drop(x)
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
        self, img_size: int = 32, patch_size: int = 4, in_chans: int = 3,
        embed_dim: int = 192, encoder_depth: int = 6, encoder_heads: int = 3,
        decoder_embed_dim: int = 128, decoder_depth: int = 2, decoder_heads: int = 4,
        mask_ratio: float = 0.75,
    ):
        super().__init__()
        self.patch_size = patch_size
        self.mask_ratio = mask_ratio
        self.num_patches = (img_size // patch_size) ** 2
        self.patch_embed = PatchEmbed(img_size, patch_size, in_chans, embed_dim)

        self.cls_token = nn.Parameter(torch.zeros(1, 1, embed_dim))
        self.pos_embed = nn.Parameter(torch.zeros(1, self.num_patches + 1, embed_dim), requires_grad=False)
        self.encoder_blocks = nn.ModuleList([TransformerBlock(embed_dim, encoder_heads) for _ in range(encoder_depth)])
        self.encoder_norm = nn.LayerNorm(embed_dim)

        self.decoder_embed = nn.Linear(embed_dim, decoder_embed_dim)
        self.mask_token = nn.Parameter(torch.zeros(1, 1, decoder_embed_dim))
        self.decoder_pos_embed = nn.Parameter(torch.zeros(1, self.num_patches + 1, decoder_embed_dim), requires_grad=False)
        self.decoder_blocks = nn.ModuleList([TransformerBlock(decoder_embed_dim, decoder_heads) for _ in range(decoder_depth)])
        self.decoder_norm = nn.LayerNorm(decoder_embed_dim)
        self.decoder_pred = nn.Linear(decoder_embed_dim, patch_size * patch_size * in_chans)

        self._init_weights()

    def _init_weights(self):
        pos_embed = get_2d_sincos_pos_embed(self.pos_embed.shape[-1], int(self.num_patches ** 0.5))
        self.pos_embed.data.copy_(torch.cat([torch.zeros(1, 1, self.pos_embed.shape[-1]), pos_embed], dim=1))
        dec_pos = get_2d_sincos_pos_embed(self.decoder_pos_embed.shape[-1], int(self.num_patches ** 0.5))
        self.decoder_pos_embed.data.copy_(torch.cat([torch.zeros(1, 1, self.decoder_pos_embed.shape[-1]), dec_pos], dim=1))
        nn.init.normal_(self.cls_token, std=0.02)
        nn.init.normal_(self.mask_token, std=0.02)
        for m in self.modules():
            if isinstance(m, nn.Linear):
                nn.init.xavier_uniform_(m.weight)
                if m.bias is not None: nn.init.constant_(m.bias, 0)
            elif isinstance(m, nn.LayerNorm):
                nn.init.constant_(m.bias, 0); nn.init.constant_(m.weight, 1.0)

    def random_masking(self, x: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        B, N, D = x.shape
        len_keep = int(N * (1 - self.mask_ratio))
        noise = torch.rand(B, N, device=x.device)
        ids_shuffle = torch.argsort(noise, dim=1)
        ids_restore = torch.argsort(ids_shuffle, dim=1)
        ids_keep = ids_shuffle[:, :len_keep]
        x_visible = torch.gather(x, dim=1, index=ids_keep.unsqueeze(-1).expand(-1, -1, D))
        mask = torch.ones(B, N, device=x.device)
        mask[:, :len_keep] = 0
        mask = torch.gather(mask, dim=1, index=ids_restore)
        return x_visible, mask, ids_restore

    def forward_encoder(self, x: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        x = self.patch_embed(x) + self.pos_embed[:, 1:, :]
        x_visible, mask, ids_restore = self.random_masking(x)
        cls_tokens = self.cls_token.expand(x_visible.shape[0], -1, -1)
        x_visible = torch.cat([cls_tokens, x_visible], dim=1)
        for blk in self.encoder_blocks: x_visible = blk(x_visible)
        return self.encoder_norm(x_visible), mask, ids_restore

    def forward_decoder(self, x: torch.Tensor, ids_restore: torch.Tensor) -> torch.Tensor:
        x = self.decoder_embed(x)
        mask_tokens = self.mask_token.repeat(x.shape[0], ids_restore.shape[1] + 1 - x.shape[1], 1)
        x_full = torch.cat([x[:, 1:, :], mask_tokens], dim=1)
        x_full = torch.gather(x_full, dim=1, index=ids_restore.unsqueeze(-1).expand(-1, -1, x_full.shape[2]))
        x_full = torch.cat([x[:, :1, :], x_full], dim=1) + self.decoder_pos_embed
        for blk in self.decoder_blocks: x_full = blk(x_full)
        return self.decoder_pred(self.decoder_norm(x_full[:, 1:, :]))

    def forward(self, imgs: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        latent, mask, ids_restore = self.forward_encoder(imgs)
        return self.forward_decoder(latent, ids_restore), mask

    def forward_loss(self, imgs: torch.Tensor, pred: torch.Tensor, mask: torch.Tensor) -> torch.Tensor:
        target = self.patch_embed(imgs)
        loss = (pred - target) ** 2
        loss = (loss.mean(dim=-1) * mask).sum() / mask.sum()
        return loss


# ═══════════════════════════════════════════
# 训练
# ═══════════════════════════════════════════

def get_gpu_info():
    """返回 GPU 信息字符串"""
    try:
        import subprocess
        out = subprocess.check_output(
            ["nvidia-smi", "--query-gpu=name,utilization.gpu,memory.total",
             "--format=csv,noheader,nounits"], timeout=3
        ).decode().strip()
        return out
    except Exception:
        return "N/A"


# CIFAR-10 下载镜像列表（按优先级排列）
CIFAR10_MIRRORS = [
    "https://www.cs.toronto.edu/~kriz/cifar-10-python.tar.gz",
    "https://dataset.bj.bcebos.com/cifar/cifar-10-python.tar.gz",
    "https://opendatalab.com/CIFAR-10/raw/main/cifar-10-python.tar.gz",
]
CIFAR10_MD5 = "c58f30108f718f92721af3b95e74349a"


def _download_cifar10(data_dir: str):
    """下载 CIFAR-10 数据集, 多镜像 fallback + signal 超时"""
    import hashlib
    import tarfile
    import urllib.request

    tar_path = os.path.join(data_dir, "cifar-10-python.tar.gz")

    def _handler(signum, frame):
        raise TimeoutError("CIFAR-10 download timed out")

    # 设置 3 分钟硬超时 (仅 Linux)
    if hasattr(signal, "SIGALRM"):
        signal.signal(signal.SIGALRM, _handler)
        signal.alarm(180)

    last_err = None
    try:
        for url in CIFAR10_MIRRORS:
            try:
                print(f"  Trying: {url}")
                sys.stdout.flush()
                req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
                with urllib.request.urlopen(req, timeout=30) as resp:
                    with open(tar_path, "wb") as f:
                        while True:
                            chunk = resp.read(8192)
                            if not chunk:
                                break
                            f.write(chunk)
                # 验证文件完整性
                with open(tar_path, "rb") as f:
                    md5 = hashlib.md5(f.read()).hexdigest()
                if md5 != CIFAR10_MD5:
                    print(f"  MD5 mismatch: {md5}, retrying...")
                    os.remove(tar_path)
                    continue
                # 解压
                with tarfile.open(tar_path, "r:gz") as tf:
                    tf.extractall(data_dir)
                os.remove(tar_path)
                print(f"  OK from {url}")
                return
            except Exception as e:
                last_err = e
                print(f"  Failed: {e}")
                sys.stdout.flush()
                if os.path.exists(tar_path):
                    os.remove(tar_path)
        raise RuntimeError(f"All mirrors failed. Last error: {last_err}")
    finally:
        if hasattr(signal, "SIGALRM"):
            signal.alarm(0)


def train(args):
    device = torch.device(args.device if args.device else ("cuda" if torch.cuda.is_available() else "cpu"))
    print(f"DEVICE: {device}")
    print(f"GPU: {get_gpu_info()}")
    print(f"TORCH: {torch.__version__}  CUDA: {torch.version.cuda}")
    print(f"ARGS: {json.dumps(vars(args), indent=2, default=str)}")
    sys.stdout.flush()

    # 数据集 — CIFAR-10 (~170MB), 多镜像 + signal 超时
    data_dir = args.data_dir or "/tmp/cifar10-data"
    os.makedirs(data_dir, exist_ok=True)
    print(f"DATA_DIR: {data_dir}")
    sys.stdout.flush()

    # 检查是否已下载 (torchvision 标准目录结构)
    cifar_ready = os.path.exists(os.path.join(data_dir, "cifar-10-batches-py"))

    if cifar_ready:
        print("CIFAR-10 already downloaded, skipping.")
    else:
        print("Downloading CIFAR-10 (~170MB)...")
        print("Mirrors: Toronto Univ, OpenDataLab, Baidu")
        sys.stdout.flush()
        try:
            _download_cifar10(data_dir)
        except Exception as e:
            print(f"FATAL: All mirrors failed: {e}")
            print("")
            print("Manual fix — SSH into GPU server and run:")
            print(f"  mkdir -p {data_dir}")
            print(f"  wget -P {data_dir} https://www.cs.toronto.edu/~kriz/cifar-10-python.tar.gz")
            print(f"  tar xzf {data_dir}/cifar-10-python.tar.gz -C {data_dir}")
            print("Then re-submit the task.")
            sys.exit(1)
        print("CIFAR-10 ready.")

    sys.stdout.flush()
    train_dataset = datasets.CIFAR10(
        root=data_dir, train=True, download=False, transform=build_transforms(True)
    )

    train_loader = DataLoader(
        train_dataset, batch_size=args.batch_size, shuffle=True,
        num_workers=min(2, os.cpu_count() or 1), pin_memory=(device.type == "cuda"),
    )
    print(f"DATASET: {len(train_dataset)} samples, {len(train_loader)} batches/epoch")
    sys.stdout.flush()

    # 模型
    model = MaskedAutoencoder(
        img_size=32, patch_size=4, in_chans=3,
        embed_dim=192, encoder_depth=6, encoder_heads=3,
        decoder_embed_dim=128, decoder_depth=2, decoder_heads=4,
        mask_ratio=args.mask_ratio,
    ).to(device)

    n_params = sum(p.numel() for p in model.parameters()) / 1e6
    print(f"MODEL: MAE ViT — {n_params:.2f}M params")
    sys.stdout.flush()

    optimizer = torch.optim.AdamW(model.parameters(), lr=args.learning_rate, weight_decay=0.05)
    total_steps = args.total_steps if args.total_steps > 0 else len(train_loader) * args.epochs
    warmup_steps = int(total_steps * 0.05)

    def lr_schedule(step):
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

            if global_step % 10 == 0:
                avg_loss = running_loss / 10
                elapsed = time.time() - start_time
                gpu = get_gpu_info().split(",")[1].strip() if get_gpu_info() != "N/A" else "-1"
                print(f"PROGRESS: step={global_step}/{total_steps} loss={avg_loss:.4f}")
                print(f"METRICS: {json.dumps({'step': global_step, 'total_steps': total_steps, 'loss': round(avg_loss, 4), 'lr': round(lr, 8), 'epoch': round(epoch + global_step / len(train_loader), 2), 'gpu_util': gpu, 'elapsed_s': round(elapsed, 1)})}")
                sys.stdout.flush()
                running_loss = 0.0

            if global_step >= total_steps:
                break

        epoch_avg = epoch_loss / max(1, len(train_loader))
        print(f"EPOCH {epoch+1}/{args.epochs} avg_loss={epoch_avg:.4f} lr={lr:.6f}")
        sys.stdout.flush()

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

    torch.save({
        "epoch": args.epochs, "global_step": global_step,
        "model_state_dict": model.state_dict(), "args": vars(args),
    }, os.path.join(ckpt_dir, "final_model.pt"))

    elapsed = time.time() - start_time
    print(f"\nTRAINING COMPLETE: {global_step} steps in {elapsed:.1f}s, best_loss={best_loss:.4f}")
    sys.stdout.flush()


def main():
    parser = argparse.ArgumentParser(description="MAE Training on CIFAR-10")
    parser.add_argument("--learning_rate", type=float, default=1.5e-4)
    parser.add_argument("--epochs", type=int, default=10)
    parser.add_argument("--batch_size", type=int, default=128)
    parser.add_argument("--mask_ratio", type=float, default=0.75)
    parser.add_argument("--warmup_epochs", type=int, default=2)
    parser.add_argument("--total_steps", type=int, default=0,
                        help="总训练步数 (0 = epochs × steps_per_epoch)")
    parser.add_argument("--output_dir", type=str, default="",
                        help="输出目录，默认 ../output")
    parser.add_argument("--data_dir", type=str, default="/tmp/cifar10-data",
                        help="CIFAR-10 数据集下载/缓存目录")
    parser.add_argument("--device", type=str, default="",
                        help="设备: cuda / cpu (留空自动检测)")
    args = parser.parse_args()
    train(args)


if __name__ == "__main__":
    main()
