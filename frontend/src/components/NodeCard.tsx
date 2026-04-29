import type { NodeItem } from '../types';
import StatusBadge from './StatusBadge';

export default function NodeCard({ node }: { node: NodeItem }) {
  const { resources } = node;
  const vramUsedGB = ((resources.vramUsedMb || 0) / 1024).toFixed(1);
  const vramTotalGB = ((node.vramTotalMb || 0) / 1024).toFixed(1);

  return (
    <div style={{
      background: '#fff', borderRadius: 8, padding: 20,
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)', minWidth: 280,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 16 }}>{node.name}</h3>
        <StatusBadge status={node.status} type="node" />
      </div>
      <div style={{ fontSize: 13, color: '#666', lineHeight: 2 }}>
        <div>型号: {node.gpuModel}</div>
        <div>GPU: {node.gpuCount} 卡 | 显存: {vramTotalGB} GB</div>
        <div>IP: {node.publicIp}:{node.apiPort}</div>
        <div>活跃任务: {resources.activeTasks}</div>
      </div>
      <div style={{ marginTop: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
          <span>GPU 利用率</span><span>{resources.gpuUtilization}%</span>
        </div>
        <div style={{ background: '#f0f0f0', borderRadius: 4, height: 6, marginTop: 4 }}>
          <div style={{
            width: `${resources.gpuUtilization}%`, height: 6, borderRadius: 4,
            background: resources.gpuUtilization > 80 ? '#ff4d4f' : '#52c41a',
          }} />
        </div>
        <div style={{ marginTop: 8, fontSize: 12, color: '#888' }}>
          温度: {resources.gpuTemp}°C | 显存: {vramUsedGB}/{vramTotalGB} GB
        </div>
      </div>
    </div>
  );
}
