import { useApi } from '../hooks/useApi';
import { fetchNodes } from '../services/api';
import NodeCard from '../components/NodeCard';
import GpuGauge from '../components/GpuGauge';
import ResourceChart from '../components/ResourceChart';

export default function NodeMonitor() {
  const { data: nodes, loading } = useApi(fetchNodes, 3000);

  if (loading && !nodes) return <div style={{ color: '#00f0ff' }}>LOADING...</div>;
  if (!nodes || nodes.length === 0) return (
    <div className="pixel-card" style={{ padding: 40, textAlign: 'center' }}>
      <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 10, color: '#ff2d78' }}>
        NO NODES ONLINE
      </div>
      <div style={{ fontSize: 10, color: '#555', marginTop: 10 }}>
        START A GPU WORKER TO SEE DATA
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ marginBottom: 6 }}>GPU NODES</h2>
        <div className="pixel-divider" />
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
        {nodes.map(node => <NodeCard key={node.nodeId} node={node} />)}
      </div>

      <div className="pixel-card" style={{ padding: 20, marginBottom: 24 }}>
        <h4 style={{ marginBottom: 16 }}>▸ CLUSTER RESOURCE COMPARISON</h4>
        <ResourceChart nodes={nodes} />
      </div>

      <div className="pixel-card" style={{ padding: 20 }}>
        <h4 style={{ marginBottom: 16 }}>▸ GPU LOAD GAUGES</h4>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
          {nodes.map(node => (
            <GpuGauge key={node.nodeId}
              value={node.resources.gpuUtilization}
              title={node.name} />
          ))}
        </div>
      </div>
    </div>
  );
}
