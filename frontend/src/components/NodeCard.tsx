import type { NodeItem } from '../types';
import StatusBadge from './StatusBadge';
import PixelWorker from './PixelWorker';

function getWorkerState(node: NodeItem) {
  if (node.status === 'OFFLINE') return 'sleeping' as const;
  if (node.status === 'ERROR') return 'error' as const;
  if ((node.resources.activeTasks || 0) > 0) return 'working' as const;
  if (node.status === 'ONLINE') return 'idle' as const;
  return 'idle' as const;
}

export default function NodeCard({ node }: { node: NodeItem }) {
  const { resources } = node;
  const vramUsed = ((resources.vramUsedMb || 0) / 1024).toFixed(1);
  const vramTotal = ((node.vramTotalMb || 0) / 1024).toFixed(1);
  const gpuUtil = resources.gpuUtilization || 0;
  const workerState = getWorkerState(node);

  return (
    <div className="pixel-card" style={{
      padding: 16, minWidth: 260, maxWidth: 300,
      display: 'flex', flexDirection: 'column',
    }}>
      {/* 顶部: 工人 + 标题 */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
        <PixelWorker state={workerState} name={node.name} size="small" />
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: "'Press Start 2P', monospace", fontSize: 9,
            color: '#5a4a8a', marginBottom: 6,
          }}>
            {node.name.length > 10 ? node.name.substring(0, 10) + '..' : node.name}
          </div>
          <StatusBadge status={node.status} />
        </div>
      </div>

      {/* GPU 利用率 */}
      <div style={{ marginBottom: 10 }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          fontFamily: "'Press Start 2P', monospace", fontSize: 7,
          color: '#8a7aaa', marginBottom: 4,
        }}>
          <span>GPU</span><span>{gpuUtil}%</span>
        </div>
        <div className="pixel-progress" style={{ height: 12 }}>
          <div className="pixel-progress-inner" style={{
            width: `${gpuUtil}%`,
            background: gpuUtil > 80
              ? 'repeating-linear-gradient(90deg, #ff8a80 0px, #ff8a80 8px, #d87070 8px, #d87070 10px)'
              : undefined,
          }} />
        </div>
      </div>

      {/* 规格 */}
      <div style={{
        fontSize: 10, color: '#9a8fa8', fontFamily: 'monospace',
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 12px',
      }}>
        <div>GPU: <b style={{ color: '#5a4a8a' }}>{node.gpuModel?.substring(0, 15)}</b></div>
        <div>VRAM: <b style={{ color: '#8cd790' }}>{vramTotal}G</b></div>
        <div>TEMP: <b style={{ color: '#ff8a80' }}>{resources.gpuTemp}°C</b></div>
        <div>TASK: <b style={{ color: '#7ec8e3' }}>{resources.activeTasks}</b></div>
      </div>
    </div>
  );
}
