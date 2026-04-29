import type { NodeItem } from '../types';
import StatusBadge from './StatusBadge';

export default function NodeCard({ node }: { node: NodeItem }) {
  const { resources } = node;
  const vramUsed = ((resources.vramUsedMb || 0) / 1024).toFixed(1);
  const vramTotal = ((node.vramTotalMb || 0) / 1024).toFixed(1);
  const gpuUtil = resources.gpuUtilization || 0;

  return (
    <div className="pixel-card glitch" style={{
      padding: 18, minWidth: 280, maxWidth: 320,
    }}>
      {/* 标题行 */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 14, paddingBottom: 12,
        borderBottom: '2px solid #2a2a50',
        fontFamily: "'Press Start 2P', monospace", fontSize: 9,
      }}>
        <span style={{ color: '#00f0ff', textShadow: '0 0 6px #00f0ff44' }}>
          [{node.name}]
        </span>
        <StatusBadge status={node.status} />
      </div>

      {/* 规格 */}
      <div style={{ fontSize: 10, color: '#888', lineHeight: 2.2, marginBottom: 14 }}>
        <div>GPU  <span style={{ color: '#b44dff', float: 'right' }}>{node.gpuModel}</span></div>
        <div>VRAM <span style={{ color: '#39ff14', float: 'right' }}>{vramTotal} GB</span></div>
        <div>IP   <span style={{ color: '#ffe600', float: 'right' }}>{node.publicIp}:{node.apiPort}</span></div>
        <div>TASK <span style={{ color: '#ff6b2b', float: 'right' }}>{resources.activeTasks}</span></div>
      </div>

      {/* GPU 利用率像素条 */}
      <div>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          fontSize: 8, fontFamily: "'Press Start 2P', monospace",
          color: gpuUtil > 80 ? '#ff2d78' : '#39ff14', marginBottom: 6,
        }}>
          <span>GPU LOAD</span>
          <span>{gpuUtil}%</span>
        </div>
        <div className="pixel-progress">
          <div className="pixel-progress-inner" style={{
            width: `${gpuUtil}%`,
            background: gpuUtil > 80
              ? 'repeating-linear-gradient(90deg, #ff2d78 0px, #ff2d78 6px, #8a1a3a 6px, #8a1a3a 8px)'
              : undefined,
          }} />
        </div>
      </div>

      {/* 脚注 */}
      <div style={{
        marginTop: 14, paddingTop: 10,
        borderTop: '2px solid #2a2a50',
        fontSize: 9, color: '#555',
        display: 'flex', justifyContent: 'space-between',
      }}>
        <span>TEMP: {resources.gpuTemp}°C</span>
        <span>VRAM: {vramUsed}/{vramTotal}G</span>
      </div>
    </div>
  );
}
