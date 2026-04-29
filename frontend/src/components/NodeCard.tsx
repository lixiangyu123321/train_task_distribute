import type { NodeItem } from '../types';
import StatusBadge from './StatusBadge';
import PixelWorker from './PixelWorker';

function getWorkerState(node: NodeItem) {
  if (node.status === 'OFFLINE') return 'sleeping' as const;
  if (node.status === 'ERROR') return 'error' as const;
  if ((node.resources.activeTasks || 0) > 0) return 'working' as const;
  return 'idle' as const;
}

export default function NodeCard({ node }: { node: NodeItem }) {
  const { resources } = node;
  const vramUsed = ((resources.vramUsedMb || 0) / 1024).toFixed(1);
  const vramTotal = ((node.vramTotalMb || 0) / 1024).toFixed(1);
  const gpuUtil = resources.gpuUtilization || 0;

  return (
    <div className="pixel-card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* 标题行 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <PixelWorker state={getWorkerState(node)} size="small" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ font: '8px var(--font-pixel)', color: '#5a4a8a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {node.name}
          </div>
          <StatusBadge status={node.status} />
        </div>
      </div>

      {/* GPU 利用率 */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', font: '6px var(--font-pixel)', color: 'var(--c-dim)', marginBottom: 3 }}>
          <span>GPU</span><span>{gpuUtil}%</span>
        </div>
        <div className="pixel-progress" style={{ height: 10 }}>
          <div className="pixel-progress-inner" style={{
            width: `${gpuUtil}%`,
            background: gpuUtil > 80
              ? 'repeating-linear-gradient(90deg, var(--c-coral) 0px, var(--c-coral) 6px, #d87070 6px, #d87070 8px)'
              : undefined,
          }} />
        </div>
      </div>

      {/* 规格 */}
      <div style={{ font: '9px var(--font-mono)', color: 'var(--c-dim)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px 10px' }}>
        <div>GPU: <b style={{ color: '#5a4a8a' }}>{(node.gpuModel || '-').substring(0, 14)}</b></div>
        <div>VRAM: <b style={{ color: 'var(--c-green)' }}>{vramTotal}G</b></div>
        <div>TEMP: <b style={{ color: 'var(--c-coral)' }}>{resources.gpuTemp}°C</b></div>
        <div>TASKS: <b style={{ color: 'var(--c-blue)' }}>{resources.activeTasks}</b></div>
      </div>
    </div>
  );
}
