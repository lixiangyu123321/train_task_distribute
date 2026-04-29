import type { NodeItem } from '../types';
import StatusBadge from './StatusBadge';

function getWorkerState(node: NodeItem) {
  if (node.status === 'OFFLINE') return 'sleeping' as const;
  if (node.status === 'ERROR') return 'error' as const;
  if ((node.resources.activeTasks || 0) > 0) return 'working' as const;
  return 'idle' as const;
}

export default function NodeCard({ node }: { node: NodeItem }) {
  const r = node.resources; const util = r.gpuUtilization || 0;
  const barColor = util > 80 ? 'red' : util > 40 ? 'gold' : 'green';

  return (
    <div className="panel" style={{ padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ font: '8px var(--font-pixel)', color: 'var(--cyan)' }}>
          {(node.name || '').substring(0, 12)}
        </span>
        <StatusBadge status={node.status} />
      </div>

      <div style={{ marginBottom: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', font: '6px var(--font-pixel)', color: 'var(--dim)', marginBottom: 2 }}>
          <span>GPU LOAD</span><span>{util}%</span>
        </div>
        <div className="bar"><div className={`bar-fill ${barColor}`} style={{ width: `${util}%` }} /></div>
      </div>

      <div style={{ font: '8px var(--font-mono)', color: 'var(--dim)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 8px' }}>
        <div>GPU: <b style={{ color: 'var(--white)' }}>{(node.gpuModel || '-').substring(0, 14)}</b></div>
        <div>TEMP: <b style={{ color: 'var(--red)' }}>{r.gpuTemp}°C</b></div>
        <div>VRAM: <b style={{ color: 'var(--green)' }}>{((r.vramUsedMb||0)/1024).toFixed(1)}/{((node.vramTotalMb||0)/1024).toFixed(1)}G</b></div>
        <div>TASKS: <b style={{ color: 'var(--gold)' }}>{r.activeTasks}</b></div>
      </div>
    </div>
  );
}
