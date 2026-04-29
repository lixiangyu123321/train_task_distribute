import { useApi } from '../hooks/useApi';
import { fetchDashboard } from '../services/api';
import StudioCanvas from '../components/StudioCanvas';
import { useNavigate } from 'react-router-dom';
import type { NodeItem } from '../types';

export default function Dashboard() {
  const { data: s, loading } = useApi(fetchDashboard, 5000);
  const nav = useNavigate();
  if (loading && !s) return <div style={{ textAlign: 'center', padding: 80, color: 'var(--gold)', font: '8px var(--font-pixel)' }}>INITIALIZING...</div>;
  if (!s) return null;

  const { totalTasks, nodes, clusterUtilization } = s;
  const p = totalTasks?.pending || 0, q = totalTasks?.queued || 0, r = totalTasks?.running || 0;
  const stats = [
    { label: 'QUEUED', v: p+q, color: 'cyan', status: 'PENDING' },
    { label: 'ACTIVE', v: r, color: 'gold', status: 'RUNNING' },
    { label: 'DONE', v: totalTasks?.completed || 0, color: 'green', status: 'COMPLETED' },
    { label: 'LOST', v: totalTasks?.failed || 0, color: 'red', status: 'FAILED' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2>◆ BRIDGE</h2>
        <span className="badge gold">GPU LOAD {clusterUtilization}%</span>
      </div>

      {/* HUD行 */}
      <div className="hud-row">
        {stats.map(st => (
          <div key={st.label} className="panel" style={{
            padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
            borderLeft: `3px solid var(--${st.color})`,
          }} onClick={() => nav(`/tasks?status=${st.status}`)}>
            <span style={{ font: '18px var(--font-pixel)', color: `var(--${st.color})` }}>
              {String(st.v).padStart(2, '0')}
            </span>
            <span style={{ font: '7px var(--font-pixel)', color: 'var(--dim)', letterSpacing: 1 }}>{st.label}</span>
          </div>
        ))}
        <div className="panel" style={{
          padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10,
          borderLeft: '3px solid var(--purple)',
        }}>
          <span style={{ font: '18px var(--font-pixel)', color: 'var(--purple)' }}>{nodes?.length || 0}</span>
          <span style={{ font: '7px var(--font-pixel)', color: 'var(--dim)', letterSpacing: 1 }}>NODES</span>
        </div>
      </div>

      {/* 场景 */}
      <StudioCanvas
        nodes={(nodes || []) as NodeItem[]}
        pendingTasks={p} queuedTasks={q} runningTasks={r}
        onNodeClick={() => nav('/nodes')}
        onAddNode={() => nav('/nodes?tab=manage')}
        onRemoveNode={() => nav('/nodes')}
      />

      <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ font: '6px var(--font-pixel)', color: 'var(--muted)' }}>
          TIP: SUBMIT A CARGO TO SEE THE HUB IN ACTION
        </span>
        <button className="btn gold sm" onClick={() => nav('/submit')}>DEPLOY CARGO ▶</button>
      </div>
    </div>
  );
}
