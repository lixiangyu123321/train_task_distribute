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

  if (loading && !task) return <div style={{ color: '#00f0ff' }}>LOADING...</div>;
  if (!task) return <div style={{ color: '#ff2d78' }}>TASK NOT FOUND</div>;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ marginBottom: 6 }}>
          [{task.type}] {task.name}
          <span style={{ marginLeft: 14 }}><StatusBadge status={task.status} /></span>
        </h2>
        <div className="pixel-divider" />
      </div>

      <TaskTimeline status={task.status} />

      {/* 排队位置 */}
      {queueStatus && (queueStatus.queuePosition as number) > 0 && (
        <div style={{
          background: 'rgba(255,230,0,0.06)', border: '2px solid #ffe600',
          padding: '12px 18px', marginTop: 16,
          fontFamily: "'Press Start 2P', monospace", fontSize: 9, color: '#ffe600',
        }}>
          QUEUE POSITION: #{(queueStatus.queuePosition as number)} |
          RUNNING: {queueStatus.runningCount as number}
        </div>
      )}

      {/* 实时日志按钮 */}
      {(task.status === 'RUNNING' || task.status === 'QUEUED') && (
        <div style={{ marginTop: 16 }}>
          <button
            onClick={() => setShowLogs(!showLogs)}
            className="pixel-btn"
            style={{
              background: showLogs ? '#ff2d78' : '#1a1a2e',
              boxShadow: showLogs ? '4px 4px 0 #8a1a3a' : '4px 4px 0 #000',
              fontSize: 9,
            }}>
            {showLogs ? '[ HIDE LOGS ]' : '[ VIEW LIVE LOGS ]'}
          </button>
          {showLogs && (
            <div style={{ marginTop: 12 }}>
              <LogStream taskId={task.taskId} autoRefresh={true} />
            </div>
          )}
        </div>
      )}

      {/* 元数据 */}
      <div className="pixel-card" style={{ padding: 20, marginTop: 20 }}>
        <table style={{ width: '100%' }}>
          <tbody>
            {[
              ['TASK ID', task.taskId],
              ['TYPE', task.type],
              ['MODEL', task.modelName || '-'],
              ['PACKAGE', task.packageId?.substring(0, 16) + '...' || '-'],
              ['NODE', task.nodeId?.substring(0, 16) + '...' || '-'],
              ['CREATED', task.createdAt],
              ['STARTED', task.startedAt || '-'],
              ['FINISHED', task.finishedAt || '-'],
              ['ERROR', task.errorMsg || '-'],
            ].map(([label, value]) => (
              <tr key={label} style={{ borderBottom: '1px solid #1a1a30' }}>
                <td style={{
                  padding: '10px 12px', color: '#6666aa', width: 100,
                  fontFamily: "'Press Start 2P', monospace", fontSize: 7,
                }}>{label}</td>
                <td style={{
                  padding: '10px 12px', color: label === 'ERROR' && value !== '-' ? '#ff2d78' : '#e0e0f0',
                  fontFamily: 'monospace', fontSize: 11,
                  wordBreak: 'break-all',
                }}>{value}</td>
              </tr>
            ))}
            {task.progress && (
              <tr>
                <td style={{
                  padding: '10px 12px', color: '#6666aa',
                  fontFamily: "'Press Start 2P', monospace", fontSize: 7,
                }}>PROGRESS</td>
                <td style={{ padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="pixel-progress" style={{ flex: 1 }}>
                      <div className="pixel-progress-inner" style={{ width: `${task.progress.percent}%` }} />
                    </div>
                    <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 9, color: '#39ff14' }}>
                      {task.progress.percent}%
                    </span>
                    <span style={{ color: '#666', fontSize: 10 }}>
                      {task.progress.currentStep}/{task.progress.totalSteps}
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
        <div className="pixel-card" style={{ padding: 20, marginTop: 20 }}>
          <h4 style={{ marginBottom: 12 }}>▸ METRICS</h4>
          <MetricsChart metrics={[task.metrics]} />
          <div style={{
            marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: '12px 24px',
            fontFamily: 'monospace', fontSize: 10,
          }}>
            {Object.entries(task.metrics as Record<string, unknown>).map(([k, v]) => (
              <div key={k}>
                <span style={{ color: '#6666aa' }}>{k}:</span>{' '}
                <span style={{ color: '#b44dff' }}>{String(v)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
