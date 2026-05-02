import { Link } from 'react-router-dom';

const C = ({ children }: { children: React.ReactNode }) => (
  <code style={{
    font: '9px var(--font-mono)', color: 'var(--cyan)',
    background: 'var(--bg-deep)', padding: '2px 6px',
    border: '1px solid var(--border)', whiteSpace: 'pre',
  }}>{children}</code>
);

const Block = ({ children }: { children: React.ReactNode }) => (
  <pre style={{
    font: '8px var(--font-mono)', color: 'var(--cyan)',
    background: 'var(--bg-deep)', padding: '12px 14px',
    border: '2px solid var(--border)', overflow: 'auto',
    lineHeight: 2, margin: 0,
  }}>{children}</pre>
);

export default function Tutorial() {
  return (
    <div style={{ maxWidth: 680 }}>
      <h2>◻ TUTORIAL</h2>
      <div className="divider" />

      {/* 概览 */}
      <div className="panel" style={{ padding: 14, marginTop: 12 }}>
        <h3 style={{ font: '8px var(--font-pixel)', color: 'var(--gold)', margin: '0 0 8px' }}>
          ◆ HOW TO SUBMIT A TRAINING TASK
        </h3>
        <p style={{ font: '7px var(--font-pixel)', color: 'var(--dim)', lineHeight: 2.2, margin: 0 }}>
          本系统支持通过 <b style={{ color: 'var(--cyan)' }}>ZIP 包</b> 或 <b style={{ color: 'var(--purple)' }}>JSON 表单</b> 两种方式提交 AI 训练任务。
          ZIP 包方式适合携带训练脚本与数据的完整项目，JSON 方式适合快速测试标准模板。
          任务提交后，Scheduler 自动分发至可用 GPU 节点，Worker 下载解包并通过 subprocess 执行训练脚本。
        </p>
      </div>

      {/* ZIP 包结构 */}
      <div className="panel" style={{ padding: 14, marginTop: 10 }}>
        <h3 style={{ font: '8px var(--font-pixel)', color: 'var(--cyan)', margin: '0 0 8px' }}>
          ◇ STEP 1 — ZIP PACKAGE STRUCTURE
        </h3>
        <p style={{ font: '7px var(--font-pixel)', color: 'var(--dim)', margin: '0 0 10px' }}>
          将以下文件打包为 <C>.zip</C> 后提交：
        </p>
        <Block>{`task-package.zip
├── task.yaml          # 必需 — 任务配置
├── train_mae.py       # 必需 — 训练入口脚本
├── requirements.txt   # 可选 — pip 依赖
└── data/              # 可选 — 数据集文件`}</Block>

        <p style={{ font: '7px var(--font-pixel)', color: 'var(--dim)', margin: '10px 0 6px' }}>
          <C>task.yaml</C> 配置格式：
        </p>
        <Block>{`name: "mae-cifar10-pretrain"   # 任务名称
type: "TRAIN"                   # TRAIN | FINETUNE | EVAL
model_name: "MAE-ViT-Base"      # 模型标识
entry_point: "train_mae.py"     # 训练脚本入口
params:                         # 任意训练参数
  learning_rate: 1.5e-4
  epochs: 100
  batch_size: 128
  mask_ratio: 0.75
  # ... 可自定义任意参数`}</Block>
      </div>

      {/* 输出规范 */}
      <div className="panel" style={{ padding: 14, marginTop: 10 }}>
        <h3 style={{ font: '8px var(--font-pixel)', color: 'var(--green)', margin: '0 0 8px' }}>
          ◇ STEP 2 — TRAINING SCRIPT OUTPUT FORMAT
        </h3>
        <p style={{ font: '7px var(--font-pixel)', color: 'var(--dim)', margin: '0 0 10px' }}>
          训练脚本需向 stdout 输出以下格式的行，Worker 解析后实时回传进度：
        </p>
        <Block>{`# 进度行 (每 N 步输出)
PROGRESS: step=150/1000 loss=2.3456

# 指标行 (JSON, 每 N 步输出)
METRICS: {"step":150,"loss":2.3456,"lr":0.00015,"epoch":2}`}</Block>
        <p style={{ font: '6px var(--font-pixel)', color: 'var(--muted)', margin: '8px 0 0' }}>
          Worker regex: <C>PROGRESS:\s*step=(\d+)/(\d+)\s+loss=([\d.]+)</C> &nbsp;|&nbsp; <C>{`METRICS:\\s*(\\{.+?\\})`}</C>
        </p>
      </div>

      {/* CLI 方式 */}
      <div className="panel" style={{ padding: 14, marginTop: 10 }}>
        <h3 style={{ font: '8px var(--font-pixel)', color: 'var(--purple)', margin: '0 0 8px' }}>
          ◇ STEP 3 — SUBMIT VIA CLI
        </h3>
        <p style={{ font: '7px var(--font-pixel)', color: 'var(--dim)', margin: '0 0 8px' }}>
          使用 Python CLI 客户端提交：
        </p>
        <Block>{`# 1. 打包项目目录
python cli.py pack --dir ./my-training-project

# 2. 提交到调度系统
python cli.py submit --file ./task-package.zip

# 3. 查看任务状态
python cli.py status <task-id>

# 4. 列出所有任务
python cli.py list-tasks --status RUNNING`}</Block>
      </div>

      {/* Web UI */}
      <div className="panel" style={{ padding: 14, marginTop: 10 }}>
        <h3 style={{ font: '8px var(--font-pixel)', color: 'var(--gold)', margin: '0 0 8px' }}>
          ◇ STEP 4 — SUBMIT VIA WEB UI
        </h3>
        <ol style={{ font: '7px var(--font-pixel)', color: 'var(--dim)', lineHeight: 2.4, margin: 0, paddingLeft: 16 }}>
          <li>前往 <Link to="/submit" style={{ color: 'var(--cyan)' }}>SUBMIT ◻</Link> 页面</li>
          <li>选择 <b style={{ color: 'var(--cyan)' }}>ZIP UPLOAD</b> 模式</li>
          <li>拖拽 <C>.zip</C> 文件到虚线区域，或点击选择文件</li>
          <li>输入 <C>TASK NAME</C>（可选，默认取文件名）</li>
          <li>点击 <b style={{ color: 'var(--cyan)' }}>STAGE 1: UPLOAD</b> 上传文件</li>
          <li>确认系统检测到的任务类型无误后，点击 <b style={{ color: 'var(--gold)' }}>STAGE 2: DEPLOY</b></li>
          <li>前往 <Link to="/tasks" style={{ color: 'var(--cyan)' }}>TASKS ◇</Link> 查看任务执行状态</li>
          <li>点击具体任务查看日志、指标图表和进度时间线</li>
        </ol>
      </div>

      {/* 示例 */}
      <div className="panel" style={{ padding: 14, marginTop: 10, borderColor: 'var(--gold)' }}>
        <h3 style={{ font: '8px var(--font-pixel)', color: 'var(--gold)', margin: '0 0 8px' }}>
          ★ QUICKSTART — MAE on CIFAR-10
        </h3>
        <p style={{ font: '7px var(--font-pixel)', color: 'var(--dim)', margin: '0 0 10px' }}>
          项目 <C>examples/mae-cifar10/</C> 包含完整的 MAE (Masked Auto-Encoder) 训练示例：
        </p>
        <Block>{`examples/mae-cifar10/
├── train_mae.py       # ViT MAE 完整实现 (encoder+decoder)
├── task.yaml          # 任务配置 (100 epochs, lr=1.5e-4)
└── requirements.txt   # torch, torchvision

# 一键打包并提交:
cd examples/mae-cifar10
python ../../client/cli.py pack --dir . && \\
python ../../client/cli.py submit --file ./task-package.zip`}</Block>
        <p style={{ font: '7px var(--font-pixel)', color: 'var(--dim)', margin: '10px 0 0' }}>
          该示例实现完整的 ViT-based MAE 训练：<br/>
          · 32×32 CIFAR-10 图像 → 4×4 patches (64 tokens)<br/>
          · 75% 随机 mask → Encoder 仅处理 16 个可见 patches<br/>
          · Decoder 重建全部 64 个 patches → MSE 损失仅计算被 mask 区域<br/>
          · 线性 warmup + 余弦衰减学习率调度<br/>
          · 自动输出 PROGRESS / METRICS 行供 Worker 解析
        </p>
      </div>

      <div style={{ marginTop: 14, display: 'flex', gap: 10, justifyContent: 'center' }}>
        <Link to="/submit" className="btn gold">GO TO SUBMIT ◻</Link>
        <Link to="/" className="btn cyan">BACK TO DASHBOARD ◆</Link>
      </div>
    </div>
  );
}
