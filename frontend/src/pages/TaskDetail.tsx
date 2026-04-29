import { useParams } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { fetchTask } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import TaskTimeline from '../components/TaskTimeline';

export default function TaskDetail() {
  const { taskId } = useParams<{ taskId: string }>();
  const { data: task, loading } = useApi(() => fetchTask(taskId!), 2000);

  if (loading && !task) return <div>加载中...</div>;
  if (!task) return <div>任务不存在</div>;

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>
        任务详情: {task.name}
        <span style={{ marginLeft: 12 }}><StatusBadge status={task.status} /></span>
      </h2>

      <TaskTimeline status={task.status} />

      <div style={{
        background: '#fff', borderRadius: 8, padding: 24,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginTop: 24,
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {[
              ['任务 ID', task.taskId],
              ['类型', task.type],
              ['模型', task.modelName || '-'],
              ['数据集', '-'],
              ['分发节点', task.nodeId || '-'],
              ['创建时间', task.createdAt],
              ['开始时间', task.startedAt || '-'],
              ['完成时间', task.finishedAt || '-'],
              ['错误信息', task.errorMsg || '-'],
            ].map(([label, value]) => (
              <tr key={label} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '10px 12px', color: '#888', width: 120 }}>{label}</td>
                <td style={{ padding: '10px 12px' }}>{value}</td>
              </tr>
            ))}
            {task.progress && (
              <tr>
                <td style={{ padding: '10px 12px', color: '#888' }}>进度</td>
                <td style={{ padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: 1, background: '#f0f0f0', borderRadius: 4, height: 8 }}>
                      <div style={{
                        width: `${task.progress.percent}%`, height: 8, borderRadius: 4,
                        background: '#52c41a',
                      }} />
                    </div>
                    <span>{task.progress.percent}%</span>
                    <span style={{ color: '#888' }}>
                      {task.progress.currentStep}/{task.progress.totalSteps} steps
                    </span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
