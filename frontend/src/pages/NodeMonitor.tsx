import { useApi } from '../hooks/useApi';
import { fetchNodes } from '../services/api';
import NodeCard from '../components/NodeCard';
import GpuGauge from '../components/GpuGauge';
import ResourceChart from '../components/ResourceChart';

export default function NodeMonitor() {
  const { data: nodes, loading } = useApi(fetchNodes, 3000);

  if (loading && !nodes) return <div>加载中...</div>;
  if (!nodes || nodes.length === 0) return <div>暂无在线节点</div>;

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>GPU 节点实时监控</h2>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
        {nodes.map(node => (
          <NodeCard key={node.nodeId} node={node} />
        ))}
      </div>

      <div style={{
        background: '#fff', borderRadius: 8, padding: 24,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: 24,
      }}>
        <h3 style={{ marginBottom: 16 }}>集群资源对比</h3>
        <ResourceChart nodes={nodes} />
      </div>

      <div style={{
        background: '#fff', borderRadius: 8, padding: 24,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}>
        <h3 style={{ marginBottom: 16 }}>GPU 利用率仪表盘</h3>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
          {nodes.map(node => (
            <GpuGauge key={node.nodeId}
              value={node.resources.gpuUtilization}
              title={`${node.name}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
