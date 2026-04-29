import { useApi } from '../hooks/useApi';
import { fetchDashboard } from '../services/api';
import NodeCard from '../components/NodeCard';
import ResourceChart from '../components/ResourceChart';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { data: snapshot, loading } = useApi(fetchDashboard, 5000);
  const navigate = useNavigate();

  if (loading && !snapshot) return <div>加载中...</div>;
  if (!snapshot) return <div>无法获取仪表盘数据</div>;

  const { totalTasks, nodes, clusterUtilization } = snapshot;
  const summaryCards = [
    { label: '等待中', value: totalTasks?.pending || 0, color: '#faad14' },
    { label: '排队中', value: totalTasks?.queued || 0, color: '#1677ff' },
    { label: '运行中', value: totalTasks?.running || 0, color: '#52c41a' },
    { label: '已完成', value: totalTasks?.completed || 0, color: '#666' },
    { label: '失败', value: totalTasks?.failed || 0, color: '#ff4d4f' },
  ];

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>集群总览</h2>

      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        {summaryCards.map(card => (
          <div key={card.label} style={{
            flex: 1, background: '#fff', borderRadius: 8, padding: '16px 20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)', cursor: 'pointer',
            borderLeft: `4px solid ${card.color}`,
          }} onClick={() => navigate(`/tasks?status=${card.label === '等待中' ? 'PENDING' : card.label === '排队中' ? 'QUEUED' : card.label === '运行中' ? 'RUNNING' : card.label === '已完成' ? 'COMPLETED' : 'FAILED'}`)}>
            <div style={{ fontSize: 28, fontWeight: 700, color: card.color }}>{card.value}</div>
            <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>{card.label}</div>
          </div>
        ))}
        <div style={{
          flex: 1, background: '#fff', borderRadius: 8, padding: '16px 20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          borderLeft: '4px solid #e94560',
        }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#e94560' }}>{clusterUtilization}%</div>
          <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>集群利用率</div>
        </div>
      </div>

      {nodes.length > 0 && (
        <>
          <h3 style={{ marginBottom: 16 }}>GPU 节点状态</h3>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
            {nodes.map(node => <NodeCard key={node.nodeId} node={node} />)}
          </div>
          <ResourceChart nodes={nodes} />
        </>
      )}
    </div>
  );
}
