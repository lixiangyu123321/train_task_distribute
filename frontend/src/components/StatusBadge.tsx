import type { TaskStatus, NodeStatus } from '../types';

const colorMap: Record<string, { bg: string; border: string; text: string; emoji: string }> = {
  PENDING:   { bg: '#fff8e1', border: '#ffd166', text: '#b8860b', emoji: '⏳' },
  QUEUED:    { bg: '#e3f2fd', border: '#7ec8e3', text: '#1a6396', emoji: '📋' },
  RUNNING:   { bg: '#e8f5e9', border: '#8cd790', text: '#2e7d32', emoji: '⚡' },
  COMPLETED: { bg: '#e8f5e9', border: '#8cd790', text: '#2e7d32', emoji: '✅' },
  FAILED:    { bg: '#ffebee', border: '#ff8a80', text: '#c62828', emoji: '💥' },
  CANCELLED: { bg: '#f5f5f5', border: '#ccc', text: '#888', emoji: '🚫' },
  ONLINE:    { bg: '#e8f5e9', border: '#8cd790', text: '#2e7d32', emoji: '🟢' },
  OFFLINE:   { bg: '#f5f5f5', border: '#ccc', text: '#888', emoji: '⚫' },
  BUSY:      { bg: '#fff3e0', border: '#ffd166', text: '#e65100', emoji: '🟡' },
  ERROR:     { bg: '#ffebee', border: '#ff8a80', text: '#c62828', emoji: '🔴' },
};

type Props = { status: TaskStatus | NodeStatus };

export default function StatusBadge({ status }: Props) {
  const c = colorMap[status] || colorMap.PENDING;

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 8px', borderRadius: 4,
      fontFamily: "'Press Start 2P', monospace",
      fontSize: 7, fontWeight: 400,
      color: c.text, background: c.bg,
      border: `2px solid ${c.border}`,
    }}>
      {c.emoji} {status}
    </span>
  );
}
