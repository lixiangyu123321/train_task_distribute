import type { TaskStatus, NodeStatus } from '../types';

const cmap: Record<string, { bg: string; border: string; text: string; emoji: string }> = {
  PENDING:   { bg: '#fff8e1', border: '#ffd166', text: '#b8860b', emoji: '⏳' },
  QUEUED:    { bg: '#e3f2fd', border: '#7ec8e3', text: '#1a6396', emoji: '📋' },
  RUNNING:   { bg: '#e8f5e9', border: '#8cd790', text: '#2e7d32', emoji: '⚡' },
  COMPLETED: { bg: '#f5f0ff', border: '#b8a0e8', text: '#5a3a8a', emoji: '✅' },
  FAILED:    { bg: '#ffebee', border: '#ff8a80', text: '#c62828', emoji: '💥' },
  CANCELLED: { bg: '#f5f5f5', border: '#ccc', text: '#888', emoji: '🚫' },
  ONLINE:    { bg: '#e8f5e9', border: '#8cd790', text: '#2e7d32', emoji: '🟢' },
  OFFLINE:   { bg: '#f5f5f5', border: '#ccc', text: '#888', emoji: '⚫' },
  BUSY:      { bg: '#fff3e0', border: '#ffa726', text: '#e65100', emoji: '🟡' },
  ERROR:     { bg: '#ffebee', border: '#ef5350', text: '#c62828', emoji: '🔴' },
};

export default function StatusBadge({ status }: { status: TaskStatus | NodeStatus }) {
  const c = cmap[status] || cmap.PENDING;
  return (
    <span className="status-badge" style={{ color: c.text, background: c.bg, borderColor: c.border }}>
      {c.emoji} {status}
    </span>
  );
}
