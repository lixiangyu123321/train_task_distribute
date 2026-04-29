import { useRef, useEffect } from 'react';
import type { NodeItem } from '../types';

/* ── 16×16 太空工人精灵 ── */
type Sprite = number[][];
const SPACE_IDLE: Sprite = [
  [0,0,0,0,0,0,4,4,4,4,0,0,0,0,0,0],
  [0,0,0,0,4,4,4,1,1,4,4,4,0,0,0,0],
  [0,0,0,4,4,1,1,1,1,1,1,4,4,0,0,0],
  [0,0,0,4,1,1,5,1,1,5,1,1,4,0,0,0],
  [0,0,0,4,1,1,1,1,1,1,1,1,4,0,0,0],
  [0,0,0,0,4,2,2,2,2,2,2,4,0,0,0,0],
  [0,0,0,0,4,2,2,2,2,2,2,4,0,0,0,0],
  [0,0,0,0,4,2,2,2,2,2,2,4,0,0,0,0],
  [0,0,0,0,0,4,4,4,4,4,4,0,0,0,0,0],
  [0,0,0,0,0,3,3,3,3,3,3,0,0,0,0,0],
  [0,0,0,0,3,3,3,3,3,3,3,3,0,0,0,0],
  [0,0,0,3,3,3,0,0,0,0,3,3,3,0,0,0],
  [0,0,0,3,3,0,0,0,0,0,0,3,3,0,0,0],
  [0,0,0,3,3,0,0,0,0,0,0,3,3,0,0,0],
  [0,0,0,1,0,0,0,0,0,0,0,0,1,0,0,0],
  [0,0,0,1,0,0,0,0,0,0,0,0,1,0,0,0],
];
const SPACE_WORK: Sprite = [
  [0,0,0,0,0,0,4,4,4,4,0,0,0,0,0,0],
  [0,0,0,0,4,4,4,1,1,4,4,4,0,0,0,0],
  [0,0,0,4,4,1,1,1,1,1,1,4,4,6,6,0],
  [0,0,0,4,1,1,5,1,1,5,1,1,4,6,6,0],
  [0,0,0,4,1,1,1,1,1,1,1,1,4,0,0,0],
  [0,0,0,0,4,2,2,2,2,2,2,4,0,0,0,0],
  [0,0,0,0,4,2,2,2,2,2,2,4,0,0,0,0],
  [0,0,0,0,4,2,2,2,2,2,2,4,7,0,0,0],
  [0,0,0,0,0,4,4,4,4,4,4,0,7,0,0,0],
  [0,0,0,0,0,3,3,3,3,3,3,0,0,0,0,0],
  [0,0,0,0,3,3,3,3,3,3,3,3,0,0,0,0],
  [0,0,0,3,3,3,0,0,0,0,3,3,3,0,0,0],
  [0,0,3,3,0,0,0,0,0,0,0,0,3,3,0,0],
  [0,0,3,0,0,0,0,0,0,0,0,0,0,3,0,0],
  [0,0,1,0,0,0,0,0,0,0,0,0,0,1,0,0],
  [0,1,0,0,0,0,0,0,0,0,0,0,0,0,1,0],
];
const SPACE_SLEEP: Sprite = [
  [0,0,0,0,0,0,4,4,4,4,0,0,0,0,0,0],
  [0,0,0,0,4,4,4,1,1,4,4,4,0,0,0,0],
  [0,0,0,4,4,1,1,1,1,1,1,4,4,0,0,0],
  [0,0,0,4,5,5,0,1,1,0,5,5,4,0,0,0],
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
const PAL: Record<number,string> = {1:'#ffd5a5',2:'#4060c0',3:'#304090',4:'#6080d0',5:'#000',6:'#c0c0e0',7:'#f0c040'};
function spr(ctx: CanvasRenderingContext2D, s: Sprite, x: number, y: number, sc = 2, a = 1) {
  ctx.globalAlpha = a;
  for (let r = 0; r < s.length; r++) for (let c = 0; c < s[r].length; c++) {
    const v = s[r][c]; if (v && PAL[v]) { ctx.fillStyle = PAL[v]; ctx.fillRect((x + c * sc) | 0, (y + r * sc) | 0, sc, sc); }
  }
  ctx.globalAlpha = 1;
}

/* ── 粒子 ── */
interface P { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string; size: number; }
interface Pkg { x: number; y: number; phase: number; nodeIdx: number; alpha: number; bounce: number; }

type Props = { nodes: NodeItem[]; pendingTasks: number; queuedTasks: number; runningTasks: number; onNodeClick?: (n: NodeItem) => void; };

export default function StudioCanvas({ nodes, pendingTasks, queuedTasks, runningTasks, onNodeClick }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);
  const particles = useRef<P[]>([]);
  const packages = useRef<Pkg[]>([]);
  const frame = useRef(0);
  const spawnT = useRef(0);
  const hasActivity = (pendingTasks + queuedTasks + runningTasks) > 0;
  const online = nodes.filter(n => n.status === 'ONLINE');
  const total = nodes.length;

  useEffect(() => {
    const cvs = ref.current; if (!cvs) return;
    const ctx = cvs.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      const r = cvs.parentElement!.getBoundingClientRect();
      cvs.width = r.width * dpr; cvs.height = 340 * dpr;
      cvs.style.width = r.width + 'px'; cvs.style.height = '340px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize(); window.addEventListener('resize', resize);

    const emit = (x: number, y: number, n: number, col: string) => {
      for (let i = 0; i < n; i++) particles.current.push({
        x, y, vx: (Math.random() - 0.5) * 4, vy: -Math.random() * 3 - 1,
        life: 1, maxLife: 0.4 + Math.random() * 0.4, color: col, size: 2 + Math.random() * 3,
      });
    };

    const spawn = () => {
      if (pendingTasks <= 0 || online.length === 0) return;
      const t = Math.floor(Math.random() * online.length);
      packages.current.push({ x: 40, y: 100, phase: 0, nodeIdx: t, alpha: 1, bounce: 0 });
      if (packages.current.length > 10) packages.current.shift();
    };

    const render = () => {
      const W = cvs.width / dpr, H = cvs.height / dpr, f = frame.current++;
      ctx.fillStyle = '#0d1117'; ctx.fillRect(0, 0, W, H);

      // 星场
      const starSeed = [3,17,29,41,53,67,79,97,103,113,127,139,149,163,179,191,199,211,227,239];
      for (const s of starSeed) {
        const sx = ((s * 37 + f * 0.02) % W + W) % W;
        const sy = ((s * 53) % H + H) % H;
        const bright = 0.3 + 0.3 * Math.sin(f * 0.02 + s);
        ctx.fillStyle = `rgba(255,255,255,${bright})`;
        ctx.fillRect(sx, sy, 1 + (s % 3 === 0 ? 1 : 0), 1 + (s % 3 === 0 ? 1 : 0));
      }

      // 网格
      ctx.strokeStyle = 'rgba(255,255,255,0.02)'; ctx.lineWidth = 0.5;
      for (let x = 0; x < W; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

      // 地板
      const fy = 220;
      ctx.fillStyle = '#111822';
      ctx.fillRect(0, fy, W, H - fy);
      ctx.strokeStyle = 'var(--border)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, fy); ctx.lineTo(W, fy); ctx.stroke();
      for (let x = 0; x < W; x += 64) {
        ctx.fillStyle = 'rgba(255,255,255,0.01)'; ctx.fillRect(x, fy, 32, H - fy);
      }

      // 节点位置
      const npos = total > 0 ? Array.from({ length: total }, (_, i) => ({ x: W - 80 - (total - 1 - i) * 72, y: 80 })) : [];

      // ── 传送带 ──
      const by = fy - 22;
      ctx.fillStyle = '#1a2430'; ctx.fillRect(100, by, W - 180, 18);
      ctx.strokeStyle = 'var(--border-lit)'; ctx.lineWidth = 2;
      ctx.strokeRect(100, by, W - 180, 18);
      // 滚轮
      for (let x = 108; x < W - 80; x += 18) {
        ctx.fillStyle = '#2a3548'; ctx.fillRect(x, by + 2, 6, 14);
      }
      // 光条
      if (hasActivity) {
        const sx = 108 + ((f * 4) % (W - 200)) | 0;
        const grad = ctx.createLinearGradient(sx, 0, sx + 30, 0);
        grad.addColorStop(0, 'transparent'); grad.addColorStop(0.5, 'rgba(240,192,64,0.2)'); grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad; ctx.fillRect(sx, by + 3, 30, 12);
      }

      // ── 空间站中转中心 ──
      const cx = 120, cy = 110;
      // 天线
      ctx.strokeStyle = '#506080'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx, cy - 30); ctx.lineTo(cx, cy - 10); ctx.stroke();
      ctx.fillStyle = '#f04050';
      ctx.beginPath(); ctx.arc(cx, cy - 32, 4, 0, Math.PI * 2); ctx.fill();
      // 主体
      ctx.fillStyle = '#1c2840'; ctx.fillRect(cx - 22, cy - 5, 46, 60);
      ctx.strokeStyle = hasActivity ? 'var(--gold)' : 'var(--border-lit)'; ctx.lineWidth = 3;
      ctx.strokeRect(cx - 22, cy - 5, 46, 60);
      // 穹顶
      ctx.fillStyle = '#243050';
      ctx.beginPath(); ctx.arc(cx + 1, cy - 5, 24, Math.PI, 0); ctx.fill();
      ctx.strokeStyle = hasActivity ? 'var(--gold)' : 'var(--border-lit)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(cx + 1, cy - 5, 24, Math.PI, 0); ctx.stroke();
      // 窗户
      ctx.fillStyle = hasActivity ? '#f0c040' : '#4060a0';
      ctx.fillRect(cx - 4, cy + 14, 10, 10);
      // 门
      ctx.fillStyle = '#0d1117'; ctx.fillRect(cx - 5, cy + 30, 12, 22);
      ctx.strokeStyle = 'var(--border-lit)'; ctx.lineWidth = 2;
      ctx.strokeRect(cx - 5, cy + 30, 12, 22);
      // 活跃光晕
      if (hasActivity && f % 50 < 25) {
        ctx.fillStyle = 'rgba(240,192,64,0.06)';
        ctx.fillRect(cx - 30, cy - 15, 62, 90);
      }
      // 标签
      ctx.fillStyle = 'var(--gold)'; ctx.font = '7px "Press Start 2P", monospace';
      ctx.fillText('HUB', cx - 12, cy - 14);

      // ── 节点舱 ──
      for (let i = 0; i < total; i++) {
        if (!npos[i]) continue;
        const nx = npos[i].x, ny = npos[i].y;
        const node = nodes[i];
        const busy = (node.resources?.activeTasks || 0) > 0;
        const off = node.status === 'OFFLINE';
        const err = node.status === 'ERROR';
        const border = off ? '#405060' : err ? 'var(--red)' : busy ? 'var(--green)' : 'var(--cyan)';
        const bg = off ? '#141c24' : err ? '#201018' : busy ? '#101c14' : '#141c28';

        // 玻璃舱
        ctx.fillStyle = bg; ctx.fillRect(nx - 24, ny, 50, 50);
        ctx.strokeStyle = border; ctx.lineWidth = 3; ctx.strokeRect(nx - 24, ny, 50, 50);
        // 穹顶
        ctx.fillStyle = bg;
        ctx.beginPath(); ctx.arc(nx + 1, ny, 26, Math.PI, 0); ctx.fill();
        ctx.strokeStyle = border; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(nx + 1, ny, 26, Math.PI, 0); ctx.stroke();
        // 天线
        ctx.strokeStyle = border; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(nx + 1, ny - 26); ctx.lineTo(nx + 1, ny - 34); ctx.stroke();
        ctx.fillStyle = busy ? 'var(--gold)' : off ? '#405060' : 'var(--cyan)';
        ctx.beginPath(); ctx.arc(nx + 1, ny - 36, 3, 0, Math.PI * 2); ctx.fill();
        // 屏幕
        ctx.fillStyle = '#0a0a14'; ctx.fillRect(nx - 14, ny + 10, 30, 11);
        ctx.fillStyle = off ? '#506080' : busy ? 'var(--gold)' : err ? 'var(--red)' : 'var(--cyan)';
        ctx.font = '5px "Press Start 2P", monospace';
        ctx.fillText(off ? 'OFF' : busy ? 'WORK' : err ? 'ERR' : 'IDLE', nx - 13, ny + 18);
        // 工人
        const sp = off ? SPACE_SLEEP : busy ? SPACE_WORK : SPACE_IDLE;
        spr(ctx, sp, nx - 12, ny + 46, 1, off ? 0.5 : 1);
        // 名字
        ctx.fillStyle = 'var(--dim)'; ctx.font = '6px "Press Start 2P", monospace';
        ctx.fillText((node.name || 'BAY').substring(0, 8), nx - 20, ny + 68);
        // 连接线
        ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1;
        ctx.setLineDash([4, 8]);
        ctx.beginPath(); ctx.moveTo(nx + 1, by + 8); ctx.lineTo(nx + 1, ny); ctx.stroke();
        ctx.setLineDash([]);
      }

      // ── 包裹 ──
      spawnT.current++;
      if (hasActivity && spawnT.current > 80) { spawnT.current = 0; spawn(); emit(40, 100, 5, 'var(--gold)'); }
      packages.current = packages.current.filter(p => {
        if (p.phase === 0) {
          p.x += (cx - 5 - p.x) * 0.07; p.y += (cy + 20 - p.y) * 0.07;
          p.bounce = Math.sin(frame.current * 0.2) * 3;
          if (Math.abs(p.x - (cx - 5)) < 3) { p.phase = 1; emit(cx - 5, cy + 20, 8, 'var(--cyan)'); }
        } else if (p.phase === 1) {
          if (npos[p.nodeIdx]) {
            const tx = npos[p.nodeIdx].x + 1;
            p.x += (tx - p.x) * 0.05; p.y = by + 2;
            p.bounce = Math.sin(frame.current * 0.25) * 2;
            if (Math.abs(p.x - tx) < 4) { p.phase = 2; emit(tx, by, 10, 'var(--gold)'); }
          } else { p.alpha -= 0.05; }
        } else { p.alpha -= 0.04; p.y -= 1; }
        if (p.alpha > 0.01) {
          const px = p.x - 7, py = p.y - 5 + p.bounce;
          ctx.fillStyle = '#f0c040'; ctx.fillRect(px, py, 12, 9);
          ctx.strokeStyle = '#886010'; ctx.lineWidth = 2; ctx.strokeRect(px, py, 12, 9);
          ctx.fillStyle = 'var(--gold)'; ctx.font = '6px sans-serif'; ctx.fillText('📦', px - 1, py + 8);
        }
        return p.alpha > 0.01 || p.phase < 2;
      });

      // ── 粒子 ──
      particles.current = particles.current.filter(p => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.04; p.life -= 0.025;
        if (p.life <= 0) return false;
        ctx.fillStyle = p.color; ctx.globalAlpha = p.life / p.maxLife;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        ctx.globalAlpha = 1; return true;
      });

      // ── 左侧操作员 ──
      spr(ctx, hasActivity ? SPACE_WORK : SPACE_IDLE, 18, 90, 2);
      ctx.fillStyle = 'var(--dim)'; ctx.font = '6px "Press Start 2P", monospace';
      ctx.fillText('OPERATOR', 8, 140);

      // 空状态
      if (total === 0) {
        ctx.fillStyle = 'rgba(13,17,23,0.8)'; ctx.fillRect(W / 2 - 80, 100, 160, 60);
        ctx.strokeStyle = 'var(--border-lit)'; ctx.lineWidth = 2; ctx.strokeRect(W / 2 - 80, 100, 160, 60);
        ctx.fillStyle = 'var(--dim)'; ctx.font = '9px "Press Start 2P", monospace';
        ctx.fillText('NO BAYS', W / 2 - 60, 138);
        ctx.fillStyle = 'var(--muted)'; ctx.font = '6px "Press Start 2P", monospace';
        ctx.fillText('REGISTER GPU', W / 2 - 58, 150);
      }

      animRef.current = requestAnimationFrame(render);
    };
    render();
    return () => { cancelAnimationFrame(animRef.current); window.removeEventListener('resize', resize); };
  }, [nodes, pendingTasks, queuedTasks, runningTasks]);

  return (
    <div className="panel" style={{ overflow: 'hidden', cursor: total > 0 ? 'crosshair' : 'default' }}>
      <canvas ref={ref} style={{ display: 'block', width: '100%' }} onClick={e => {
        if (!onNodeClick || total === 0 || !ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        for (let i = 0; i < total; i++) {
          const nx = rect.width - 80 - (total - 1 - i) * 72;
          if (x > nx - 28 && x < nx + 28) { onNodeClick(nodes[i]); break; }
        }
      }} />
      <div style={{
        display: 'flex', gap: 12, justifyContent: 'center',
        padding: '6px 0', borderTop: '2px solid var(--border)',
        font: '6px var(--font-pixel)', color: 'var(--muted)',
        background: 'var(--bg-deep)',
      }}>
        <span style={{ color: 'var(--cyan)' }}>◈ ONLINE</span>
        <span style={{ color: 'var(--gold)' }}>◆ BUSY</span>
        <span style={{ color: 'var(--muted)' }}>◇ OFFLINE</span>
        {hasActivity ? <span style={{ color: 'var(--gold)' }}>★ ACTIVE</span> : <span>STANDBY</span>}
      </div>
    </div>
  );
}
