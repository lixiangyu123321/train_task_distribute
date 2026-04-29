import { useApi } from '../hooks/useApi';
import { fetchDashboard } from '../services/api';
import StudioCanvas from '../components/StudioCanvas';
import { useNavigate } from 'react-router-dom';
import type { NodeItem } from '../types';

export default function Dashboard() {
  const { data: snapshot, loading } = useApi(fetchDashboard, 5000);
  const navigate = useNavigate();

  if (loading && !snapshot) return (
    <div style={{ textAlign: 'center', padding: 80, color: 'var(--c-dim)', font: '8px var(--font-pixel)' }}>
      LOADING STUDIO...
    </div>
  );
  if (!snapshot) return null;

  const { totalTasks, nodes, clusterUtilization } = snapshot;
  const pending = totalTasks?.pending || 0;
  const queued = totalTasks?.queued || 0;
  const running = totalTasks?.running || 0;

  const stats = [
    { label: 'WAIT', value: pending, color: 'var(--c-yellow)', bg: '#fff8e1', emoji: '⏳', status: 'PENDING' },
    { label: 'QUEUE', value: queued, color: 'var(--c-blue)', bg: '#e3f2fd', emoji: '📋', status: 'QUEUED' },
    { label: 'RUN', value: running, color: 'var(--c-green)', bg: '#e8f5e9', emoji: '⚡', status: 'RUNNING' },
    { label: 'DONE', value: totalTasks?.completed || 0, color: 'var(--c-lavender)', bg: '#f5f0ff', emoji: '✅', status: 'COMPLETED' },
    { label: 'FAIL', value: totalTasks?.failed || 0, color: 'var(--c-coral)', bg: '#ffebee', emoji: '💥', status: 'FAILED' },
  ];

  return (
    <div>
      {/* 标题 */}
      <div className="flex-between" style={{ marginBottom: 14 }}>
        <h2>🏭 STUDIO</h2>
        <span style={{ font: '7px var(--font-pixel)', color: 'var(--c-dim)' }}>
          GPU AVG: {clusterUtilization}%
        </span>
      </div>

      {/* 统计卡片 — Grid响应式 */}
      <div className="stats-row">
        {stats.map(s => (
          <div key={s.label} className="stat-card"
            onClick={() => navigate(`/tasks?status=${s.status}`)}
            style={{ borderLeft: `3px solid ${s.color}`, background: s.bg }}>
            <span className="stat-emoji">{s.emoji}</span>
            <div>
              <div className="stat-value" style={{ color: s.color }}>{String(s.value).padStart(2, '0')}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 工作室场景 — 传入真实任务计数 */}
      <StudioCanvas
        nodes={(nodes || []) as NodeItem[]}
        pendingTasks={pending}
        queuedTasks={queued}
        runningTasks={running}
        onNodeClick={() => navigate('/nodes')}
      />

      {/* 底部提示 */}
      <div style={{
        marginTop: 12, padding: '8px 14px', borderRadius: 'var(--radius-sm)',
        background: '#f5f0ff', border: '2px solid #e8ddf8',
        font: '7px var(--font-pixel)', color: 'var(--c-dim)',
        display: 'flex', justifyContent: 'space-between',
      }}>
        <span>TIP: SUBMIT A TASK TO SEE THE STUDIO IN ACTION</span>
        <span style={{ cursor: 'pointer', color: 'var(--c-lavender)' }}
          onClick={() => navigate('/submit')}>SUBMIT TASK ▶</span>
      </div>
    </div>
  );
}
