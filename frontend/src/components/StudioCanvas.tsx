import { useRef, useEffect } from 'react';
import type { NodeItem } from '../types';

/* ═══════════════════════════════════════════════════════════
   GPU SCHEDULER — Task Pipeline Visualization Engine
   High-quality pixel art · Isometric buildings · Glow FX
   Submit Terminal → Scheduler HUB → GPU Bay Array
   ═══════════════════════════════════════════════════════════ */

// ── Extended Palette ──
const C = {
  skin: '#ffd5a5', skinShd: '#d4a876', hair: '#5070c0', hairHi: '#7898e0',
  shirt: '#3060b0', shirtDk: '#1e3a6a', pants: '#204080', pantsDk: '#162850',
  boot: '#1a1a2e', eye: '#000', white: '#e8e8f0',
  metalLt: '#8899aa', metalMd: '#5a6a7a', metalDk: '#3a4858', metalAcc: '#40d8f0',
  screenGl: '#40d8f0', warnAmb: '#f0c040', ledGreen: '#50e060', ledRed: '#f04050',
  ledCyan: '#40d8f0', gold: '#f0c040', goldDk: '#a07820',
  panelBg: '#1a2436', panelBgLt: '#223050', deepBg: '#0d1117',
  borderDim: '#2a3548', borderLit: '#3d5070',
  cyanGlow: 'rgba(64,216,240,', greenGlow: 'rgba(80,224,96,', goldGlow: 'rgba(240,192,64,',
  redGlow: 'rgba(240,64,80,',
};

// ── Character sprites 20x20 ──
type SpriteRow = number[];
type Sprite = SpriteRow[];
const CP: Record<number, string> = {
  1: C.skin, 2: C.skinShd, 3: C.hair, 4: C.hairHi,
  5: C.shirt, 6: C.shirtDk, 7: C.pants, 8: C.pantsDk,
  9: C.boot, 10: C.eye, 11: C.white, 12: C.gold, 13: C.goldDk,
};

const IDLE_A: Sprite = [
  [0,0,0,0,0,0,0,0,3,3,3,3,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,3,4,4,4,4,3,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,3,4,4,4,4,4,4,3,0,0,0,0,0,0],
  [0,0,0,0,0,0,3,1,1,1,1,1,1,3,0,0,0,0,0,0],
  [0,0,0,0,0,0,3,1,10,1,1,10,1,3,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,1,1,2,2,1,1,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,5,5,5,5,5,5,5,5,0,0,0,0,0,0],
  [0,0,0,0,0,5,6,5,5,5,5,5,5,6,5,0,0,0,0,0],
  [0,0,0,0,0,5,6,5,5,5,5,5,5,6,5,0,0,0,0,0],
  [0,0,0,0,0,0,1,5,5,5,5,5,5,1,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,5,6,5,5,6,5,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,7,7,7,7,7,7,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,7,8,7,7,8,7,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,7,8,7,7,8,7,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,7,8,0,0,8,7,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,7,0,0,0,0,7,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,9,9,0,0,9,9,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,9,9,0,0,9,9,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];
const IDLE_B: Sprite = [
  [0,0,0,0,0,0,0,3,3,3,3,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,3,4,4,4,4,3,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,3,4,4,4,4,4,3,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,3,1,1,1,1,1,3,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,3,1,10,1,10,1,3,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,1,1,2,1,1,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,5,5,5,5,5,5,5,0,0,0,0,0,0,0],
  [0,0,0,0,0,5,6,5,5,5,5,5,6,5,0,0,0,0,0,0],
  [0,0,0,0,0,5,6,5,5,5,5,5,6,5,0,0,0,0,0,0],
  [0,0,0,0,0,0,1,5,5,5,5,5,1,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,5,6,5,6,5,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,7,7,7,7,7,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,7,8,7,8,7,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,7,8,7,8,7,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,7,8,0,8,7,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,7,0,0,0,7,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,9,9,0,9,9,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,9,9,0,9,9,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];
const IDLE_FRAMES = [IDLE_A, IDLE_A, IDLE_B, IDLE_B];

const WALK_1: Sprite = [
  [0,0,0,0,0,0,0,0,3,3,3,3,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,3,4,4,4,4,3,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,3,4,4,4,4,4,4,3,0,0,0,0,0,0],
  [0,0,0,0,0,0,3,1,1,1,1,1,1,3,0,0,0,0,0,0],
  [0,0,0,0,0,0,3,1,10,1,1,10,1,3,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,1,1,2,2,1,1,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,5,5,5,5,5,5,5,5,0,0,0,0,0,0],
  [0,0,0,0,0,5,6,5,5,5,5,5,5,6,5,0,0,0,0,0],
  [0,0,0,0,0,5,6,5,5,5,5,5,5,6,5,0,0,0,0,0],
  [0,0,0,0,0,0,1,5,5,5,5,5,5,1,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,5,6,5,5,6,5,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,7,7,7,7,7,7,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,7,7,8,0,0,7,7,0,0,0,0,0,0,0],
  [0,0,0,0,0,7,8,0,0,0,0,0,8,7,0,0,0,0,0,0],
  [0,0,0,0,0,9,0,0,0,0,0,0,0,9,0,0,0,0,0,0],
  [0,0,0,0,9,9,0,0,0,0,0,0,0,9,9,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];
const WALK_2: Sprite = [
  [0,0,0,0,0,0,0,0,3,3,3,3,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,3,4,4,4,4,3,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,3,4,4,4,4,4,4,3,0,0,0,0,0,0],
  [0,0,0,0,0,0,3,1,1,1,1,1,1,3,0,0,0,0,0,0],
  [0,0,0,0,0,0,3,1,10,1,1,10,1,3,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,1,1,2,2,1,1,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,5,5,5,5,5,5,5,5,0,0,0,0,0,0],
  [0,0,0,0,0,5,6,5,5,5,5,5,5,6,5,0,0,0,0,0],
  [0,0,0,0,0,5,6,5,5,5,5,5,5,6,5,0,0,0,0,0],
  [0,0,0,0,0,0,1,5,5,5,5,5,5,1,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,5,6,5,5,6,5,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,7,7,7,7,7,7,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,7,7,7,7,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,9,0,0,9,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,9,9,0,0,9,9,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];
const WALK_3: Sprite = [
  [0,0,0,0,0,0,0,0,3,3,3,3,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,3,4,4,4,4,3,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,3,4,4,4,4,4,4,3,0,0,0,0,0,0],
  [0,0,0,0,0,0,3,1,1,1,1,1,1,3,0,0,0,0,0,0],
  [0,0,0,0,0,0,3,1,10,1,1,10,1,3,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,1,1,2,2,1,1,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,5,5,5,5,5,5,5,5,0,0,0,0,0,0],
  [0,0,0,0,0,5,6,5,5,5,5,5,5,6,5,0,0,0,0,0],
  [0,0,0,0,0,5,6,5,5,5,5,5,5,6,5,0,0,0,0,0],
  [0,0,0,0,0,0,1,5,5,5,5,5,5,1,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,5,6,5,5,6,5,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,7,7,7,7,7,7,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,7,7,0,0,8,7,7,0,0,0,0,0,0],
  [0,0,0,0,0,0,7,8,0,0,0,0,0,8,7,0,0,0,0,0],
  [0,0,0,0,0,0,9,0,0,0,0,0,0,0,9,0,0,0,0,0],
  [0,0,0,0,0,9,9,0,0,0,0,0,0,9,9,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];
const WALK_ANIM = [WALK_1, WALK_2, WALK_3, WALK_2];

const WORK_A: Sprite = [
  [0,0,0,0,0,0,0,0,3,3,3,3,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,3,4,4,4,4,3,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,3,4,4,4,4,4,4,3,0,0,0,0,0,0],
  [0,0,0,0,0,0,3,1,1,1,1,1,1,3,0,0,0,0,0,0],
  [0,0,0,0,0,0,3,1,10,1,1,10,1,3,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,1,1,2,2,1,1,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0,0,0],
  [0,0,0,0,0,5,5,5,5,5,5,5,5,5,5,0,0,0,0,0],
  [0,0,0,0,5,6,5,5,5,5,5,5,5,5,6,5,0,0,0,0],
  [0,0,0,1,1,6,5,5,5,5,5,5,5,6,1,1,0,0,0,0],
  [0,0,0,0,0,0,1,5,5,5,5,5,1,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,5,6,5,6,5,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,7,7,7,7,7,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,7,8,7,8,7,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,7,8,7,8,7,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,7,0,0,0,7,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,9,9,0,9,9,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,9,9,0,9,9,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

function drawSprite(ctx: CanvasRenderingContext2D, s: Sprite, pal: Record<number, string>, x: number, y: number, sc = 2, alpha = 1) {
  ctx.globalAlpha = alpha;
  for (let r = 0; r < s.length; r++) {
    for (let c = 0; c < s[r].length; c++) {
      const v = s[r][c];
      if (v && pal[v]) {
        ctx.fillStyle = pal[v];
        ctx.fillRect((x + c * sc) | 0, (y + r * sc) | 0, sc, sc);
      }
    }
  }
  ctx.globalAlpha = 1;
}

// ── Types ──
interface Particle { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string; size: number; shape: 'square' | 'circle'; }
interface DataOrb { x: number; y: number; tx: number; ty: number; progress: number; color: string; size: number; trail: {x: number; y: number}[]; }
interface Walker { x: number; y: number; tx: number; ty: number; phase: 'idle' | 'toHub' | 'deliver' | 'returning'; hasPackage: boolean; }

type Props = {
  nodes: NodeItem[];
  pendingTasks: number; queuedTasks: number; runningTasks: number;
  completedTasks?: number; failedTasks?: number;
  dispatchingTasks?: number;
  onNodeClick?: (n: NodeItem) => void; onAddNode?: () => void; onRemoveNode?: (n: NodeItem) => void;
};

function easeInOutCubic(t: number) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

// GPU Bay dimensions (enlarged)
const BAY_W = 96, BAY_H = 120;
const BAY_COL_GAP = 110, BAY_ROW_GAP = 136;

export default function StudioCanvas(props: Props) {
  const { nodes, pendingTasks, queuedTasks, runningTasks, completedTasks = 0, failedTasks = 0, dispatchingTasks = 0, onNodeClick, onAddNode, onRemoveNode } = props;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);
  const propsRef = useRef(props);
  propsRef.current = props;
  const stateRef = useRef({
    particles: [] as Particle[],
    dataOrbs: [] as DataOrb[],
    walker: { x: 0, y: 0, tx: 0, ty: 0, phase: 'idle', hasPackage: false } as Walker,
    fanAngles: [] as number[],
    lastTime: 0,
    time: 0,
    spawnTimer: 0,
    dustMotes: [] as { x: number; y: number; vx: number; vy: number; alpha: number; size: number }[],
    starLayers: [
      Array.from({ length: 20 }, () => ({ x: Math.random(), y: Math.random() * 0.5, size: 1, twinkle: Math.random() * Math.PI * 2 })),
      Array.from({ length: 30 }, () => ({ x: Math.random(), y: Math.random() * 0.5, size: Math.random() > 0.7 ? 2 : 1, twinkle: Math.random() * Math.PI * 2 })),
      Array.from({ length: 15 }, () => ({ x: Math.random(), y: Math.random() * 0.4, size: 2, twinkle: Math.random() * Math.PI * 2 })),
    ],
    heatWaves: [] as { x: number; y: number; w: number; phase: number; speed: number }[],
  });

  useEffect(() => {
    const cvs = canvasRef.current; if (!cvs) return;
    const ctx = cvs.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    const CANVAS_H = 520;
    const resize = () => {
      const r = cvs.parentElement!.getBoundingClientRect();
      cvs.width = r.width * dpr; cvs.height = CANVAS_H * dpr;
      cvs.style.width = r.width + 'px'; cvs.style.height = CANVAS_H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize(); window.addEventListener('resize', resize);
    const S = stateRef.current;

    if (S.dustMotes.length === 0) {
      for (let i = 0; i < 25; i++) {
        S.dustMotes.push({
          x: Math.random(), y: Math.random(), vx: (Math.random() - 0.5) * 0.00003,
          vy: -Math.random() * 0.00005 - 0.00001, alpha: Math.random() * 0.3 + 0.05, size: Math.random() * 2 + 1,
        });
      }
    }

    const emitParticles = (x: number, y: number, count: number, color: string, shape: 'square' | 'circle' = 'circle') => {
      for (let i = 0; i < count; i++) {
        S.particles.push({
          x, y,
          vx: (Math.random() - 0.5) * 4, vy: -Math.random() * 4 - 1,
          life: 1, maxLife: 0.4 + Math.random() * 0.6,
          color, size: 1.5 + Math.random() * 3, shape,
        });
      }
    };

    // ── Draw helpers ──
    function drawGlowLine(x1: number, y1: number, x2: number, y2: number, color: string, glowBase: string, intensity: number) {
      ctx.strokeStyle = `${glowBase}${0.06 * intensity})`;
      ctx.lineWidth = 12; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.strokeStyle = `${glowBase}${0.15 * intensity})`;
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.strokeStyle = color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.lineCap = 'butt';
    }

    function drawGlowBezier(sx: number, sy: number, cx: number, cy: number, ex: number, ey: number, color: string, glowBase: string, intensity: number, animated: boolean, t: number) {
      for (const [w, a] of [[14, 0.04], [6, 0.12], [2, 1.0]] as [number, number][]) {
        ctx.strokeStyle = a < 1 ? `${glowBase}${a * intensity})` : color;
        ctx.lineWidth = w; ctx.lineCap = 'round';
        if (animated) { ctx.setLineDash([3, 9]); ctx.lineDashOffset = -t * 40; }
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(cx, cy, ex, ey); ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.lineCap = 'butt';
    }

    function drawMonitor(x: number, y: number, w: number, h: number, on: boolean, t: number, label?: string) {
      ctx.fillStyle = C.metalDk; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = C.metalMd; ctx.fillRect(x + 1, y + 1, w - 2, 2);
      ctx.strokeStyle = C.metalMd; ctx.lineWidth = 1; ctx.strokeRect(x, y, w, h);
      const sx = x + 3, sy = y + 4, sw = w - 6, sh = h - 8;
      if (on) {
        const flicker = 0.85 + Math.sin(t * 6 + x) * 0.05 + (Math.random() > 0.97 ? -0.15 : 0);
        ctx.fillStyle = `rgba(10,20,40,${flicker})`;
        ctx.fillRect(sx, sy, sw, sh);
        ctx.fillStyle = 'rgba(64,216,240,0.03)';
        ctx.fillRect(sx, sy + ((t * 30) % sh), sw, 2);
        ctx.fillStyle = C.screenGl;
        ctx.globalAlpha = 0.7 + Math.sin(t * 2) * 0.1;
        ctx.font = '3px monospace';
        if (label) {
          ctx.fillText(label, sx + 2, sy + sh / 2 + 1);
        } else {
          for (let ly = 0; ly < 3; ly++) {
            const lineW = 4 + ((t * 10 + ly * 7) % (sw - 8));
            ctx.fillRect(sx + 2, sy + 3 + ly * 4, lineW, 1);
          }
        }
        ctx.globalAlpha = 1;
        ctx.shadowColor = C.screenGl; ctx.shadowBlur = 6;
        ctx.fillStyle = 'rgba(64,216,240,0.02)';
        ctx.fillRect(sx, sy, sw, sh);
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = '#0a0e17'; ctx.fillRect(sx, sy, sw, sh);
      }
    }

    function drawLed(x: number, y: number, color: string, on: boolean, t: number, blinkRate = 0) {
      const isOn = on && (blinkRate === 0 || Math.sin(t * blinkRate) > -0.3);
      ctx.fillStyle = isOn ? color : '#2a3040';
      ctx.fillRect(x, y, 3, 3);
      if (isOn) {
        ctx.shadowColor = color; ctx.shadowBlur = 4;
        ctx.fillRect(x, y, 3, 3);
        ctx.shadowBlur = 0;
      }
    }

    function drawServerRack(x: number, y: number, w: number, h: number, active: boolean, t: number, taskCount: number) {
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x + 4, y + 4, w, h);
      const grad = ctx.createLinearGradient(x, y, x + w, y);
      grad.addColorStop(0, active ? '#1a2a44' : C.panelBg);
      grad.addColorStop(0.5, active ? '#1e3050' : C.panelBgLt);
      grad.addColorStop(1, active ? '#1a2a44' : C.panelBg);
      ctx.fillStyle = grad; ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = active ? C.warnAmb : C.borderLit; ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);
      ctx.fillStyle = active ? 'rgba(240,192,64,0.15)' : 'rgba(100,120,140,0.1)';
      ctx.fillRect(x + 1, y + 1, w - 2, 3);

      const unitH = 8, gap = 2, startY = y + 8;
      const units = Math.floor((h - 16) / (unitH + gap));
      for (let i = 0; i < units; i++) {
        const uy = startY + i * (unitH + gap);
        ctx.fillStyle = i % 2 === 0 ? '#141e2e' : '#161f30';
        ctx.fillRect(x + 4, uy, w - 8, unitH);
        ctx.strokeStyle = '#2a3548'; ctx.lineWidth = 0.5;
        ctx.strokeRect(x + 4, uy, w - 8, unitH);
        const ledColors = [C.ledGreen, C.ledCyan, C.warnAmb, C.ledGreen];
        for (let j = 0; j < 4; j++) {
          drawLed(x + 6 + j * 5, uy + 2, ledColors[j], active, t + i * 0.3 + j * 0.7, active ? 3 + j * 0.5 : 0);
        }
        if (active) {
          const barW = (w - 36) * (0.3 + 0.7 * Math.abs(Math.sin(t * 2 + i)));
          ctx.fillStyle = C.ledCyan; ctx.globalAlpha = 0.3;
          ctx.fillRect(x + 28, uy + 3, barW, 2);
          ctx.globalAlpha = 1;
        }
      }

      const dishX = x + w / 2, dishY = y - 12;
      ctx.strokeStyle = C.metalMd; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(dishX, y); ctx.lineTo(dishX, dishY + 4); ctx.stroke();
      ctx.strokeStyle = active ? C.warnAmb : C.metalMd; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(dishX, dishY, 8, Math.PI * 0.8, Math.PI * 0.2, true); ctx.stroke();
      if (active) {
        for (let r = 0; r < 3; r++) {
          const radius = 12 + r * 6 + Math.sin(t * 3) * 2;
          ctx.strokeStyle = `${C.goldGlow}${0.3 - r * 0.08})`;
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(dishX, dishY, radius, -Math.PI * 0.6, -Math.PI * 0.4); ctx.stroke();
          ctx.beginPath(); ctx.arc(dishX, dishY, radius, Math.PI * 0.4, Math.PI * 0.6); ctx.stroke();
        }
      }
      ctx.fillStyle = active ? C.ledRed : '#405070';
      ctx.beginPath(); ctx.arc(dishX, dishY - 2, 3, 0, Math.PI * 2); ctx.fill();
      if (active) {
        ctx.shadowColor = C.ledRed; ctx.shadowBlur = 8 + Math.sin(t * 4) * 4;
        ctx.fill(); ctx.shadowBlur = 0;
      }

      drawMonitor(x + 4, y + h - 20, w - 8, 16, true, t,
        active ? `TASKS: ${taskCount}` : 'STANDBY');

      if (active) {
        const ugGrad = ctx.createRadialGradient(x + w / 2, y + h + 2, 0, x + w / 2, y + h + 2, w * 0.6);
        ugGrad.addColorStop(0, 'rgba(240,192,64,0.12)');
        ugGrad.addColorStop(1, 'rgba(240,192,64,0)');
        ctx.fillStyle = ugGrad;
        ctx.fillRect(x - 10, y + h - 2, w + 20, 20);
      }
    }

    function drawGpuBay(x: number, y: number, node: NodeItem | null, idx: number, t: number) {
      const w = BAY_W, h = BAY_H;
      if (!node) {
        ctx.fillStyle = 'rgba(13,17,23,0.5)'; ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = C.borderDim; ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]); ctx.strokeRect(x, y, w, h); ctx.setLineDash([]);
        ctx.fillStyle = '#506080'; ctx.font = '7px "Press Start 2P", monospace';
        ctx.fillText('EMPTY', x + 18, y + h / 2 - 4);
        ctx.fillText('BAY', x + 28, y + h / 2 + 10);
        return;
      }

      const isWorking = (node.resources?.activeTasks || 0) > 0;
      const isOff = node.status === 'OFFLINE';
      const isErr = node.status === 'ERROR';
      const accentColor = isOff ? C.borderDim : isErr ? C.ledRed : isWorking ? C.ledGreen : C.ledCyan;
      const glowBase = isOff ? 'rgba(60,70,80,' : isErr ? C.redGlow : isWorking ? C.greenGlow : C.cyanGlow;
      const util = node.resources?.gpuUtilization || 0;

      // Drop shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x + 4, y + 4, w, h);

      // Vibration
      const vib = isWorking ? Math.sin(t * 30) * 0.5 : 0;
      const bx = x + vib, by = y;

      // Case body gradient
      const caseGrad = ctx.createLinearGradient(bx, by, bx + w, by);
      caseGrad.addColorStop(0, isWorking ? '#0c1c12' : isErr ? '#201018' : isOff ? '#141c24' : '#141c28');
      caseGrad.addColorStop(0.5, isWorking ? '#102618' : isErr ? '#2a1420' : isOff ? '#182028' : '#182030');
      caseGrad.addColorStop(1, isWorking ? '#0c1c12' : isErr ? '#201018' : isOff ? '#141c24' : '#141c28');
      ctx.fillStyle = caseGrad; ctx.fillRect(bx, by, w, h);

      // Frame border
      ctx.strokeStyle = accentColor; ctx.lineWidth = 2; ctx.strokeRect(bx, by, w, h);
      // Top highlight strip
      ctx.fillStyle = `${glowBase}0.15)`; ctx.fillRect(bx + 1, by + 1, w - 2, 3);

      // ── Top section: ventilation grills (8 rows) ──
      for (let i = 0; i < 8; i++) {
        const gy = by + 5 + i * 4;
        ctx.fillStyle = '#0a0e17'; ctx.fillRect(bx + 5, gy, w - 10, 2);
        if (isWorking) {
          const shimmer = Math.sin(t * 8 + i * 0.7) * 0.15;
          ctx.fillStyle = `${C.greenGlow}${0.05 + shimmer})`;
          ctx.fillRect(bx + 5, gy, w - 10, 2);
        }
      }

      // Heat shimmer waves above when working
      if (isWorking) {
        ctx.globalAlpha = 0.08;
        for (let hw = 0; hw < 3; hw++) {
          const wy = by - 4 - hw * 5 + Math.sin(t * 3 + hw) * 2;
          const ww = 20 + Math.sin(t * 2 + hw * 1.5) * 8;
          const wx = bx + w / 2 - ww / 2;
          ctx.fillStyle = C.ledGreen;
          ctx.beginPath();
          ctx.moveTo(wx, wy);
          ctx.quadraticCurveTo(wx + ww / 2, wy - 3 + Math.sin(t * 4 + hw) * 2, wx + ww, wy);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }

      // ── Mid section: dual fans ──
      const fanSectionY = by + 38;
      ctx.fillStyle = '#080c14'; ctx.fillRect(bx + 4, fanSectionY - 2, w - 8, 28);
      ctx.strokeStyle = '#1a2438'; ctx.lineWidth = 0.5;
      ctx.strokeRect(bx + 4, fanSectionY - 2, w - 8, 28);

      // Draw two fans
      const fanPositions = [bx + w * 0.3, bx + w * 0.7];
      for (let fi = 0; fi < 2; fi++) {
        const fcx = fanPositions[fi], fcy = fanSectionY + 12;
        const fanR = 10;

        // Fan housing ring
        ctx.strokeStyle = '#2a3548'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(fcx, fcy, fanR + 1, 0, Math.PI * 2); ctx.stroke();

        // Fan background
        ctx.fillStyle = '#060a12';
        ctx.beginPath(); ctx.arc(fcx, fcy, fanR, 0, Math.PI * 2); ctx.fill();

        // Fan accent ring
        ctx.strokeStyle = `${glowBase}0.3)`;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(fcx, fcy, fanR - 3, 0, Math.PI * 2); ctx.stroke();

        const aIdx = idx * 2 + fi;
        if (!S.fanAngles[aIdx]) S.fanAngles[aIdx] = Math.random() * Math.PI * 2;
        if (isWorking) S.fanAngles[aIdx] += 0.25 + fi * 0.05;
        else if (!isOff) S.fanAngles[aIdx] += 0.02;

        const bladeCount = 5;
        for (let b = 0; b < bladeCount; b++) {
          const angle = S.fanAngles[aIdx] + b * Math.PI * 2 / bladeCount;
          ctx.strokeStyle = isWorking ? accentColor : C.metalMd;
          ctx.lineWidth = isWorking ? 2.5 : 1.5;
          ctx.globalAlpha = isWorking ? 0.7 : 0.4;
          ctx.beginPath();
          ctx.moveTo(fcx + Math.cos(angle) * 2, fcy + Math.sin(angle) * 2);
          ctx.lineTo(fcx + Math.cos(angle) * (fanR - 2), fcy + Math.sin(angle) * (fanR - 2));
          ctx.stroke();
          if (isWorking) {
            ctx.globalAlpha = 0.15;
            ctx.beginPath();
            ctx.moveTo(fcx + Math.cos(angle + 0.2) * 2, fcy + Math.sin(angle + 0.2) * 2);
            ctx.lineTo(fcx + Math.cos(angle + 0.2) * (fanR - 2), fcy + Math.sin(angle + 0.2) * (fanR - 2));
            ctx.stroke();
          }
        }
        ctx.globalAlpha = 1;

        // Center hub
        ctx.fillStyle = isWorking ? accentColor : C.metalMd;
        ctx.beginPath(); ctx.arc(fcx, fcy, 2, 0, Math.PI * 2); ctx.fill();
      }

      // Divider line between fan section and info section
      ctx.fillStyle = accentColor; ctx.globalAlpha = 0.3;
      ctx.fillRect(bx + 4, fanSectionY + 27, w - 8, 1);
      ctx.globalAlpha = 1;

      // ── LED row (6 LEDs for bigger bay) ──
      const ledY = by + 70;
      drawLed(bx + 6, ledY, C.ledGreen, !isOff, t, isOff ? 0 : 1);
      drawLed(bx + 13, ledY, C.warnAmb, isWorking, t, isWorking ? 8 : 0);
      drawLed(bx + 20, ledY, C.ledCyan, !isOff, t, 2);
      drawLed(bx + 27, ledY, isWorking ? C.ledGreen : isErr ? C.ledRed : C.ledCyan, !isOff, t, isWorking ? 5 : 0);
      drawLed(bx + 34, ledY, C.ledCyan, !isOff && isWorking, t, 3);
      drawLed(bx + 41, ledY, C.warnAmb, isWorking, t, 6);

      // LED labels
      ctx.fillStyle = '#3a4858'; ctx.font = '2px monospace'; ctx.globalAlpha = 0.5;
      ctx.fillText('PWR', bx + 5, ledY + 7);
      ctx.fillText('DSK', bx + 12, ledY + 7);
      ctx.fillText('NET', bx + 19, ledY + 7);
      ctx.fillText('GPU', bx + 26, ledY + 7);
      ctx.fillText('MEM', bx + 33, ledY + 7);
      ctx.fillText('TMP', bx + 40, ledY + 7);
      ctx.globalAlpha = 1;

      // ── Main monitor (larger) ──
      drawMonitor(bx + 4, by + 80, w - 8, 18, !isOff, t,
        isOff ? undefined : isWorking ? 'TRAINING...' : isErr ? '! ERROR !' : 'IDLE');

      // ── GPU model label ──
      ctx.fillStyle = C.metalLt; ctx.font = '5px "Press Start 2P", monospace';
      ctx.fillText((node.gpuModel || 'GPU').substring(0, 14), bx + 4, by + 106);

      // ── Node name label with accent color ──
      ctx.fillStyle = accentColor;
      ctx.fillText((node.name || `BAY-${idx}`).substring(0, 12), bx + 4, by + 114);

      // ── Utilization bar with percentage ──
      const barY = by + h - 6, barW = w - 24;
      ctx.fillStyle = '#0a0e17'; ctx.fillRect(bx + 4, barY, barW, 4);
      if (util > 0) {
        const barColor = util > 80 ? C.ledRed : util > 50 ? C.warnAmb : C.ledGreen;
        const fillW = barW * util / 100;
        ctx.fillStyle = barColor;
        ctx.fillRect(bx + 4, barY, fillW, 4);
        ctx.shadowColor = barColor; ctx.shadowBlur = 4;
        ctx.fillRect(bx + 4, barY, fillW, 4);
        ctx.shadowBlur = 0;
        // Animated pulse on the bar edge
        if (isWorking) {
          ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.4 + Math.sin(t * 6) * 0.3;
          ctx.fillRect(bx + 4 + fillW - 2, barY, 2, 4);
          ctx.globalAlpha = 1;
        }
      }
      // Percentage text
      ctx.fillStyle = C.metalLt; ctx.font = '4px monospace';
      ctx.fillText(`${util}%`, bx + w - 18, barY + 4);

      // ── Temperature indicator ──
      const gpuTemp = node.resources?.gpuTemp || 0;
      if (gpuTemp > 0 && !isOff) {
        const tempColor = gpuTemp > 80 ? C.ledRed : gpuTemp > 60 ? C.warnAmb : C.ledGreen;
        ctx.fillStyle = tempColor;
        ctx.font = '3px monospace';
        ctx.fillText(`${gpuTemp}°C`, bx + w - 20, by + 106);
      }

      // ── VRAM usage bar (small, under main bar) ──
      const vramUsed = node.resources?.vramUsedMb || 0;
      const vramTotal = node.vramTotalMb || 1;
      const vramPct = Math.min(vramUsed / vramTotal * 100, 100);
      if (vramTotal > 1) {
        ctx.fillStyle = '#0a0e17'; ctx.fillRect(bx + 4, barY - 6, barW, 2);
        const vramColor = vramPct > 90 ? C.ledRed : vramPct > 70 ? C.warnAmb : C.ledCyan;
        ctx.fillStyle = vramColor; ctx.globalAlpha = 0.6;
        ctx.fillRect(bx + 4, barY - 6, barW * vramPct / 100, 2);
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#3a4858'; ctx.font = '2px monospace';
        ctx.fillText('VRAM', bx + w - 20, barY - 4);
      }

      // Heat exhaust particles
      if (isWorking && Math.random() < 0.2) {
        emitParticles(bx + w / 2 + (Math.random() - 0.5) * 30, by - 2, 1, C.ledGreen, 'circle');
      }

      // Error sparks
      if (isErr && Math.random() < 0.08) {
        emitParticles(bx + Math.random() * w, by + Math.random() * h, 2, C.ledRed, 'square');
      }

      // Active case glow
      if (isWorking) {
        ctx.shadowColor = C.ledGreen; ctx.shadowBlur = 16;
        ctx.strokeStyle = 'rgba(80,224,96,0.15)'; ctx.lineWidth = 1;
        ctx.strokeRect(bx, by, w, h);
        ctx.shadowBlur = 0;
      }
      if (isErr) {
        const errPulse = 0.05 + Math.sin(t * 4) * 0.05;
        ctx.shadowColor = C.ledRed; ctx.shadowBlur = 12;
        ctx.strokeStyle = `rgba(240,64,80,${errPulse})`; ctx.lineWidth = 1;
        ctx.strokeRect(bx, by, w, h);
        ctx.shadowBlur = 0;
      }

      // Corner bolts (decorative)
      const boltPositions = [[bx + 3, by + 3], [bx + w - 5, by + 3], [bx + 3, by + h - 5], [bx + w - 5, by + h - 5]];
      ctx.fillStyle = '#4a5a6a';
      for (const [bpx, bpy] of boltPositions) {
        ctx.fillRect(bpx, bpy, 2, 2);
      }
    }

    function drawWorkstation(x: number, y: number, t: number) {
      // Chair
      ctx.fillStyle = '#2a1a3a'; ctx.fillRect(x - 2, y + 25, 28, 24);
      ctx.fillStyle = '#3a2a4a'; ctx.fillRect(x, y + 27, 24, 20);
      ctx.fillStyle = '#2a1a3a'; ctx.fillRect(x + 2, y + 14, 20, 14);
      ctx.fillStyle = '#3a2a4a'; ctx.fillRect(x + 4, y + 16, 16, 10);
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(x + 4, y + 49, 3, 6);
      ctx.fillRect(x + 17, y + 49, 3, 6);
      ctx.fillStyle = '#333'; ctx.fillRect(x + 2, y + 54, 5, 2); ctx.fillRect(x + 17, y + 54, 5, 2);

      // Desk
      const deskX = x + 30, deskY = y + 20;
      ctx.fillStyle = '#3a2818'; ctx.fillRect(deskX, deskY, 80, 6);
      ctx.fillStyle = '#4a3828'; ctx.fillRect(deskX, deskY, 80, 3);
      ctx.fillStyle = '#3a2818';
      ctx.fillRect(deskX + 4, deskY + 6, 4, 30);
      ctx.fillRect(deskX + 72, deskY + 6, 4, 30);
      ctx.fillStyle = '#3a2818'; ctx.fillRect(deskX + 4, deskY + 18, 72, 3);

      // Monitor
      drawMonitor(deskX + 18, deskY - 30, 44, 28, true, t);
      ctx.fillStyle = C.metalDk; ctx.fillRect(deskX + 36, deskY - 4, 8, 6);
      ctx.fillRect(deskX + 30, deskY - 0, 20, 3);

      // Keyboard
      ctx.fillStyle = '#2a2a3a'; ctx.fillRect(deskX + 20, deskY + 2, 32, 6);
      ctx.fillStyle = '#3a3a4a'; ctx.fillRect(deskX + 21, deskY + 3, 30, 4);
      for (let kr = 0; kr < 2; kr++) {
        for (let kc = 0; kc < 8; kc++) {
          ctx.fillStyle = `rgba(100,110,130,${0.5 + Math.random() * 0.2})`;
          ctx.fillRect(deskX + 22 + kc * 3.5, deskY + 3.5 + kr * 2, 2.5, 1.5);
        }
      }
      if (Math.sin(t * 4) > 0) {
        ctx.fillStyle = C.ledGreen; ctx.fillRect(deskX + 54, deskY + 4, 2, 2);
      }

      // Coffee mug
      ctx.fillStyle = '#e8e0d0'; ctx.fillRect(deskX + 62, deskY - 4, 8, 8);
      ctx.fillStyle = '#d0c8b8'; ctx.fillRect(deskX + 63, deskY - 3, 6, 6);
      ctx.fillStyle = '#8a6a4a'; ctx.fillRect(deskX + 63, deskY - 2, 6, 4);
      if (Math.sin(t * 2) > -0.5) {
        ctx.strokeStyle = 'rgba(200,200,220,0.15)'; ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(deskX + 65, deskY - 6 - Math.sin(t * 3) * 2);
        ctx.quadraticCurveTo(deskX + 67, deskY - 12 - Math.sin(t * 2) * 3, deskX + 69, deskY - 8 - Math.sin(t * 4) * 2);
        ctx.stroke();
      }

      // Paper stack
      for (let p = 0; p < 3; p++) {
        ctx.fillStyle = p === 0 ? '#e0dcd0' : p === 1 ? '#d8d4c8' : '#d0ccc0';
        ctx.fillRect(deskX + 4, deskY - 6 - p * 2, 12, 4);
      }

      // Desk lamp
      const lampX = deskX + 66, lampY = deskY - 14;
      ctx.strokeStyle = C.metalMd; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(lampX, deskY); ctx.lineTo(lampX, lampY); ctx.lineTo(lampX + 10, lampY + 6); ctx.stroke();
      ctx.fillStyle = C.warnAmb; ctx.globalAlpha = 0.3;
      ctx.beginPath(); ctx.moveTo(lampX + 4, lampY + 2); ctx.lineTo(lampX + 16, lampY + 14); ctx.lineTo(lampX, lampY + 14); ctx.fill();
      ctx.globalAlpha = 1;

      // Submit label
      ctx.fillStyle = C.warnAmb; ctx.font = '5px "Press Start 2P", monospace';
      ctx.fillText('SUBMIT', deskX + 18, deskY + 44);
      ctx.fillText('TERMINAL', deskX + 10, deskY + 52);
    }

    // ── Main render loop ──
    const render = (timestamp: number) => {
      if (S.lastTime === 0) S.lastTime = timestamp;
      const dt = Math.min((timestamp - S.lastTime) / 1000, 0.05);
      S.lastTime = timestamp;
      S.time += dt;
      const t = S.time;
      const W = cvs.width / dpr, H = cvs.height / dpr;

      const p = propsRef.current;
      const curNodes = p.nodes;
      const curPending = p.pendingTasks + p.queuedTasks;
      const curRunning = p.runningTasks;
      const curCompleted = p.completedTasks ?? 0;
      const curFailed = p.failedTasks ?? 0;
      const curDispatching = p.dispatchingTasks ?? 0;
      const curHasActivity = (curPending + curRunning) > 0;

      ctx.fillStyle = C.deepBg; ctx.fillRect(0, 0, W, H);

      // ── Parallax starfield ──
      for (let layer = 0; layer < 3; layer++) {
        const speed = 0.002 * (layer + 1);
        for (const star of S.starLayers[layer]) {
          const sx = ((star.x + t * speed) % 1) * W;
          const sy = star.y * H;
          const alpha = 0.15 + 0.25 * Math.sin(t * 1.5 + star.twinkle);
          ctx.fillStyle = `rgba(255,255,255,${alpha})`;
          ctx.fillRect(sx, sy, star.size, star.size);
        }
      }

      // ── Dust motes ──
      for (const mote of S.dustMotes) {
        mote.x += mote.vx; mote.y += mote.vy;
        if (mote.y < 0) { mote.y = 1; mote.x = Math.random(); }
        if (mote.x < 0 || mote.x > 1) mote.x = Math.random();
        ctx.fillStyle = `rgba(180,200,220,${mote.alpha + Math.sin(t + mote.x * 10) * 0.05})`;
        ctx.beginPath(); ctx.arc(mote.x * W, mote.y * H * 0.7, mote.size, 0, Math.PI * 2); ctx.fill();
      }

      // ── Ground ──
      const groundY = 390;
      ctx.fillStyle = '#111822'; ctx.fillRect(0, groundY, W, H - groundY);
      const hexSize = 12;
      for (let row = 0; row < 12; row++) {
        for (let col = 0; col < Math.ceil(W / (hexSize * 1.5)) + 1; col++) {
          const hx = col * hexSize * 1.5 + (row % 2) * hexSize * 0.75;
          const hy = groundY + row * hexSize * 0.87;
          ctx.strokeStyle = `rgba(30,42,58,${0.3 + row * 0.03})`;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const a = Math.PI / 3 * i - Math.PI / 6;
            const px = hx + hexSize * 0.5 * Math.cos(a);
            const py = hy + hexSize * 0.5 * Math.sin(a);
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
          }
          ctx.closePath(); ctx.stroke();
        }
      }
      ctx.strokeStyle = '#2a3548'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(W, groundY); ctx.stroke();
      const reflGrad = ctx.createLinearGradient(0, groundY, 0, groundY + 30);
      reflGrad.addColorStop(0, 'rgba(30,42,58,0.4)');
      reflGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = reflGrad; ctx.fillRect(0, groundY, W, 30);

      // ── Layout positions ──
      const submitX = 10, submitY = 240;
      const hubX = W * 0.30, hubY = 120;
      const bayStartX = W * 0.55, bayStartY = 30;

      // ── 1. Submit Workstation ──
      drawWorkstation(submitX, submitY, t);

      // ── 2. Walker character ──
      const wk = S.walker;
      if (wk.x === 0 && wk.phase === 'idle') {
        wk.x = submitX + 12; wk.y = submitY + 22;
        wk.tx = wk.x; wk.ty = wk.y;
      }

      S.spawnTimer += dt;
      const isDispatching = curDispatching > 0;
      const spawnCooldown = isDispatching ? 1 : 3;
      if ((curHasActivity || isDispatching) && S.spawnTimer > spawnCooldown && wk.phase === 'idle' && curNodes.length > 0) {
        S.spawnTimer = 0;
        wk.phase = 'toHub'; wk.tx = hubX - 20; wk.ty = hubY + 60; wk.hasPackage = true;
      }

      const moveSpeed = 1.5;
      if (wk.phase === 'toHub') {
        const dx = wk.tx - wk.x, dy = wk.ty - wk.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 3) {
          wk.x = wk.tx; wk.y = wk.ty;
          wk.phase = 'deliver';
          emitParticles(wk.x, wk.y, 12, C.gold, 'circle');
        } else {
          const speed = Math.min(moveSpeed, dist * 0.06);
          wk.x += (dx / dist) * speed; wk.y += (dy / dist) * speed;
        }
      } else if (wk.phase === 'deliver') {
        wk.hasPackage = false;
        if (curNodes.length > 0 && S.dataOrbs.length < 5) {
          const target = Math.floor(Math.random() * curNodes.length);
          const col = target % 2, row = Math.floor(target / 2);
          const orbColor = curDispatching > 0 ? C.ledCyan : C.gold;
          S.dataOrbs.push({
            x: hubX + 45, y: hubY + 50,
            tx: bayStartX + col * BAY_COL_GAP + BAY_W / 2, ty: bayStartY + row * BAY_ROW_GAP + BAY_H / 2,
            progress: 0, color: orbColor, size: 4, trail: [],
          });
        }
        wk.phase = 'returning'; wk.tx = submitX + 12; wk.ty = submitY + 22;
      } else if (wk.phase === 'returning') {
        const dx = wk.tx - wk.x, dy = wk.ty - wk.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 3) { wk.x = wk.tx; wk.y = wk.ty; wk.phase = 'idle'; }
        else { const speed = Math.min(moveSpeed, dist * 0.06); wk.x += (dx / dist) * speed; wk.y += (dy / dist) * speed; }
      }

      // Draw character
      const spriteFrame = wk.phase === 'toHub' || wk.phase === 'returning'
        ? WALK_ANIM[Math.floor(t * 6) % WALK_ANIM.length]
        : wk.phase === 'deliver' ? WORK_A
        : IDLE_FRAMES[Math.floor(t * 2) % IDLE_FRAMES.length];
      drawSprite(ctx, spriteFrame, CP, wk.x - 20, wk.y - 38, 2);

      // Package above character
      if (wk.hasPackage) {
        const pkgY = wk.y - 18 + Math.sin(t * 5) * 1.5;
        ctx.fillStyle = C.gold; ctx.fillRect(wk.x + 10, pkgY, 14, 10);
        ctx.strokeStyle = C.goldDk; ctx.lineWidth = 1.5; ctx.strokeRect(wk.x + 10, pkgY, 14, 10);
        ctx.strokeStyle = C.ledRed; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(wk.x + 17, pkgY); ctx.lineTo(wk.x + 17, pkgY + 10); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(wk.x + 10, pkgY + 5); ctx.lineTo(wk.x + 24, pkgY + 5); ctx.stroke();
        ctx.shadowColor = C.gold; ctx.shadowBlur = 6;
        ctx.fillStyle = 'rgba(240,192,64,0.1)'; ctx.fillRect(wk.x + 8, pkgY - 2, 18, 14);
        ctx.shadowBlur = 0;
      }

      // Character shadow
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.beginPath(); ctx.ellipse(wk.x, wk.y + 2, 10, 3, 0, 0, Math.PI * 2); ctx.fill();

      // ── Flow line: Submit → HUB ──
      const flowActive = curHasActivity || wk.phase !== 'idle';
      drawGlowLine(submitX + 110, submitY + 26, hubX - 60, hubY + 54, flowActive ? C.warnAmb : '#2a3548', C.goldGlow, flowActive ? 1 : 0.2);

      // ── 3. Scheduler HUB ──
      drawServerRack(hubX - 50, hubY, 100, 110, curHasActivity, t, curPending + curRunning);

      // HUB label
      ctx.fillStyle = C.warnAmb; ctx.font = '5px "Press Start 2P", monospace';
      ctx.fillText('SCHEDULER', hubX - 38, hubY + 120);
      ctx.fillText('HUB', hubX - 10, hubY + 128);

      // Queue visualization
      const queueCount = Math.min(curPending, 8);
      if (queueCount > 0) {
        const qx = hubX - 72, qy = hubY + 90;
        for (let i = 0; i < queueCount; i++) {
          const col = i % 4, row = Math.floor(i / 4);
          const cx = qx + col * 12, cy = qy - row * 10;
          const pulse = 0.6 + Math.sin(t * 3 + i * 0.8) * 0.3;
          ctx.fillStyle = C.gold; ctx.globalAlpha = pulse;
          ctx.fillRect(cx, cy, 10, 8);
          ctx.strokeStyle = C.goldDk; ctx.lineWidth = 1; ctx.strokeRect(cx, cy, 10, 8);
          ctx.globalAlpha = 1;
        }
        ctx.fillStyle = C.warnAmb; ctx.font = '5px "Press Start 2P", monospace';
        ctx.fillText(`Q:${curPending}`, qx, qy + 14);
      }

      // ── 4. GPU Bay Array ──
      const maxBays = Math.max(curNodes.length, 1);
      for (let i = 0; i < maxBays; i++) {
        const node = curNodes[i] || null;
        const col = i % 2, row = Math.floor(i / 2);
        const bx = bayStartX + col * BAY_COL_GAP, by = bayStartY + row * BAY_ROW_GAP;

        // Energy conduit: HUB → Bay
        const pipeStartX = hubX + 50, pipeStartY = hubY + 30 + i * 18;
        const pipeEndX = bx + 4, pipeEndY = by + BAY_H / 2;
        const cpx = (pipeStartX + pipeEndX) / 2;
        const cpy = Math.max(pipeStartY, pipeEndY) + 30;
        const isWorking = node && (node.resources?.activeTasks || 0) > 0;
        const pipeColor = isWorking ? C.ledGreen : node && !node.status.includes('OFF') ? C.ledCyan : '#2a3548';
        const pipeGlow = isWorking ? C.greenGlow : C.cyanGlow;
        drawGlowBezier(pipeStartX, pipeStartY, cpx, cpy, pipeEndX, pipeEndY, pipeColor, pipeGlow, isWorking ? 1 : 0.3, isWorking || curHasActivity, t);

        drawGpuBay(bx, by, node, i, t);
      }

      // ── Reverse orbs (completed tasks → HUB) ──
      if (curCompleted > 0 && curNodes.length > 0 && Math.random() < dt * 0.3) {
        const src = Math.floor(Math.random() * Math.min(curNodes.length, 4));
        const col = src % 2, row = Math.floor(src / 2);
        if (S.dataOrbs.length < 6) {
          S.dataOrbs.push({
            x: bayStartX + col * BAY_COL_GAP + BAY_W / 2,
            y: bayStartY + row * BAY_ROW_GAP + BAY_H / 2,
            tx: hubX, ty: hubY + 50,
            progress: 0, color: C.ledGreen, size: 3, trail: [],
          });
        }
      }

      // ── Data orbs ──
      S.dataOrbs = S.dataOrbs.filter(orb => {
        orb.progress += dt * 0.4;
        const p = easeInOutCubic(Math.min(orb.progress, 1));
        orb.x = orb.x + (orb.tx - orb.x) * p * 0.05;
        orb.y = orb.y + (orb.ty - orb.y) * p * 0.05;

        orb.trail.push({ x: orb.x, y: orb.y });
        if (orb.trail.length > 12) orb.trail.shift();

        const glowBase = orb.color === C.ledGreen ? C.greenGlow : orb.color === C.ledCyan ? C.cyanGlow : C.goldGlow;
        for (let i = 0; i < orb.trail.length; i++) {
          const alpha = (i / orb.trail.length) * 0.5;
          const size = orb.size * (i / orb.trail.length);
          ctx.fillStyle = `${glowBase}${alpha})`;
          ctx.beginPath(); ctx.arc(orb.trail[i].x, orb.trail[i].y, size, 0, Math.PI * 2); ctx.fill();
        }

        ctx.fillStyle = orb.color;
        ctx.shadowColor = orb.color; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(orb.x, orb.y, orb.size, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.6;
        ctx.beginPath(); ctx.arc(orb.x, orb.y, orb.size * 0.4, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;

        if (Math.abs(orb.x - orb.tx) < 6 && Math.abs(orb.y - orb.ty) < 6) {
          emitParticles(orb.tx, orb.ty, 15, orb.color, 'circle');
          return false;
        }
        return orb.progress < 5;
      });

      // ── Particles ──
      S.particles = S.particles.filter(p => {
        p.x += p.vx * dt * 60; p.y += p.vy * dt * 60;
        p.vy += 2 * dt * 60;
        p.life -= dt * 2;
        if (p.life <= 0) return false;
        const alpha = p.life / p.maxLife;
        ctx.fillStyle = p.color; ctx.globalAlpha = alpha;
        if (p.shape === 'circle') {
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2); ctx.fill();
        } else {
          ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        }
        ctx.globalAlpha = 1;
        return true;
      });

      // ── Completion / failure bursts ──
      if (curCompleted > 0 && Math.random() < dt * 0.5 && curNodes.length > 0) {
        const ni = Math.floor(Math.random() * curNodes.length);
        const col = ni % 2, row = Math.floor(ni / 2);
        const bx = bayStartX + col * BAY_COL_GAP + BAY_W / 2, by = bayStartY + row * BAY_ROW_GAP;
        emitParticles(bx, by, 8, C.ledGreen, 'circle');
      }
      if (curFailed > 0 && Math.random() < dt * 0.3 && curNodes.length > 0) {
        const ni = Math.floor(Math.random() * curNodes.length);
        const col = ni % 2, row = Math.floor(ni / 2);
        const bx = bayStartX + col * BAY_COL_GAP + BAY_W / 2, by = bayStartY + row * BAY_ROW_GAP;
        emitParticles(bx, by, 4, C.ledRed, 'square');
      }

      // ── Floor cable conduits ──
      ctx.strokeStyle = '#1c2838'; ctx.lineWidth = 3;
      for (let x = 20; x < W; x += 80) {
        ctx.beginPath(); ctx.moveTo(x, groundY + 25); ctx.lineTo(x + 50, groundY + 25); ctx.stroke();
        ctx.fillStyle = '#2a3548'; ctx.fillRect(x - 2, groundY + 23, 4, 6);
        ctx.fillRect(x + 50, groundY + 23, 4, 6);
      }

      // ── No nodes overlay ──
      if (curNodes.length === 0) {
        ctx.fillStyle = 'rgba(13,17,23,0.85)';
        ctx.fillRect(bayStartX - 10, 100, 200, 60);
        ctx.strokeStyle = C.borderLit; ctx.lineWidth = 2;
        ctx.strokeRect(bayStartX - 10, 100, 200, 60);
        ctx.fillStyle = '#6080a0'; ctx.font = '8px "Press Start 2P", monospace';
        ctx.fillText('NO GPU NODES', bayStartX + 16, 130);
        ctx.fillStyle = '#4a6080'; ctx.font = '6px "Press Start 2P", monospace';
        ctx.fillText('ADD NODE TO START', bayStartX + 16, 148);
      }

      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);
    return () => { cancelAnimationFrame(animRef.current); window.removeEventListener('resize', resize); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const W = rect.width;
    const bayStartX = W * 0.55, bayStartY = 30;
    for (let i = 0; i < nodes.length; i++) {
      const col = i % 2, row = Math.floor(i / 2);
      const bx = bayStartX + col * BAY_COL_GAP, by = bayStartY + row * BAY_ROW_GAP;
      if (x > bx && x < bx + BAY_W && y > by && y < by + BAY_H) { onNodeClick?.(nodes[i]); return; }
    }
  };

  return (
    <div className="panel" style={{ overflow: 'hidden', cursor: 'crosshair' }}>
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%' }} onClick={handleClick} />
      <div style={{
        display: 'flex', gap: 10, justifyContent: 'center', padding: '5px 8px',
        borderTop: '2px solid var(--border)', background: 'var(--bg-deep)',
        font: '6px var(--font-pixel)', color: 'var(--muted)', flexWrap: 'wrap', alignItems: 'center',
      }}>
        <span style={{ color: 'var(--cyan)' }}>◈ ONLINE</span>
        <span style={{ color: 'var(--gold)' }}>◆ WORKING</span>
        <span style={{ color: 'var(--muted)' }}>◇ OFFLINE</span>
        {(pendingTasks + queuedTasks + runningTasks) > 0 && <span style={{ color: 'var(--gold)', animation: 'pulse 1.5s infinite' }}>★ PIPELINE ACTIVE</span>}
        <span style={{ flex: 1 }} />
        <button className="btn cyan sm" onClick={onAddNode}>+ ADD NODE</button>
        {nodes.length > 0 && <button className="btn red sm" onClick={() => onRemoveNode?.(nodes[nodes.length - 1])}>- REMOVE</button>}
      </div>
    </div>
  );
}
