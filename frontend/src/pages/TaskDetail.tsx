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

  if (loading && !task) return <div style={{ color: 'var(--dim)', textAlign: 'center', padding: 60, fontFamily: "'Press Start 2P', monospace", fontSize: 9 }}>LOADING...</div>;
  if (!task) return <div style={{ color: 'var(--red)', textAlign: 'center', padding: 60, fontFamily: "'Press Start 2P', monospace", fontSize: 9 }}>TASK NOT FOUND</div>;

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ marginBottom: 4 }}>
          [{task.type}] {task.name}
          <span style={{ marginLeft: 14 }}><StatusBadge status={task.status} /></span>
        </h2>
        <div className="divider" />
      </div>

      <TaskTimeline status={task.status} />

      {queueStatus && (queueStatus.queuePosition as number) > 0 && (
        <div style={{ background: 'rgba(240,192,64,0.1)', border: '2px solid var(--gold)', borderRadius: 6, padding: '10px 16px', marginTop: 14, fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: 'var(--gold)' }}>
          QUEUE POSITION: #{(queueStatus.queuePosition as number)} | RUNNING: {queueStatus.runningCount as number}
        </div>
      )}

      {(task.status === 'RUNNING' || task.status === 'QUEUED') && (
        <div style={{ marginTop: 14 }}>
          <button onClick={() => setShowLogs(!showLogs)}
            className={`btn ${showLogs ? 'red' : 'purple'}`}
            style={{ fontSize: 8 }}>
            {showLogs ? 'HIDE LOGS' : 'VIEW LIVE LOGS'}
          </button>
          {showLogs && <div style={{ marginTop: 10 }}><LogStream taskId={task.taskId} autoRefresh={true} /></div>}
        </div>
      )}

      <div className="panel" style={{ padding: 20, marginTop: 16 }}>
        <table style={{ width: '100%' }}>
          <tbody>
            {[
              ['TASK ID', task.taskId], ['TYPE', task.type], ['MODEL', task.modelName || '-'],
              ['PACKAGE', task.packageId?.substring(0, 16) + '...' || '-'],
              ['NODE', task.nodeId?.substring(0, 16) + '...' || '-'],
              ['CREATED', task.createdAt], ['STARTED', task.startedAt || '-'],
              ['FINISHED', task.finishedAt || '-'], ['ERROR', task.errorMsg || '-'],
            ].map(([label, value]) => (
              <tr key={label} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '9px 12px', color: 'var(--dim)', width: 90, fontFamily: "'Press Start 2P', monospace", fontSize: 7 }}>{label}</td>
                <td style={{ padding: '9px 12px', color: label === 'ERROR' && value !== '-' ? 'var(--red)' : 'var(--white)', fontFamily: 'monospace', fontSize: 11, wordBreak: 'break-all' }}>{value}</td>
              </tr>
            ))}
            {task.progress && (
              <tr>
                <td style={{ padding: '9px 12px', color: 'var(--dim)', fontFamily: "'Press Start 2P', monospace", fontSize: 7 }}>PROGRESS</td>
                <td style={{ padding: '9px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="bar" style={{ flex: 1 }}>
                      <div className="bar-fill green" style={{ width: `${task.progress.percent}%` }} />
                    </div>
                    <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: 'var(--green)' }}>{task.progress.percent}%</span>
                    <span style={{ color: 'var(--dim)', fontSize: 10 }}>{task.progress.currentStep}/{task.progress.totalSteps}</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {task.metrics && (
        <div className="panel" style={{ padding: 20, marginTop: 16 }}>
          <h4 style={{ marginBottom: 10 }}>▸ METRICS CHART</h4>
          <MetricsChart metrics={[task.metrics]} />
          <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: '8px 20px', fontFamily: 'monospace', fontSize: 10 }}>
            {Object.entries(task.metrics as Record<string, unknown>).map(([k, v]) => (
              <div key={k}><span style={{ color: 'var(--dim)' }}>{k}:</span> <span style={{ color: 'var(--purple)', fontWeight: 600 }}>{String(v)}</span></div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
