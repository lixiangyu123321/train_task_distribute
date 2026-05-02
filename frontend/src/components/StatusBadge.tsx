import type { TaskStatus, NodeStatus } from '../types';
const m: Record<string, string> = {
  PENDING: 'dim', DISPATCHING: 'purple', QUEUED: 'cyan', RUNNING: 'gold', COMPLETED: 'green', FAILED: 'red', CANCELLED: 'dim',
  ONLINE: 'green', OFFLINE: 'dim', BUSY: 'gold', ERROR: 'red',
};
export default function StatusBadge({ status }: { status: TaskStatus | NodeStatus }) {
  const c = m[status] || 'dim';
  return <span className={`badge ${c}`}>{status}</span>;
}
