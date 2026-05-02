import { useRealtimeData } from '../hooks/useRealtimeData';
import { fetchNodes } from '../services/api';
import NodeCard from '../components/NodeCard';
import GpuGauge from '../components/GpuGauge';
import ResourceChart from '../components/ResourceChart';
import NodeManager from '../components/NodeManager';
import { SkeletonCard } from '../components/Skeleton';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export default function NodeMonitor() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'ADMIN';
  const wsExtract = (msg: any) => {
    const snapshot = msg.payload as Record<string, any> | undefined;
    return (snapshot?.nodes as any[]) ?? null;
  };
  const { data: nodes, loading, refresh, source } = useRealtimeData(fetchNodes, 15000, {
    type: 'DASHBOARD_SNAPSHOT',
    extract: wsExtract,
  });
  const [searchParams] = useSearchParams();
  const initTab = searchParams.get('tab') === 'manage' ? 'manage' : 'monitor';
  const [tab, setTab] = useState<'monitor' | 'manage'>(initTab);

  if (loading && !nodes) return (
    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
      {[1,2,3].map(i => <div key={i} style={{ flex: '1 1 250px' }}><SkeletonCard height={140} /></div>)}
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h2>◈ GPU NODES</h2>
          <span style={{
            display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
            background: source === 'ws' ? 'var(--green)' : 'var(--gold)',
          }} />
        </div>
        <div style={{ display: 'flex', gap: 0 }}>
          <button onClick={() => setTab('monitor')}
            className={`btn ${tab === 'monitor' ? 'cyan' : ''}`}
            style={{ fontSize: 7, borderRadius: isAdmin ? '4px 0 0 4px' : '4px' }}>
            ◆ MONITOR
          </button>
          {isAdmin && (
            <button onClick={() => setTab('manage')}
              className={`btn ${tab === 'manage' ? 'cyan' : ''}`}
              style={{ fontSize: 7, borderRadius: '0 4px 4px 0' }}>
              ◇ MANAGE
            </button>
          )}
        </div>
      </div>

      {tab === 'manage' ? (
        <NodeManager nodes={nodes} loading={loading} refresh={refresh} />
      ) : (
        <>
          {(!nodes || nodes.length === 0) ? (
            <div className="panel" style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>◈</div>
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 10, color: 'var(--red)' }}>
                NO NODES ONLINE
              </div>
              <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 8, fontFamily: 'monospace' }}>
                START A GPU WORKER OR REGISTER MANUALLY
              </div>
              <div style={{ marginTop: 16 }}>
                <button className="btn cyan" style={{ fontSize: 8 }} onClick={() => setTab('manage')}>
                  ADD NODE ▶
                </button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 20 }}>
                {nodes.map(node => <NodeCard key={node.nodeId} node={node} />)}
              </div>
              <div className="panel" style={{ padding: 20, marginBottom: 20 }}>
                <h4 style={{ marginBottom: 14 }}>RESOURCE COMPARISON</h4>
                <ResourceChart nodes={nodes} />
              </div>
              <div className="panel" style={{ padding: 20 }}>
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
