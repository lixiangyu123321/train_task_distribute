import { useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { useRealtimeData } from '../hooks/useRealtimeData';
import { fetchTask, fetchQueueStatus, fetchMetricsHistory, downloadArtifacts, downloadTaskLogs, cloneTask } from '../services/api';
import { subscribe } from '../services/ws';
import StatusBadge from '../components/StatusBadge';
import TaskTimeline from '../components/TaskTimeline';
import LogStream from '../components/LogStream';
import MetricsChart from '../components/MetricsChart';
import ArtifactBrowser from '../components/ArtifactBrowser';
import { triggerDownload, exportMetricsCSV, exportMetricsJSON, exportMetricsJSONL } from '../services/export';
import { showToast } from '../services/toast';
import GanttTimeline from '../components/GanttTimeline';
import { SkeletonCard, SkeletonRow } from '../components/Skeleton';
import { useState, useEffect } from 'react';

function DispatchProgress({ startedAt, fileSize }: { startedAt: string | null; fileSize: number | null }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const SPEED = 350 * 1024; // ~350 KB/s estimated
  const start = startedAt ? new Date(startedAt).getTime() : now;
  const elapsed = Math.max(0, (now - start) / 1000);
  const totalEst = fileSize ? fileSize / SPEED : 420;
  const pct = Math.min(95, (elapsed / totalEst) * 100);
  const remaining = Math.max(0, totalEst - elapsed);
  const sizeMB = fileSize ? (fileSize / 1024 / 1024).toFixed(1) : '?';

  const fmtTime = (s: number) => {
    if (s < 60) return `${Math.round(s)}s`;
    return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
  };

  return (
    <div className="panel" style={{ borderColor: 'var(--purple)', padding: '12px 16px', marginTop: 14, background: 'rgba(180,100,255,0.08)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: 'var(--purple)' }}>
          TRANSFERRING TO GPU NODE
        </span>
        <span style={{ fontFamily: "'Courier New', monospace", fontSize: 11, color: 'var(--purple)' }}>
          {pct.toFixed(1)}%
        </span>
      </div>
      <div className="bar" style={{ height: 8 }}>
        <div className="bar-fill purple" style={{
          width: `${pct}%`,
          background: 'linear-gradient(90deg, #a855f7, #c084fc)',
          animation: 'pulse 1.5s ease-in-out infinite',
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontFamily: "'Courier New', monospace", fontSize: 10, color: 'var(--dim)' }}>
        <span>{sizeMB} MB | {fmtTime(elapsed)} elapsed</span>
        <span>~{fmtTime(remaining)} left</span>
      </div>
    </div>
  );
}

export default function TaskDetail() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { data: task, loading, refresh: refreshTask } = useApi(() => fetchTask(taskId!), 5000);
  const { data: queueStatus } = useApi(() => fetchQueueStatus(taskId), 10000);
  const { data: metricsData } = useApi(() => fetchMetricsHistory(taskId!), 15000);
  const [showLogs, setShowLogs] = useState(false);

  /* WS status change → immediate refresh (no need to wait for next poll) */
  useEffect(() => {
    if (!taskId) return;
    return subscribe('TASK_STATUS_CHANGE', (msg) => {
      const p = msg.payload as Record<string, unknown>;
      if (p?.taskId === taskId) refreshTask();
    });
  }, [taskId, refreshTask]);
  const [downloading, setDownloading] = useState(false);
  const [dlLog, setDlLog] = useState(false);

  if (loading && !task) return (
    <div>
      <SkeletonRow width="40%" />
      <div style={{ height: 12 }} />
      <SkeletonCard height={120} />
      <div style={{ height: 12 }} />
      <SkeletonCard height={200} />
    </div>
  );
  if (!task) return <div style={{ color: 'var(--red)', textAlign: 'center', padding: 60, fontFamily: "'Press Start 2P', monospace", fontSize: 9 }}>TASK NOT FOUND</div>;

  const history = metricsData?.history || [];
  const chartMetrics = history.length > 0 ? history : (task.metrics ? [task.metrics] : []);

  const handleDownloadZip = async () => {
    setDownloading(true);
    try {
      const blob = await downloadArtifacts(task.taskId);
      triggerDownload(blob, `${task.taskId}-artifacts.zip`);
    } catch { /* */ } finally {
      setDownloading(false);
    }
  };

  const handleDownloadLog = async () => {
    setDlLog(true);
    try {
      const blob = await downloadTaskLogs(task.taskId);
      triggerDownload(blob, `${task.taskId}-training.log`);
    } catch { /* */ } finally {
      setDlLog(false);
    }
  };

  const handleClone = async () => {
    try {
      await cloneTask(task.taskId);
      showToast('success', 'TASK CLONED');
      navigate('/tasks');
    } catch (e) { /* toast already handled by interceptor */ }
  };

  const showLogBtn = ['DISPATCHING', 'QUEUED', 'RUNNING', 'COMPLETED', 'FAILED'].includes(task.status);
  const hasArtifacts = !!task.nodeId && ['RUNNING', 'COMPLETED', 'FAILED'].includes(task.status);

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
      <GanttTimeline createdAt={task.createdAt} startedAt={task.startedAt} finishedAt={task.finishedAt} status={task.status} />

      {task.status === 'DISPATCHING' && <DispatchProgress startedAt={task.startedAt} fileSize={task.packageFileSize} />}

      {queueStatus && (queueStatus.queuePosition as number) > 0 && (
        <div style={{ background: 'rgba(240,192,64,0.1)', border: '2px solid var(--gold)', borderRadius: 6, padding: '10px 16px', marginTop: 14, fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: 'var(--gold)' }}>
          QUEUE POSITION: #{(queueStatus.queuePosition as number)} | RUNNING: {queueStatus.runningCount as number}
        </div>
      )}

      <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {showLogBtn && (
          <button onClick={() => setShowLogs(!showLogs)}
            className={`btn ${showLogs ? 'red' : 'purple'}`}
            style={{ fontSize: 8 }}>
            {showLogs ? 'HIDE LOGS' : 'VIEW LOGS'}
          </button>
        )}
        {showLogBtn && task.nodeId && (
          <button onClick={handleDownloadLog} className="btn cyan" disabled={dlLog} style={{ fontSize: 8 }}>
            {dlLog ? 'SAVING...' : 'DOWNLOAD LOG'}
          </button>
        )}
        {hasArtifacts && (
          <button onClick={handleDownloadZip} className="btn green" disabled={downloading} style={{ fontSize: 8 }}>
            {downloading ? 'DOWNLOADING...' : 'DOWNLOAD ALL (.ZIP)'}
          </button>
        )}
        <button className="btn cyan" style={{ fontSize: 7 }} onClick={handleClone}>CLONE</button>
      </div>
      {showLogs && <div style={{ marginTop: 10 }}><LogStream taskId={task.taskId} autoRefresh={task.status === 'RUNNING'} /></div>}

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

      {chartMetrics.length > 0 && (
        <div className="panel" style={{ padding: 20, marginTop: 16 }}>
          <h4 style={{ marginBottom: 10 }}>▸ TRAINING METRICS ({history.length > 0 ? history.length + ' points' : 'snapshot'})</h4>
          <MetricsChart metrics={chartMetrics as Record<string, unknown>[]} />
          {(() => {
            const latest = history.length > 0 ? history[history.length - 1] : task.metrics;
            if (!latest) return null;
            const m = latest as Record<string, unknown>;
            const fmtDur = (s: number) => {
              if (s < 60) return s.toFixed(0) + 's';
              if (s < 3600) return Math.floor(s / 60) + 'm ' + Math.round(s % 60) + 's';
              return Math.floor(s / 3600) + 'h ' + Math.round((s % 3600) / 60) + 'm';
            };
            const indicators = [
              { label: 'EPOCH', value: m.epoch != null ? Number(m.epoch).toFixed(2) : '-', color: '#f0c040' },
              { label: 'LOSS', value: m.loss != null ? Number(m.loss).toFixed(4) : '-', color: '#f06090' },
              { label: 'LR', value: m.lr != null || m.learning_rate != null ? Number(m.lr ?? m.learning_rate).toExponential(1) : '-', color: '#40d8f0' },
              { label: 'GPU', value: m.gpu_util != null ? Number(m.gpu_util).toFixed(0) + '%' : '-', color: '#a78bfa' },
              { label: 'STEP', value: m.step != null && m.total_steps != null ? `${m.step}/${m.total_steps}` : m.step != null ? String(m.step) : '-', color: '#60d0a0' },
              { label: 'TIME', value: m.elapsed_s != null ? fmtDur(Number(m.elapsed_s)) : '-', color: '#f0c040' },
            ];
            return (
              <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {indicators.map(ind => (
                  <div key={ind.label} style={{
                    background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 6,
                    padding: '8px 14px', minWidth: 90, textAlign: 'center',
                  }}>
                    <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 6, color: 'var(--dim)', marginBottom: 4 }}>{ind.label}</div>
                    <div style={{ fontFamily: "'Courier New', monospace", fontSize: 13, fontWeight: 700, color: ind.color }}>{ind.value}</div>
                  </div>
                ))}
              </div>
            );
          })()}
          {history.length > 0 && (
            <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn gold sm" style={{ fontSize: 6 }}
                onClick={() => { triggerDownload(exportMetricsCSV(history), `${task.taskId}-metrics.csv`); }}>
                EXPORT CSV
              </button>
              <button className="btn cyan sm" style={{ fontSize: 6 }}
                onClick={() => { triggerDownload(exportMetricsJSON(history), `${task.taskId}-metrics.json`); }}>
                EXPORT JSON
              </button>
              <button className="btn sm" style={{ fontSize: 6 }}
                onClick={() => { triggerDownload(exportMetricsJSONL(history), `${task.taskId}-metrics.jsonl`); }}>
                EXPORT JSONL
              </button>
            </div>
          )}
        </div>
      )}

      {hasArtifacts && <ArtifactBrowser taskId={task.taskId} hasNode={!!task.nodeId} />}
    </div>
  );
}
