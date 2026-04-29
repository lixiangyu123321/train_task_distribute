import { useParams } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { fetchTask, fetchQueueStatus } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import TaskTimeline from '../components/TaskTimeline';
import LogStream from '../components/LogStream';
import MetricsChart from '../components/MetricsChart';
import { useState } from 'react';

export default function TaskDetail() {
  const { taskId } = useParams<{ taskId: string }>();
  const { data: task, loading } = useApi(() => fetchTask(taskId!), 2000);
  const { data: queueStatus } = useApi(() => fetchQueueStatus(taskId), 5000);
  const [showLogs, setShowLogs] = useState(false);

  if (loading && !task) return <div>加载中...</div>;
  if (!task) return <div>任务不存在</div>;

  const isRunning = task.status === 'RUNNING';

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>
        任务详情: {task.name}
        <span style={{ marginLeft: 12 }}><StatusBadge status={task.status} /></span>
      </h2>

      <TaskTimeline status={task.status} />

      {/* 排队位置 */}
      {queueStatus && queueStatus.queuePosition !== undefined && queueStatus.queuePosition > 0 && (
        <div style={{
          background: '#fff7e6', borderRadius: 8, padding: '12px 20px',
          marginTop: 16, border: '1px solid #ffd591', fontSize: 14,
        }}>
          当前排队位置: 第 <b>{queueStatus.queuePosition}</b> 位 |
          前方等待: {task.status === 'QUEUED' ? queueStatus.queuePosition - 1 : 0} 个 |
          运行中: {queueStatus.runningCount} 个
        </div>
      )}

      {/* 运行中：日志查看器 */}
      {isRunning && (
        <div style={{ marginTop: 16 }}>
          <button
            onClick={() => setShowLogs(!showLogs)}
            style={{
              padding: '8px 20px', background: showLogs ? '#e94560' : '#1a1a2e',
              color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13,
            }}>
            {showLogs ? '收起日志' : '查看实时日志'}
          </button>
          {showLogs && (
            <div style={{ marginTop: 12 }}>
              <LogStream taskId={task.taskId} autoRefresh={true} />
            </div>
          )}
        </div>
      )}

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
              ['包 ID', task.packageId ? task.packageId.substring(0, 16) + '...' : '-'],
              ['分发节点', task.nodeId ? task.nodeId.substring(0, 16) + '...' : '-'],
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

      {/* 指标图表 */}
      {task.metrics && (
        <div style={{
          background: '#fff', borderRadius: 8, padding: 24,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginTop: 24,
        }}>
          <MetricsChart metrics={[task.metrics]} />
          <div style={{ marginTop: 16, fontSize: 13, color: '#666' }}>
            {Object.entries(task.metrics as Record<string, unknown>).map(([k, v]) => (
              <span key={k} style={{ marginRight: 24 }}>
                <b>{k}</b>: {String(v)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
