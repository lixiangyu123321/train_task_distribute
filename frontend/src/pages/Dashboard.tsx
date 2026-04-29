import { useApi } from '../hooks/useApi';
import { fetchDashboard } from '../services/api';
import StudioScene from '../components/StudioScene';
import { useNavigate } from 'react-router-dom';
import type { NodeItem } from '../types';

export default function Dashboard() {
  const { data: snapshot, loading } = useApi(fetchDashboard, 5000);
  const navigate = useNavigate();

  if (loading && !snapshot) return (
    <div style={{ textAlign: 'center', padding: 80, color: '#b0a0c0', fontFamily: "'Press Start 2P', monospace", fontSize: 9 }}>
      LOADING STUDIO...
    </div>
  );
  if (!snapshot) return null;

  const { totalTasks, nodes, clusterUtilization } = snapshot;

  const cards = [
    { label: 'WAITING', value: totalTasks?.pending || 0, color: '#ffd166', bg: '#fff8e1', emoji: '⏳' },
    { label: 'QUEUED', value: totalTasks?.queued || 0, color: '#7ec8e3', bg: '#e3f2fd', emoji: '📋' },
    { label: 'RUNNING', value: totalTasks?.running || 0, color: '#8cd790', bg: '#e8f5e9', emoji: '⚡' },
    { label: 'DONE', value: totalTasks?.completed || 0, color: '#b8a0e8', bg: '#f5f0ff', emoji: '✅' },
    { label: 'OOPS', value: totalTasks?.failed || 0, color: '#ff8a80', bg: '#ffebee', emoji: '💥' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2>🏭 STUDIO</h2>
        <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: '#b0a0c0' }}>
          GPU AVG: {clusterUtilization}%
        </span>
      </div>

      {/* 任务统计条 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {cards.map(c => (
          <div key={c.label} onClick={() => {
            const m: Record<string,string> = {WAITING:'PENDING',QUEUED:'QUEUED',RUNNING:'RUNNING',DONE:'COMPLETED',OOPS:'FAILED'};
            navigate(`/tasks?status=${m[c.label]}`);
          }}
          className="pixel-card"
          style={{
            flex: 1, minWidth: 80, padding: '8px 12px',
            cursor: 'pointer', background: c.bg,
            borderLeft: `3px solid ${c.color}`,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ fontSize: 16 }}>{c.emoji}</span>
            <div>
              <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 16, color: c.color }}>
                {String(c.value).padStart(2, '0')}
              </span>
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 6, color: '#9a8fa8' }}>
                {c.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 工作室场景 */}
      <StudioScene
        nodes={(nodes || []) as NodeItem[]}
        onNodeClick={(node) => navigate('/nodes')}
      />

      {/* 快速提示 */}
      <div style={{
        marginTop: 12, padding: '8px 14px',
        background: '#f5f0ff', borderRadius: 6, border: '2px solid #e8ddf8',
        fontFamily: "'Press Start 2P', monospace", fontSize: 6, color: '#8a7aaa',
        display: 'flex', justifyContent: 'space-between',
      }}>
        <span>TIP: CLICK NODE TO VIEW DETAILS</span>
        <span style={{ cursor: 'pointer', color: '#b8a0e8' }}
          onClick={() => navigate('/nodes')}>
          MANAGE NODES ▶
        </span>
      </div>
    </div>
  );
}
