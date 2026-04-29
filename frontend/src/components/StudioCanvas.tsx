import { useRef, useEffect, useState, useCallback } from 'react';
import type { NodeItem } from '../types';

/* ═══════════════════════════════════════════
   STAR OFFICE — 全链路像素动画场景引擎
   三区域: 提交区 / 中枢HUB / GPU节点阵列
   ═══════════════════════════════════════════ */

type Sprite = number[][];
const IDLE: Sprite = [[0,0,0,0,0,0,0,4,4,0,0,0,0,0,0,0],[0,0,0,0,0,4,4,1,1,4,4,0,0,0,0,0],[0,0,0,0,4,1,1,1,1,1,1,4,0,0,0,0],[0,0,0,4,1,1,5,1,1,5,1,1,4,0,0,0],[0,0,0,4,1,1,1,1,1,1,1,1,4,0,0,0],[0,0,0,0,4,2,2,2,2,2,2,4,0,0,0,0],[0,0,0,0,4,2,2,2,2,2,2,4,0,0,0,0],[0,0,0,0,4,2,2,2,2,2,2,4,0,0,0,0],[0,0,0,0,0,4,4,4,4,4,4,0,0,0,0,0],[0,0,0,0,0,3,3,3,3,3,3,0,0,0,0,0],[0,0,0,0,3,3,3,3,3,3,3,3,0,0,0,0],[0,0,0,0,3,3,3,0,0,3,3,3,0,0,0,0],[0,0,0,0,3,3,0,0,0,0,3,3,0,0,0,0],[0,0,0,0,3,3,0,0,0,0,3,3,0,0,0,0],[0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0],[0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0]];
const WORK_S: Sprite = [[0,0,0,0,0,0,0,4,4,0,0,0,0,0,0,0],[0,0,0,0,0,4,4,1,1,4,4,0,0,0,0,0],[0,0,0,0,4,1,1,1,1,1,1,4,6,6,0,0],[0,0,0,4,1,1,5,1,1,5,1,1,4,6,6,0],[0,0,0,4,1,1,1,1,1,1,1,1,4,0,0,0],[0,0,0,0,4,2,2,2,2,2,2,4,0,0,0,0],[0,0,0,0,4,2,2,2,2,2,2,4,7,0,0,0],[0,0,0,0,4,2,2,2,2,2,2,4,7,0,0,0],[0,0,0,0,0,4,4,4,4,4,4,0,0,0,0,0],[0,0,0,0,0,3,3,3,3,3,3,0,0,0,0,0],[0,0,0,0,3,3,3,3,3,3,3,3,0,0,0,0],[0,0,0,3,3,3,0,0,0,0,3,3,3,0,0,0],[0,0,3,3,0,0,0,0,0,0,0,0,3,3,0,0],[0,0,3,0,0,0,0,0,0,0,0,0,0,3,0,0],[0,0,1,0,0,0,0,0,0,0,0,0,0,1,0,0],[0,1,0,0,0,0,0,0,0,0,0,0,0,0,1,0]];
const SLEEP_S: Sprite = [[0,0,0,0,0,0,0,4,4,0,0,0,0,0,0,0],[0,0,0,0,0,4,4,1,1,4,4,0,0,0,0,0],[0,0,0,0,4,1,1,1,1,1,1,4,0,0,0,0],[0,0,0,4,5,5,0,1,1,0,5,5,4,0,0,0],[0,0,0,4,1,1,1,1,1,1,1,1,4,0,0,0],[0,0,0,0,4,2,2,2,2,2,2,4,0,0,0,0],[0,0,0,0,4,2,2,2,2,2,2,4,0,0,0,0],[0,0,0,0,4,2,2,2,2,2,2,4,0,0,0,0],[0,0,0,0,0,4,4,4,4,4,4,0,0,0,0,0],[0,0,0,0,0,3,3,3,3,3,3,0,0,0,0,0],[0,0,0,0,3,3,3,3,3,3,3,3,0,0,0,0],[0,0,0,0,3,3,3,0,0,3,3,3,0,0,0,0],[0,0,0,0,3,3,0,0,0,0,3,3,0,0,0,0],[0,0,0,0,3,3,0,0,0,0,3,3,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,1,1,0,0,0,0,1,1,0,0,0,0]];
const WALK_FRAMES: Sprite[] = [
  [[0,0,0,0,0,0,0,4,4,0,0,0,0,0,0,0],[0,0,0,0,0,4,4,1,1,4,4,0,0,0,0,0],[0,0,0,0,4,1,1,1,1,1,1,4,0,0,0,0],[0,0,0,4,1,1,5,1,1,5,1,1,4,0,0,0],[0,0,0,4,1,1,1,1,1,1,1,1,4,0,0,0],[0,0,0,0,4,2,2,2,2,2,2,4,0,0,0,0],[0,0,0,0,4,2,2,2,2,2,2,4,0,0,0,0],[0,0,0,0,4,2,2,2,2,2,2,4,0,0,0,0],[0,0,0,0,0,4,4,4,4,4,4,0,0,0,0,0],[0,0,0,0,0,3,3,3,3,3,3,0,0,0,0,0],[0,0,0,0,3,3,3,3,3,3,3,3,0,0,0,0],[0,0,0,0,3,3,0,0,0,0,3,3,0,0,0,0],[0,0,0,0,0,3,0,0,0,0,3,0,0,0,0,0],[0,0,0,0,0,0,3,0,0,3,0,0,0,0,0,0],[0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0],[0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0]],
  [[0,0,0,0,0,0,0,4,4,0,0,0,0,0,0,0],[0,0,0,0,0,4,4,1,1,4,4,0,0,0,0,0],[0,0,0,0,4,1,1,1,1,1,1,4,0,0,0,0],[0,0,0,4,1,1,5,1,1,5,1,1,4,0,0,0],[0,0,0,4,1,1,1,1,1,1,1,1,4,0,0,0],[0,0,0,0,4,2,2,2,2,2,2,4,0,0,0,0],[0,0,0,0,4,2,2,2,2,2,2,4,0,0,0,0],[0,0,0,0,4,2,2,2,2,2,2,4,0,0,0,0],[0,0,0,0,0,4,4,4,4,4,4,0,0,0,0,0],[0,0,0,0,0,3,3,3,3,3,3,0,0,0,0,0],[0,0,0,0,3,3,3,3,3,3,3,3,0,0,0,0],[0,0,0,0,0,0,3,3,3,3,0,0,0,0,0,0],[0,0,0,3,3,0,0,0,0,0,0,3,3,0,0,0],[0,0,0,0,3,0,0,0,0,0,0,3,0,0,0,0],[0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0],[0,0,0,1,0,0,0,0,0,0,0,0,1,0,0,0]],
];
const PAL: Record<number,string> = {1:'#ffd5a5',2:'#3050a0',3:'#204080',4:'#5070c0',5:'#000',6:'#c0c0e0',7:'#f0c040'};
function spr(ctx: CanvasRenderingContext2D, s: Sprite, x: number, y: number, sc = 2, a = 1) {
  ctx.globalAlpha = a;
  for (let r = 0; r < s.length; r++) for (let c = 0; c < s[r].length; c++) {
    const v = s[r][c]; if (v && PAL[v]) { ctx.fillStyle = PAL[v]; ctx.fillRect((x+c*sc)|0, (y+r*sc)|0, sc, sc); }
  }
  ctx.globalAlpha = 1;
}

interface P { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number; }
interface Pkg { x: number; y: number; phase: number; nodeIdx: number; alpha: number; bounce: number; }

type Props = {
  nodes: NodeItem[]; pendingTasks: number; queuedTasks: number; runningTasks: number;
  onNodeClick?: (n: NodeItem) => void; onAddNode?: () => void; onRemoveNode?: (n: NodeItem) => void;
};

export default function StudioCanvas(props: Props) {
  const { nodes, pendingTasks, runningTasks, onNodeClick, onAddNode, onRemoveNode } = props;
  const ref = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0); const particles = useRef<P[]>([]); const packages = useRef<Pkg[]>([]);
  const frame = useRef(0); const spawnT = useRef(0);
  const walker = useRef({ x: 50, y: 260, tx: 50, ty: 260, has: false, phase: 'idle' as string });
  const fanAngles = useRef<number[]>([]);

  const hasActivity = (pendingTasks + runningTasks) > 0;

  useEffect(() => {
    const cvs = ref.current; if (!cvs) return;
    const ctx = cvs.getContext('2d')!; const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      const r = cvs.parentElement!.getBoundingClientRect();
      cvs.width = r.width * dpr; cvs.height = 440 * dpr;
      cvs.style.width = r.width + 'px'; cvs.style.height = '440px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize(); window.addEventListener('resize', resize);

    const emit = (x: number, y: number, n: number, col: string) => {
      for (let i = 0; i < n; i++) particles.current.push({
        x, y, vx: (Math.random() - 0.5) * 6, vy: -Math.random() * 5 - 2,
        life: 1, max: 0.3 + Math.random() * 0.5, color: col, size: 2 + Math.random() * 4,
      });
    };

    const render = () => {
      const W = cvs.width / dpr, H = cvs.height / dpr, f = frame.current++;
      ctx.fillStyle = '#0d1117'; ctx.fillRect(0, 0, W, H);

      // 星空
      for (let i = 0; i < 35; i++) {
        const sx = ((i * 67 + f * 0.015) % W + W) % W, sy = ((i * 89) % (H * 0.7) + H * 0.7) % (H * 0.7);
        ctx.fillStyle = `rgba(255,255,255,${0.12 + 0.2 * Math.sin(f * 0.03 + i)})`;
        ctx.fillRect(sx, sy, (i % 5 === 0 ? 2 : 1), (i % 5 === 0 ? 2 : 1));
      }

      // 区域标签
      ctx.fillStyle = '#405070'; ctx.font = '7px "Press Start 2P", monospace';
      ctx.fillText('◇ SUBMIT', 12, 16);
      ctx.fillText('◆ HUB', W / 2 - 20, 16);
      ctx.fillText('◇ GPU BAYS', W - 160, 16);
      ctx.setLineDash([8, 16]); ctx.strokeStyle = 'rgba(64,80,112,0.25)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(160, 20); ctx.lineTo(160, 270); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(W - 170, 20); ctx.lineTo(W - 170, 270); ctx.stroke();
      ctx.setLineDash([]);

      // 地面
      const fy = 280;
      ctx.fillStyle = '#151e2c'; ctx.fillRect(0, fy, W, H - fy);
      for (let x = 0; x < W; x += 40) for (let y = fy; y < H; y += 20) {
        ctx.fillStyle = ((x / 40 + (y - fy) / 20) % 2 === 0) ? '#151e2c' : '#17202e';
        ctx.fillRect(x, y, 40, 20);
      }
      ctx.strokeStyle = '#1e2a3a'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, fy); ctx.lineTo(W, fy); ctx.stroke();

      // ── 1. 提交区 ──
      const dx = 40, dy = 200;
      ctx.fillStyle = '#1a2436'; ctx.fillRect(dx, dy, 90, 70);
      ctx.strokeStyle = '#3d5070'; ctx.lineWidth = 3; ctx.strokeRect(dx, dy, 90, 70);
      ctx.fillStyle = '#0a0e17'; ctx.fillRect(dx + 15, dy + 6, 60, 26);
      ctx.strokeStyle = '#3d5070'; ctx.lineWidth = 2; ctx.strokeRect(dx + 15, dy + 6, 60, 26);
      ctx.fillStyle = '#40d8f0'; ctx.font = '6px "Press Start 2P", monospace'; ctx.fillText('SUBMIT', dx + 18, dy + 22);
      ctx.fillStyle = '#f0c040'; ctx.fillRect(dx + 25, dy + 46, 40, 14);
      ctx.strokeStyle = '#886010'; ctx.lineWidth = 2; ctx.strokeRect(dx + 25, dy + 46, 40, 14);
      ctx.fillStyle = '#000'; ctx.font = '5px "Press Start 2P", monospace'; ctx.fillText('DEPLOY', dx + 28, dy + 56);

      // 工人
      const w = walker.current;
      if (w.phase === 'walking') {
        w.x += (w.tx - w.x) * 0.045; w.y += (w.ty - w.y) * 0.045;
        if (Math.abs(w.x - w.tx) < 2) { w.x = w.tx; w.y = w.ty; w.phase = 'deliver'; emit(w.tx, w.ty, 15, '#f0c040'); }
      } else if (w.phase === 'deliver') {
        if (f % 50 < 25) w.has = false;
        if (f % 90 === 0) { w.phase = 'return'; w.tx = dx + 45; w.ty = 240; }
      } else if (w.phase === 'return') {
        w.x += (w.tx - w.x) * 0.045; if (Math.abs(w.x - w.tx) < 2) { w.phase = 'idle'; w.x = w.tx; }
      }
      const ws = w.phase === 'walking' || w.phase === 'return' ? WALK_FRAMES[Math.floor(f / 8) % 2] :
        w.phase === 'deliver' ? WORK_S : IDLE;
      spr(ctx, ws, w.x - 16, w.y - 32, 2);
      if (w.has) {
        ctx.fillStyle = '#f0c040'; ctx.fillRect(w.x + 10, w.y - 10, 12, 10);
        ctx.strokeStyle = '#886010'; ctx.lineWidth = 2; ctx.strokeRect(w.x + 10, w.y - 10, 12, 10);
      }

      // ── 2. 中枢 HUB ──
      const hx = W / 2, hy = 150;
      ctx.fillStyle = '#1a2640'; ctx.fillRect(hx - 44, hy, 88, 68);
      ctx.strokeStyle = hasActivity ? '#f0c040' : '#3d5070'; ctx.lineWidth = 4;
      ctx.strokeRect(hx - 44, hy, 88, 68);
      ctx.fillStyle = '#223050';
      ctx.beginPath(); ctx.arc(hx, hy, 46, Math.PI, 0); ctx.fill();
      ctx.strokeStyle = hasActivity ? '#f0c040' : '#3d5070'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(hx, hy, 46, Math.PI, 0); ctx.stroke();
      // 天线+信标
      ctx.strokeStyle = '#4d6080'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(hx, hy - 46); ctx.lineTo(hx, hy - 62); ctx.stroke();
      ctx.fillStyle = hasActivity ? '#f04050' : '#405070';
      ctx.beginPath(); ctx.arc(hx, hy - 64, 5, 0, Math.PI * 2); ctx.fill();
      if (hasActivity) {
        ctx.fillStyle = `rgba(240,64,80,${0.3 + 0.4 * Math.sin(f * 0.2)})`;
        ctx.beginPath(); ctx.arc(hx, hy - 64, 9, 0, Math.PI * 2); ctx.fill();
      }
      // 窗
      for (const wx of [hx - 18, hx + 8]) {
        ctx.fillStyle = hasActivity ? '#f0c040' : '#304060';
        ctx.fillRect(wx, hy + 10, 12, 12); ctx.strokeStyle = '#4d6080'; ctx.lineWidth = 2; ctx.strokeRect(wx, hy + 10, 12, 12);
      }
      ctx.fillStyle = '#0a0e17'; ctx.fillRect(hx - 6, hy + 30, 12, 20);
      ctx.strokeStyle = '#4d6080'; ctx.lineWidth = 2; ctx.strokeRect(hx - 6, hy + 30, 12, 20);
      ctx.fillStyle = hasActivity ? '#f0c040' : '#405070';
      ctx.font = '6px "Press Start 2P", monospace'; ctx.fillText('HUB', hx - 12, hy - 6);

      // ── 3. 节点阵列 ──
      const bays = nodes.length || 1;
      for (let i = 0; i < Math.max(nodes.length, 1); i++) {
        const node = nodes[i] || null;
        const col = i % 2, row = Math.floor(i / 2);
        const bx = W - 158 + col * 76, by = 80 + row * 140;
        const isWorking = node && ((node.resources?.activeTasks || 0) > 0);
        const isOff = node ? node.status === 'OFFLINE' : true;
        const isErr = node?.status === 'ERROR';
        const bC = isOff ? '#304050' : isErr ? '#f04050' : isWorking ? '#50e060' : '#40d8f0';
        const bG = isOff ? '#141c24' : isErr ? '#201018' : isWorking ? '#0c1c12' : '#141c28';

        // 履带
        const beltSY = hy + 46 + i * 8, beltEY = by + 8;
        ctx.strokeStyle = '#232d3d'; ctx.lineWidth = 8;
        ctx.beginPath(); ctx.moveTo(hx + 34, beltSY);
        ctx.quadraticCurveTo((hx + 34 + bx + 28) / 2, Math.max(beltSY, beltEY) + 16, bx + 28, beltEY);
        ctx.stroke();
        ctx.strokeStyle = '#354860'; ctx.lineWidth = 8;
        ctx.setLineDash([4, 8]); ctx.lineDashOffset = isWorking ? -f * 3 : 0;
        ctx.beginPath(); ctx.moveTo(hx + 34, beltSY);
        ctx.quadraticCurveTo((hx + 34 + bx + 28) / 2, Math.max(beltSY, beltEY) + 16, bx + 28, beltEY);
        ctx.stroke(); ctx.setLineDash([]);

        if (!node) {
          ctx.fillStyle = 'rgba(13,17,23,0.7)'; ctx.fillRect(bx, by, 52, 60);
          ctx.strokeStyle = '#304050'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]);
          ctx.strokeRect(bx, by, 52, 60); ctx.setLineDash([]);
          ctx.fillStyle = '#506080'; ctx.font = '6px "Press Start 2P", monospace';
          ctx.fillText('EMPTY', bx + 4, by + 34);
          continue;
        }

        // 机身
        ctx.fillStyle = bG; ctx.fillRect(bx, by, 52, 60);
        ctx.strokeStyle = bC; ctx.lineWidth = 3; ctx.strokeRect(bx, by, 52, 60);

        // 风扇
        const fcx = bx + 26, fcy = by + 8;
        ctx.fillStyle = '#0a0e17'; ctx.beginPath(); ctx.arc(fcx, fcy, 10, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = bC; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(fcx, fcy, 10, 0, Math.PI * 2); ctx.stroke();
        if (isWorking) {
          if (!fanAngles.current[i]) fanAngles.current[i] = 0;
          fanAngles.current[i] += 0.25;
          for (let j = 0; j < 3; j++) {
            const a = fanAngles.current[i] + j * Math.PI * 2 / 3;
            ctx.strokeStyle = bC; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(fcx, fcy);
            ctx.lineTo(fcx + Math.cos(a) * 8, fcy + Math.sin(a) * 8); ctx.stroke();
          }
        }

        // 指示灯
        const lGlow = isWorking ? 0.5 + 0.5 * Math.sin(f * 0.3) : 0.2;
        ctx.fillStyle = isOff ? '#405060' : isErr ? '#f04050' : isWorking ? '#50e060' : '#40d8f0';
        ctx.fillRect(bx + 3, by + 2, 6, 6);
        if (isWorking) { ctx.fillStyle = `rgba(80,224,96,${lGlow})`; ctx.fillRect(bx + 1, by, 10, 10); }

        // 工作纹路
        if (isWorking) {
          ctx.strokeStyle = 'rgba(80,224,96,0.12)'; ctx.lineWidth = 1;
          for (let ly = by + 20; ly < by + 52; ly += 6) {
            ctx.beginPath(); ctx.moveTo(bx + 3, ly); ctx.lineTo(bx + 49, ly + ((f * 3 + ly) % 6 - 3)); ctx.stroke();
          }
        }

        // 屏幕
        ctx.fillStyle = '#0a0e17'; ctx.fillRect(bx + 3, by + 24, 46, 16);
        ctx.strokeStyle = bC; ctx.lineWidth = 2; ctx.strokeRect(bx + 3, by + 24, 46, 16);
        ctx.fillStyle = isOff ? '#405060' : isWorking ? '#f0c040' : isErr ? '#f04050' : '#40d8f0';
        ctx.font = '5px "Press Start 2P", monospace';
        ctx.fillText(isOff ? 'OFF' : isWorking ? 'TRAIN' : isErr ? 'ERR' : 'IDLE', bx + 6, by + 34);

        // GPU 型号 + 名字
        ctx.fillStyle = '#405070'; ctx.font = '5px "Press Start 2P", monospace';
        ctx.fillText((node.gpuModel || 'GPU').substring(0, 10), bx + 3, by + 50);
        ctx.fillStyle = '#6080a0'; ctx.fillText((node.name || `BAY-${i}`).substring(0, 8), bx + 3, by + 66);

        // 工作粒子
        if (isWorking && f % 10 < 4) emit(bx + 26, by + 60, 1, '#50e060');
      }

      // ── 包裹 ──
      spawnT.current++;
      if (hasActivity && spawnT.current > 90 && walker.current.phase === 'idle' && nodes.length > 0) {
        spawnT.current = 0;
        walker.current = { x: dx + 45, y: 240, tx: hx - 10, ty: 200, has: true, phase: 'walking' };
      }
      if (walker.current.phase === 'deliver' && !walker.current.has && packages.current.length === 0 && nodes.length > 0) {
        const t = Math.floor(Math.random() * nodes.length);
        packages.current.push({ x: hx + 20, y: hy + 46 + t * 8, phase: 1, nodeIdx: t, alpha: 1, bounce: 0 });
      }
      packages.current = packages.current.filter(p => {
        if (p.phase === 1 && p.nodeIdx < nodes.length) {
          const bx = W - 158 + (p.nodeIdx % 2) * 76, by = 80 + Math.floor(p.nodeIdx / 2) * 140;
          p.x += (bx + 26 - p.x) * 0.035; p.y += (by - p.y) * 0.035;
          p.bounce = Math.sin(frame.current * 0.3) * 3;
          if (Math.abs(p.x - (bx + 26)) < 4) {
            p.phase = 2; emit(bx + 26, by, 18, '#f0c040');
          }
        } else { p.alpha -= 0.03; p.y -= 1; }
        if (p.alpha > 0.01) {
          const px = p.x - 5, py = p.y - 4 + p.bounce;
          ctx.fillStyle = '#f0c040'; ctx.fillRect(px, py, 10, 8);
          ctx.strokeStyle = '#886010'; ctx.lineWidth = 2; ctx.strokeRect(px, py, 10, 8);
        }
        return p.alpha > 0.01;
      });

      // 粒子
      particles.current = particles.current.filter(p => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.04; p.life -= 0.02;
        if (p.life <= 0) return false;
        ctx.fillStyle = p.color; ctx.globalAlpha = p.life / p.max;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        ctx.globalAlpha = 1; return true;
      });

      // 装饰管道
      ctx.strokeStyle = '#1c2838'; ctx.lineWidth = 3;
      for (let x = 20; x < W; x += 100) { ctx.beginPath(); ctx.moveTo(x, fy + 40); ctx.lineTo(x + 60, fy + 40); ctx.stroke(); }

      if (nodes.length === 0) {
        ctx.fillStyle = 'rgba(13,17,23,0.85)'; ctx.fillRect(hx - 60, hy + 30, 120, 40);
        ctx.strokeStyle = '#3d5070'; ctx.lineWidth = 2; ctx.strokeRect(hx - 60, hy + 30, 120, 40);
        ctx.fillStyle = '#6080a0'; ctx.font = '8px "Press Start 2P", monospace'; ctx.fillText('NO BAYS', hx - 36, hy + 54);
      }

      animRef.current = requestAnimationFrame(render);
    };
    render();
    return () => { cancelAnimationFrame(animRef.current); window.removeEventListener('resize', resize); };
  }, [nodes, pendingTasks, runningTasks]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!ref.current || nodes.length === 0) return;
    const rect = ref.current.getBoundingClientRect(), x = e.clientX - rect.left;
    const dx = 40, dy = 200;
    if (x > dx + 15 && x < dx + 75 && e.clientY - rect.top > dy + 40 && e.clientY - rect.top < dy + 65 && walker.current.phase === 'idle') {
      walker.current = { x: dx + 45, y: 240, tx: rect.width / 2 - 10, ty: 200, has: true, phase: 'walking' };
      return;
    }
    const W = rect.width;
    for (let i = 0; i < nodes.length; i++) {
      const bx = W - 158 + (i % 2) * 76, by = 80 + Math.floor(i / 2) * 140;
      if (x > bx && x < bx + 52 && e.clientY - rect.top > by && e.clientY - rect.top < by + 60) { onNodeClick?.(nodes[i]); return; }
    }
  };

  return (
    <div className="panel" style={{ overflow: 'hidden', cursor: 'crosshair' }}>
      <canvas ref={ref} style={{ display: 'block', width: '100%' }} onClick={handleClick} />
      <div style={{
        display: 'flex', gap: 10, justifyContent: 'center', padding: '5px 8px',
        borderTop: '2px solid var(--border)', background: 'var(--bg-deep)',
        font: '6px var(--font-pixel)', color: 'var(--muted)', flexWrap: 'wrap', alignItems: 'center',
      }}>
        <span style={{ color: 'var(--cyan)' }}>◈ ONLINE</span>
        <span style={{ color: 'var(--gold)' }}>◆ BUSY</span>
        <span style={{ color: 'var(--muted)' }}>◇ OFFLINE</span>
        {hasActivity && <span style={{ color: 'var(--gold)' }}>★ ACTIVE</span>}
        <span style={{ flex: 1 }} />
        <button className="btn cyan sm" onClick={onAddNode}>+ ADD BAY</button>
        {nodes.length > 0 && <button className="btn red sm" onClick={() => onRemoveNode?.(nodes[nodes.length - 1])}>- REMOVE</button>}
      </div>
    </div>
  );
}
