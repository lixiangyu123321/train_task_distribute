import { useRef, useEffect } from 'react';
import type { NodeItem } from '../types';

// ── 像素精灵绘制工具 ──
const P = 2; // 像素缩放倍率
type Sprite = number[][];

// 16x16 工人精灵 (1=肤色 2=衣服 3=裤子 4=头发 5=眼睛 6=镐子 7=火花)
const WORKER_IDLE: Sprite = [
  [0,0,0,0,0,0,0,4,4,0,0,0,0,0,0,0],
  [0,0,0,0,0,4,4,1,1,4,4,0,0,0,0,0],
  [0,0,0,0,4,1,1,1,1,1,1,4,0,0,0,0],
  [0,0,0,4,1,1,5,1,1,5,1,1,4,0,0,0],
  [0,0,0,4,1,1,1,1,1,1,1,1,4,0,0,0],
  [0,0,0,0,4,2,2,2,2,2,2,4,0,0,0,0],
  [0,0,0,0,4,2,2,2,2,2,2,4,0,0,0,0],
  [0,0,0,0,4,2,2,2,2,2,2,4,0,0,0,0],
  [0,0,0,0,0,4,4,4,4,4,4,0,0,0,0,0],
  [0,0,0,0,0,3,3,3,3,3,3,0,0,0,0,0],
  [0,0,0,0,3,3,3,3,3,3,3,3,0,0,0,0],
  [0,0,0,0,3,3,3,0,0,3,3,3,0,0,0,0],
  [0,0,0,0,3,3,0,0,0,0,3,3,0,0,0,0],
  [0,0,0,0,3,3,0,0,0,0,3,3,0,0,0,0],
  [0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0],
  [0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0],
];

const WORKER_WORK1: Sprite = [
  [0,0,0,0,0,0,0,4,4,0,0,0,0,0,0,0],
  [0,0,0,0,0,4,4,1,1,4,4,0,0,0,0,0],
  [0,0,0,0,4,1,1,1,1,1,1,4,0,0,0,0],
  [0,0,0,4,1,1,5,1,1,5,1,1,4,0,0,0],
  [0,0,0,4,1,1,1,1,1,1,1,1,4,0,0,0],
  [0,0,0,0,4,2,2,2,2,2,2,4,6,6,0,0], // 手臂举起+镐子
  [0,0,0,0,4,2,2,2,2,2,2,4,6,6,0,0],
  [0,0,0,0,4,2,2,2,2,2,2,4,0,0,0,0],
  [0,0,0,0,0,4,4,4,4,4,4,0,7,0,0,0], // 火花
  [0,0,0,0,0,3,3,3,3,3,3,0,7,0,0,0],
  [0,0,0,0,3,3,3,3,3,3,3,3,0,0,0,0],
  [0,0,0,0,3,3,3,0,0,3,3,3,0,0,0,0],
  [0,0,0,0,3,0,0,0,0,0,0,3,0,0,0,0], // 腿部张开的姿态
  [0,0,0,3,3,0,0,0,0,0,0,3,3,0,0,0],
  [0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0],
  [0,0,0,1,0,0,0,0,0,0,0,0,1,0,0,0],
];

const WORKER_SLEEP: Sprite = [
  [0,0,0,0,0,0,0,4,4,0,0,0,0,0,0,0],
  [0,0,0,0,0,4,4,1,1,4,4,0,0,0,0,0],
  [0,0,0,0,4,1,1,1,1,1,1,4,0,0,0,0],
  [0,0,0,4,5,5,0,1,1,0,5,5,4,0,0,0], // 闭眼
  [0,0,0,4,1,1,1,1,1,1,1,1,4,0,0,0],
  [0,0,0,0,4,2,2,2,2,2,2,4,0,0,0,0],
  [0,0,0,0,4,2,2,2,2,2,2,4,0,0,0,0],
  [0,0,0,0,4,2,2,2,2,2,2,4,0,0,0,0],
  [0,0,0,0,0,4,4,4,4,4,4,0,0,0,0,0],
  [0,0,0,0,0,3,3,3,3,3,3,0,0,0,0,0],
  [0,0,0,0,3,3,3,3,3,3,3,3,0,0,0,0],
  [0,0,0,0,3,3,3,0,0,3,3,3,0,0,0,0],
  [0,0,0,0,3,3,0,0,0,0,3,3,0,0,0,0],
  [0,0,0,0,3,3,0,0,0,0,3,3,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,1,1,0,0,0,0,1,1,0,0,0,0],
];

const COLORS: Record<number, string> = {
  1: '#ffd5a5', 2: '#5bb5e8', 3: '#5a4a8a',
  4: '#8b6b4a', 5: '#333', 6: '#aaa', 7: '#ffe600',
};

function drawSprite(ctx: CanvasRenderingContext2D, sprite: Sprite, x: number, y: number, scale = 2, alpha = 1) {
  ctx.globalAlpha = alpha;
  for (let row = 0; row < sprite.length; row++) {
    for (let col = 0; col < sprite[row].length; col++) {
      const c = sprite[row][col];
      if (c && COLORS[c]) {
        ctx.fillStyle = COLORS[c];
        ctx.fillRect(Math.floor(x + col * scale), Math.floor(y + row * scale), scale, scale);
      }
    }
  }
  ctx.globalAlpha = 1;
}

// ── 粒子系统 ──
interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; color: string; size: number;
}

// ── 包裹 ──
interface PackageAnim {
  x: number; y: number; phase: number; targetX: number; targetY: number;
  nodeIdx: number; alpha: number; bounce: number;
}

// ── React 组件 ──
type Props = {
  nodes: NodeItem[];
  pendingTasks: number;
  queuedTasks: number;
  runningTasks: number;
  onNodeClick?: (node: NodeItem) => void;
};

export default function StudioCanvas({ nodes, pendingTasks, queuedTasks, runningTasks, onNodeClick }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const packagesRef = useRef<PackageAnim[]>([]);
  const frameRef = useRef(0);
  const spawnTimerRef = useRef(0);

  const hasActivity = (pendingTasks + queuedTasks + runningTasks) > 0;
  const onlineNodes = nodes.filter(n => n.status === 'ONLINE');
  const total = nodes.length;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      const rect = canvas.parentElement!.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = 340 * dpr;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = '340px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const spawnPkg = () => {
      if (pendingTasks <= 0 || onlineNodes.length === 0) return;
      const target = Math.floor(Math.random() * onlineNodes.length);
      packagesRef.current.push({
        x: 60, y: 110, phase: 0, targetX: 0, targetY: 0,
        nodeIdx: target, alpha: 1, bounce: 0,
      });
      // 限制包裹数量
      if (packagesRef.current.length > 8) packagesRef.current.shift();
    };

    const emitSparks = (x: number, y: number, count: number) => {
      for (let i = 0; i < count; i++) {
        particlesRef.current.push({
          x, y,
          vx: (Math.random() - 0.5) * 3,
          vy: -Math.random() * 3 - 1,
          life: 1, maxLife: 0.5 + Math.random() * 0.5,
          color: Math.random() > 0.5 ? '#ffe600' : '#ffa726',
          size: 2 + Math.random() * 3,
        });
      }
    };

    const W = () => canvas.width / dpr;
    const nodePositions = total > 0
      ? Array.from({ length: total }, (_, i) => ({
          x: W - 100 - (total - 1 - i) * 80,
          y: 90,
        }))
      : [];

    const render = () => {
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      const f = frameRef.current;
      frameRef.current++;

      // 清屏 — 奶油背景
      ctx.fillStyle = '#faf5ef';
      ctx.fillRect(0, 0, w, h);

      // 网格
      ctx.strokeStyle = 'rgba(0,0,0,0.03)';
      ctx.lineWidth = 0.5;
      for (let x = 0; x < w; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (let y = 0; y < h; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

      // 地板
      const floorY = 240;
      ctx.fillStyle = '#e8d8c0';
      ctx.fillRect(0, floorY, w, h - floorY);
      ctx.strokeStyle = '#d4c8b8';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, floorY); ctx.lineTo(w, floorY); ctx.stroke();
      // 地板纹理
      for (let x = 0; x < w; x += 48) {
        ctx.fillStyle = 'rgba(0,0,0,0.03)';
        ctx.fillRect(x, floorY, 24, h - floorY);
      }

      // ── 传送带 ──
      const beltY = floorY - 24;
      ctx.fillStyle = '#c8b8a0';
      ctx.fillRect(120, beltY, w - 200, 16);
      ctx.strokeStyle = '#8d6e63';
      ctx.lineWidth = 2;
      ctx.strokeRect(120, beltY, w - 200, 16);
      // 滚轮
      for (let x = 130; x < w - 80; x += 20) {
        ctx.fillStyle = '#9e8e84';
        ctx.fillRect(x, beltY + 2, 8, 12);
      }
      // 运动光条
      if (hasActivity) {
        const shineX = 130 + ((f * 3) % (w - 240));
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillRect(shineX, beltY + 3, 20, 10);
      }

      // ── 中转站 ──
      const stX = 120, stY = 130;
      ctx.fillStyle = '#ffe0b2';
      ctx.fillRect(stX - 25, stY, 54, 44);
      ctx.strokeStyle = '#8d6e63';
      ctx.lineWidth = 3;
      ctx.strokeRect(stX - 25, stY, 54, 44);
      // 屋顶
      ctx.fillStyle = '#ff8a65';
      ctx.fillRect(stX - 30, stY - 14, 64, 16);
      ctx.strokeStyle = '#bf360c';
      ctx.strokeRect(stX - 30, stY - 14, 64, 16);
      // 门
      ctx.fillStyle = hasActivity ? '#ffb74d' : '#5d4037';
      ctx.fillRect(stX - 7, stY + 22, 16, 22);
      ctx.strokeStyle = '#3e2723';
      ctx.strokeRect(stX - 7, stY + 22, 16, 22);
      // 发光
      if (hasActivity && f % 60 < 30) {
        ctx.fillStyle = 'rgba(255,152,0,0.08)';
        ctx.fillRect(stX - 35, stY - 20, 74, 80);
      }
      // 标牌
      ctx.fillStyle = '#5d4037';
      ctx.fillRect(stX - 20, stY - 22, 42, 10);
      ctx.fillStyle = '#fff';
      ctx.font = '6px "Press Start 2P", monospace';
      ctx.fillText('TRANSFER', stX - 18, stY - 14);

      // ── 节点工作站 ──
      for (let i = 0; i < total; i++) {
        if (!nodePositions[i]) continue;
        const nx = nodePositions[i].x, ny = nodePositions[i].y;
        const node = nodes[i];
        const isWorking = (node.resources?.activeTasks || 0) > 0;
        const isOffline = node.status === 'OFFLINE';
        const isError = node.status === 'ERROR';

        // 机箱
        const boxColor = isOffline ? '#e0e0e0' : isError ? '#ffebee' : isWorking ? '#e8f5e9' : '#f5f0ff';
        const borderColor = isOffline ? '#bbb' : isError ? '#ef5350' : isWorking ? '#66bb6a' : '#7e6ba0';
        ctx.fillStyle = boxColor;
        ctx.fillRect(nx - 24, ny, 52, 44);
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 3;
        ctx.strokeRect(nx - 24, ny, 52, 44);
        // 指示灯
        const dotColor = isOffline ? '#bbb' : isWorking ? '#ffa726' : isError ? '#ef5350' : '#66bb6a';
        ctx.fillStyle = dotColor;
        ctx.beginPath(); ctx.arc(nx + 18, ny + 8, 4, 0, Math.PI * 2); ctx.fill();
        // 屏幕
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(nx - 14, ny + 10, 32, 12);
        ctx.fillStyle = isOffline ? '#666' : isWorking ? '#ffa726' : isError ? '#ef5350' : '#66bb6a';
        ctx.font = '5px "Press Start 2P", monospace';
        const screenText = isOffline ? 'OFF' : isWorking ? 'BUSY' : isError ? 'ERR' : 'IDLE';
        ctx.fillText(screenText, nx - 12, ny + 19);
        // 名字
        ctx.fillStyle = '#5a4a8a';
        ctx.font = '6px "Press Start 2P", monospace';
        ctx.fillText((node.name || 'NODE').substring(0, 8), nx - 22, ny + 66);

        // 工人精灵
        const sprite = isOffline ? WORKER_SLEEP : isWorking ? WORKER_WORK1 : WORKER_IDLE;
        drawSprite(ctx, sprite, nx - 10, ny + 46, 1, isOffline ? 0.6 : 1);

        // 工作脉冲
        if (isWorking && f % 40 < 20) {
          ctx.strokeStyle = 'rgba(102,187,106,0.3)';
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.roundRect(nx - 28, ny - 4, 60, 60, 4); ctx.stroke();
        }

        // 从传送带到节点的连接线
        ctx.strokeStyle = 'rgba(0,0,0,0.08)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 6]);
        ctx.beginPath();
        ctx.moveTo(nx, beltY + 8);
        ctx.lineTo(nx, ny);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // ── 包裹生成 + 动画 ──
      spawnTimerRef.current++;
      if (hasActivity && spawnTimerRef.current > 120) {
        spawnTimerRef.current = 0;
        spawnPkg();
        emitSparks(60, 110, 4);
      }

      // 更新 + 绘制包裹
      packagesRef.current = packagesRef.current.filter(p => {
        if (p.phase === 0) {
          // 飞向中转站
          p.x += (stX - 10 - p.x) * 0.06;
          p.y += (stY + 10 - p.y) * 0.06;
          p.bounce = Math.sin(frameRef.current * 0.15) * 4;
          if (Math.abs(p.x - (stX - 10)) < 3) {
            p.phase = 1;
            emitSparks(stX - 10, stY + 10, 6);
          }
        } else if (p.phase === 1) {
          // 沿传送带到目标节点
          if (nodePositions[p.nodeIdx]) {
            const tx = nodePositions[p.nodeIdx].x;
            p.x += (tx - p.x) * 0.04;
            p.y = beltY;
            p.bounce = Math.sin(frameRef.current * 0.2) * 2;
            if (Math.abs(p.x - tx) < 5) {
              p.phase = 2;
              emitSparks(tx, beltY, 8);
            }
          } else {
            p.alpha -= 0.05;
          }
        } else {
          p.alpha -= 0.03;
          p.y -= 1;
        }

        // 绘制包裹
        if (p.alpha > 0.01) {
          const px = p.x - 8, py = p.y - 6 + p.bounce;
          ctx.fillStyle = '#ffc107';
          ctx.fillRect(px, py, 14, 10);
          ctx.strokeStyle = '#e65100';
          ctx.lineWidth = 2;
          ctx.strokeRect(px, py, 14, 10);
          // 丝带
          ctx.strokeStyle = '#ff8f00';
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + 14, py + 10); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(px + 14, py); ctx.lineTo(px, py + 10); ctx.stroke();
        }

        return p.alpha > 0.01 || p.phase < 2;
      });

      // 更新 + 绘制粒子
      particlesRef.current = particlesRef.current.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05;
        p.life -= 0.02;
        if (p.life <= 0) return false;

        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        ctx.globalAlpha = 1;
        return true;
      });

      // ── 左侧投递工人 ──
      drawSprite(ctx, hasActivity ? WORKER_WORK1 : WORKER_IDLE, 30, 100, 2);
      ctx.fillStyle = '#8a7aaa';
      ctx.font = '7px "Press Start 2P", monospace';
      ctx.fillText('CLIENT', 22, 148);

      // ── 无节点空状态 ──
      if (total === 0) {
        ctx.fillStyle = 'rgba(250,245,239,0.7)';
        ctx.fillRect(w * 0.5, 80, 160, 80);
        ctx.fillStyle = '#9a8fa8';
        ctx.font = '10px "Press Start 2P", monospace';
        ctx.fillText('NO WORKERS', w * 0.5 + 20, 130);
      }

      animRef.current = requestAnimationFrame(render);
    };

    render();
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [nodes, pendingTasks, queuedTasks, runningTasks]);

  // Canvas click handler
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onNodeClick || total === 0 || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const w = rect.width;
    // 检测点击哪个节点
    for (let i = 0; i < total; i++) {
      const nx = w - 100 - (total - 1 - i) * 80;
      if (x > nx - 28 && x < nx + 28 && y > 90 && y < 180) {
        onNodeClick(nodes[i]);
        break;
      }
    }
  };

  return (
    <div style={{
      border: '2px solid var(--c-border)', borderRadius: 'var(--radius-lg)',
      overflow: 'hidden', background: '#faf5ef',
      cursor: total > 0 ? 'pointer' : 'default',
    }}>
      <canvas ref={canvasRef} onClick={handleCanvasClick} style={{ display: 'block', width: '100%' }} />
      {/* 底部图例 */}
      <div style={{
        display: 'flex', gap: 14, justifyContent: 'center',
        padding: '8px 0', borderTop: '2px dashed var(--c-border)',
        font: '7px var(--font-mono)', color: 'var(--c-dim)',
      }}>
        <span>ONLINE</span><span>BUSY</span><span>OFFLINE</span>
        {hasActivity ? <span>ACTIVE — PACKAGES IN FLIGHT</span> : <span style={{ color: 'var(--c-muted)' }}>IDLE — NO PENDING TASKS</span>}
      </div>
    </div>
  );
}
