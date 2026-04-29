import { useApi } from '../hooks/useApi';
import { fetchDashboard } from '../services/api';
import NodeCard from '../components/NodeCard';
import ResourceChart from '../components/ResourceChart';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { data: snapshot, loading } = useApi(fetchDashboard, 5000);
  const navigate = useNavigate();

  if (loading && !snapshot) return <div style={{ color: '#00f0ff' }}>LOADING...</div>;
  if (!snapshot) return <div style={{ color: '#ff2d78' }}>NO DATA</div>;

  const { totalTasks, nodes, clusterUtilization } = snapshot;
  const cards = [
    { label: 'PENDING', value: totalTasks?.pending || 0, color: '#ffe600', glow: '#ffe600' },
    { label: 'QUEUED', value: totalTasks?.queued || 0, color: '#00f0ff', glow: '#00f0ff' },
    { label: 'RUNNING', value: totalTasks?.running || 0, color: '#39ff14', glow: '#39ff14' },
    { label: 'DONE', value: totalTasks?.completed || 0, color: '#b44dff', glow: '#b44dff' },
    { label: 'FAILED', value: totalTasks?.failed || 0, color: '#ff2d78', glow: '#ff2d78' },
  ];

  return (
    <div>
      {/* 标题 */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ marginBottom: 6 }}>CLUSTER OVERVIEW</h2>
        <div className="pixel-divider" />
      </div>

      {/* 状态卡片 */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        {cards.map(card => (
          <div key={card.label}
            onClick={() => {
              const statusMap: Record<string,string> = {PENDING:'PENDING',QUEUED:'QUEUED',RUNNING:'RUNNING',DONE:'COMPLETED',FAILED:'FAILED'};
              navigate(`/tasks?status=${statusMap[card.label]}`);
            }}
            className="pixel-card"
            style={{
              flex: 1, minWidth: 120, padding: '16px 20px',
              cursor: 'pointer', borderLeft: `4px solid ${card.color}`,
              boxShadow: `4px 4px 0 rgba(0,0,0,0.6), 0 0 20px ${card.glow}15`,
            }}>
            <div style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 28, color: card.color,
              textShadow: `0 0 12px ${card.glow}, 3px 3px 0 rgba(0,0,0,0.5)`,
            }}>
              {String(card.value).padStart(2, '0')}
            </div>
            <div style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 8, color: '#8888bb', marginTop: 8,
            }}>
              {card.label}
            </div>
          </div>
        ))}

        {/* 集群利用率 */}
        <div className="pixel-card" style={{
          flex: 1, minWidth: 120, padding: '16px 20px',
          borderLeft: '4px solid #ff6b2b',
          boxShadow: '4px 4px 0 rgba(0,0,0,0.6), 0 0 20px rgba(255,107,43,0.15)',
        }}>
          <div style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: 28, color: '#ff6b2b',
            textShadow: '0 0 12px #ff6b2b, 3px 3px 0 rgba(0,0,0,0.5)',
          }}>
            {clusterUtilization}%
          </div>
          <div style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: 8, color: '#8888bb', marginTop: 8,
          }}>
            GPU LOAD
          </div>
        </div>
      </div>

      {/* GPU 节点 */}
      {nodes.length > 0 && (
        <>
          <h3 style={{ marginBottom: 16 }}>▸ GPU NODES</h3>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
            {nodes.map(node => <NodeCard key={node.nodeId} node={node} />)}
          </div>
          <div className="pixel-card" style={{ padding: 20 }}>
            <ResourceChart nodes={nodes} />
          </div>
        </>
      )}
    </div>
  );
}
