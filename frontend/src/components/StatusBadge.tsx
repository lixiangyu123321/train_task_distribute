import type { TaskStatus, NodeStatus } from '../types';

const colorMap: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  PENDING:   { bg: '#2a1a00', border: '#ffe600', text: '#ffe600', glow: '#ffe600' },
  QUEUED:    { bg: '#001a2a', border: '#00f0ff', text: '#00f0ff', glow: '#00f0ff' },
  RUNNING:   { bg: '#002a0a', border: '#39ff14', text: '#39ff14', glow: '#39ff14' },
  COMPLETED: { bg: '#0a1a0a', border: '#39ff14', text: '#39ff14', glow: '#39ff14' },
  FAILED:    { bg: '#2a000a', border: '#ff2d78', text: '#ff2d78', glow: '#ff2d78' },
  CANCELLED: { bg: '#1a1a1a', border: '#666', text: '#888', glow: '#666' },
  ONLINE:    { bg: '#002a0a', border: '#39ff14', text: '#39ff14', glow: '#39ff14' },
  OFFLINE:   { bg: '#1a1a1a', border: '#666', text: '#888', glow: '#666' },
  BUSY:      { bg: '#2a1a00', border: '#ffe600', text: '#ffe600', glow: '#ffe600' },
  ERROR:     { bg: '#2a000a', border: '#ff2d78', text: '#ff2d78', glow: '#ff2d78' },
};

type Props = { status: TaskStatus | NodeStatus };

export default function StatusBadge({ status }: Props) {
  const c = colorMap[status] || colorMap.PENDING;

  return (
    <span style={{
      display: 'inline-block',
      padding: '4px 10px',
      fontFamily: "'Press Start 2P', monospace",
      fontSize: 8,
      color: c.text,
      background: c.bg,
      border: `2px solid ${c.border}`,
      boxShadow: `3px 3px 0 rgba(0,0,0,0.5), 0 0 10px ${c.glow}33`,
      imageRendering: 'pixelated',
      textShadow: `0 0 4px ${c.glow}`,
      animation: 'neonFlicker 3s infinite',
    }}>
      [{status}]
    </span>
  );
}
