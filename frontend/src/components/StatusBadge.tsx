import type { TaskStatus, NodeStatus } from '../types';

const taskColorMap: Record<TaskStatus, string> = {
  PENDING: '#faad14', QUEUED: '#1677ff', RUNNING: '#52c41a',
  COMPLETED: '#52c41a', FAILED: '#ff4d4f', CANCELLED: '#999',
};

const nodeColorMap: Record<NodeStatus, string> = {
  ONLINE: '#52c41a', OFFLINE: '#999', BUSY: '#faad14', ERROR: '#ff4d4f',
};

type Props = { status: TaskStatus | NodeStatus; type?: 'task' | 'node' };

export default function StatusBadge({ status, type = 'task' }: Props) {
  const color = type === 'task'
    ? taskColorMap[status as TaskStatus]
    : nodeColorMap[status as NodeStatus];

  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: 4,
      backgroundColor: `${color}20`, color, fontSize: 12, fontWeight: 600,
      border: `1px solid ${color}`,
    }}>
      {status}
    </span>
  );
}
