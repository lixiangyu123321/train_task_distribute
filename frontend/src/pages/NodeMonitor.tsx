import { useApi } from '../hooks/useApi';
import { fetchNodes } from '../services/api';
import NodeCard from '../components/NodeCard';
import GpuGauge from '../components/GpuGauge';
import ResourceChart from '../components/ResourceChart';
import NodeManager from '../components/NodeManager';
import { useState } from 'react';

export default function NodeMonitor() {
  const { data: nodes, loading } = useApi(fetchNodes, 3000);
  const [tab, setTab] = useState<'monitor' | 'manage'>('monitor');

  if (loading && !nodes) return (
    <div style={{ textAlign: 'center', padding: 60, color: '#b0a0c0', fontFamily: "'Press Start 2P', monospace", fontSize: 8 }}>
      LOADING...
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h2>🖥️ GPU NODES</h2>
        <div style={{ display: 'flex', gap: 0 }}>
          <button onClick={() => setTab('monitor')}
            className={tab === 'monitor' ? 'pixel-btn' : ''}
            style={tab !== 'monitor' ? {
              fontFamily: "'Press Start 2P', monospace", fontSize: 7, padding: '7px 12px',
              background: '#fff', border: '2px solid #e0d6c8', borderRadius: '4px 0 0 4px', color: '#b0a0c0',
            } : { fontSize: 7, borderRadius: '4px 0 0 4px' }}>
            📊 MONITOR
          </button>
          <button onClick={() => setTab('manage')}
            className={tab === 'manage' ? 'pixel-btn' : ''}
            style={tab !== 'manage' ? {
              fontFamily: "'Press Start 2P', monospace", fontSize: 7, padding: '7px 12px',
              background: '#fff', border: '2px solid #e0d6c8', borderRadius: '0 4px 4px 0', color: '#b0a0c0',
            } : { fontSize: 7, borderRadius: '0 4px 4px 0' }}>
            ⚙ MANAGE
          </button>
        </div>
      </div>

      {tab === 'manage' ? (
        <NodeManager />
      ) : (
        <>
          {(!nodes || nodes.length === 0) ? (
            <div className="pixel-card" style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🖥️</div>
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 10, color: '#ff8a80' }}>
                NO NODES ONLINE
              </div>
              <div style={{ fontSize: 10, color: '#b0a0c0', marginTop: 8, fontFamily: 'monospace' }}>
                START A GPU WORKER OR REGISTER MANUALLY
              </div>
              <div style={{ marginTop: 16 }}>
                <button className="pixel-btn" style={{ fontSize: 8 }} onClick={() => setTab('manage')}>
                  ADD NODE ▶
                </button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 20 }}>
                {nodes.map(node => <NodeCard key={node.nodeId} node={node} />)}
              </div>
              <div className="pixel-card" style={{ padding: 20, marginBottom: 20 }}>
                <h4 style={{ marginBottom: 14 }}>RESOURCE COMPARISON</h4>
                <ResourceChart nodes={nodes} />
              </div>
              <div className="pixel-card" style={{ padding: 20 }}>
                <h4 style={{ marginBottom: 14 }}>GPU LOAD</h4>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {nodes.map(node => (
                    <GpuGauge key={node.nodeId} value={node.resources.gpuUtilization} title={node.name} />
                  ))}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
