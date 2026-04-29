import { useApi } from '../hooks/useApi';
import { fetchDashboard } from '../services/api';
import NodeCard from '../components/NodeCard';
import ResourceChart from '../components/ResourceChart';
import PixelWorker from '../components/PixelWorker';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { data: snapshot, loading } = useApi(fetchDashboard, 5000);
  const navigate = useNavigate();

  if (loading && !snapshot) return <div style={{ color: '#b0a0c0', textAlign: 'center', padding: 80, fontFamily: "'Press Start 2P', monospace", fontSize: 10 }}>LOADING...</div>;
  if (!snapshot) return <div>NO DATA</div>;

  const { totalTasks, nodes, clusterUtilization } = snapshot;
  const hasActiveWorkers = nodes.some((n: { resources: { activeTasks: number } }) => (n.resources.activeTasks || 0) > 0);

  const cards = [
    { label: 'WAITING', value: totalTasks?.pending || 0, color: '#ffd166', bg: '#fff8e1', emoji: '⏳' },
    { label: 'QUEUED', value: totalTasks?.queued || 0, color: '#7ec8e3', bg: '#e3f2fd', emoji: '📋' },
    { label: 'RUNNING', value: totalTasks?.running || 0, color: '#8cd790', bg: '#e8f5e9', emoji: '⚡' },
    { label: 'DONE', value: totalTasks?.completed || 0, color: '#b8a0e8', bg: '#f5f0ff', emoji: '✅' },
    { label: 'OOPS', value: totalTasks?.failed || 0, color: '#ff8a80', bg: '#ffebee', emoji: '💥' },
  ];

  return (
    <div>
      {/* 标题 + 像素工人 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
        <PixelWorker state={hasActiveWorkers ? 'working' : 'idle'} size="large" />
        <div>
          <h2 style={{ marginBottom: 4 }}>DASHBOARD</h2>
          <div style={{ fontSize: 10, color: '#b0a0c0', fontFamily: "'Press Start 2P', monospace" }}>
            {hasActiveWorkers ? '⚡ WORKERS ARE BUSY!' : '💤 ALL QUIET...'}
          </div>
        </div>
      </div>
      <div className="pixel-divider" />

      {/* 状态卡片 */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {cards.map(card => (
          <div key={card.label} onClick={() => {
            const m: Record<string,string> = {WAITING:'PENDING',QUEUED:'QUEUED',RUNNING:'RUNNING',DONE:'COMPLETED',OOPS:'FAILED'};
            navigate(`/tasks?status=${m[card.label]}`);
          }}
          className="pixel-card"
          style={{
            flex: 1, minWidth: 100, padding: '14px 16px', cursor: 'pointer',
            borderLeft: `4px solid ${card.color}`, background: card.bg,
          }}>
            <div style={{ fontSize: 18, marginBottom: 4 }}>{card.emoji}</div>
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 22, color: card.color }}>
              {String(card.value).padStart(2, '0')}
            </div>
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: '#9a8fa8', marginTop: 4 }}>
              {card.label}
            </div>
          </div>
        ))}
        <div className="pixel-card" style={{
          flex: 1, minWidth: 100, padding: '14px 16px',
          background: '#f5f0ff', borderLeft: '4px solid #b8a0e8',
        }}>
          <div style={{ fontSize: 18, marginBottom: 4 }}>📊</div>
          <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 22, color: '#b8a0e8' }}>
            {clusterUtilization}%
          </div>
          <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: '#9a8fa8', marginTop: 4 }}>
            GPU AVG
          </div>
        </div>
      </div>

      {/* GPU 节点 + 工人 */}
      {nodes.length > 0 && (
        <>
          <h3 style={{ marginBottom: 14 }}>▸ GPU WORKERS</h3>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 20 }}>
            {nodes.map((node: Record<string,unknown>) => (
              <NodeCard key={node.nodeId as string} node={node as never} />
            ))}
          </div>
          <div className="pixel-card" style={{ padding: 20 }}>
            <h4 style={{ marginBottom: 14 }}>▸ RESOURCES</h4>
            <ResourceChart nodes={nodes as never[]} />
          </div>
        </>
      )}
    </div>
  );
}
