import { useState, useEffect, useCallback } from 'react';
import './StudioScene.css';
import PixelWorker from './PixelWorker';
import type { NodeItem } from '../types';

type Props = {
  nodes: NodeItem[];
  onNodeClick?: (node: NodeItem) => void;
};

type FlyingPackage = {
  id: number;
  fromX: number; fromY: number;
  toX: number; toY: number;
  nodeIdx: number;
  phase: 'to-station' | 'to-node';
};

export default function StudioScene({ nodes, onNodeClick }: Props) {
  const [packages, setPackages] = useState<FlyingPackage[]>([]);
  const [pkgCounter, setPkgCounter] = useState(0);
  const [hoveredNode, setHoveredNode] = useState<number | null>(null);

  // 周期性生成包裹
  useEffect(() => {
    if (nodes.length === 0) return;
    const onlineNodes = nodes.filter(n => n.status === 'ONLINE');
    if (onlineNodes.length === 0) return;

    const interval = setInterval(() => {
      setPkgCounter(c => c + 1);
      const target = Math.floor(Math.random() * nodes.length);
      const pkg: FlyingPackage = {
        id: Date.now(),
        fromX: 5, fromY: 55,
        toX: 50 + target * 25, toY: 75,
        nodeIdx: target,
        phase: 'to-station',
      };
      setPackages(prev => [...prev.slice(-6), pkg]);

      // 2s 后切换到第二阶段
      setTimeout(() => {
        setPackages(prev => prev.map(p => p.id === pkg.id ? { ...p, phase: 'to-node' } : p));
        // 3s 后移除包裹
        setTimeout(() => {
          setPackages(prev => prev.filter(p => p.id !== pkg.id));
        }, 3000);
      }, 2000);
    }, 4000);

    return () => clearInterval(interval);
  }, [nodes]);

  const getNodeState = (node: NodeItem) => {
    if (node.status === 'OFFLINE') return 'sleeping' as const;
    if (node.status === 'ERROR') return 'error' as const;
    if ((node.resources?.activeTasks || 0) > 0) return 'working' as const;
    return 'idle' as const;
  };

  const isWorking = (n: NodeItem) => (n.resources?.activeTasks || 0) > 0;
  const hasPending = (nodes || []).some(n => n.status === 'ONLINE');
  const busyNodes = nodes.filter(n => isWorking(n)).length;

  return (
    <div className="studio-scene" style={{ position: 'relative', padding: 20 }}>
      {/* 场景标题 */}
      <div style={{
        position: 'absolute', top: 10, left: 14,
        fontFamily: "'Press Start 2P', monospace", fontSize: 9, color: '#5a4a8a',
        zIndex: 20,
      }}>
        🏭 STUDIO SIMULATION
      </div>

      {/* 顶部状态栏 */}
      <div style={{
        position: 'absolute', top: 8, right: 14,
        display: 'flex', gap: 10, alignItems: 'center',
        fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: '#8a7aaa',
        zIndex: 20,
      }}>
        <span>NODES: {nodes.length}</span>
        <span style={{ color: '#8cd790' }}>ON: {nodes.filter(n => n.status === 'ONLINE').length}</span>
        <span style={{ color: '#ffa726' }}>BUSY: {busyNodes}</span>
      </div>

      {/* ====== 场景主体 ====== */}
      <div style={{ position: 'relative', height: 340, marginTop: 10 }}>

        {/* --- 左侧: 投递工人 --- */}
        <div className="scene-worker" style={{ left: 10, top: '15%' }}>
          <PixelWorker state={hasPending ? 'working' : 'idle'} size="medium" name="CLIENT" />
          <div style={{
            fontFamily: "'Press Start 2P', monospace", fontSize: 5, color: '#8a7aaa',
            textAlign: 'center', marginTop: -6,
          }}>
            📦 PACK
          </div>
        </div>

        {/* --- 中间: 中转站 --- */}
        <div className="transfer-station">
          <div className={`station-building ${hasPending ? 'active' : ''}`}>
            <div className="station-roof" />
            <div className="station-door" />
          </div>
          <div className="station-sign">TRANSFER</div>
        </div>

        {/* --- 包裹飞行 --- */}
        {packages.map(pkg => (
          <div
            key={pkg.id}
            className="package"
            style={{
              left: pkg.phase === 'to-station' ? '80px' : `${Math.min(45 + pkg.nodeIdx * 22, 90)}%`,
              top: pkg.phase === 'to-station' ? '30%' : '72%',
              transition: 'all 2s ease-in-out',
              animation: pkg.phase === 'to-node' ? 'packageBounce 0.5s ease-in-out infinite' : 'none',
            }}
          >
            📦
          </div>
        ))}

        {/* --- 传送带 (中转站到各节点) --- */}
        {nodes.length > 0 && (
          <div className="conveyor" style={{
            left: '18%', right: '5%', top: '68%',
          }}>
            <div className={`conveyor-belt ${hasPending ? 'moving' : ''}`}
              style={{ height: 16, borderRadius: 6 }} />
            <div style={{
              position: 'absolute', left: -14, top: -2,
              fontFamily: "'Press Start 2P', monospace", fontSize: 5, color: '#8d6e63',
            }}>
              ▸▸
            </div>
          </div>
        )}

        {/* --- 右侧: 节点工作站 --- */}
        <div style={{
          position: 'absolute', right: 4, top: '10%',
          display: 'flex', flexDirection: 'row', gap: 16,
        }}>
          {nodes.map((node, idx) => (
            <div
              key={node.nodeId}
              className="node-workstation"
              onClick={() => onNodeClick?.(node)}
              onMouseEnter={() => setHoveredNode(idx)}
              onMouseLeave={() => setHoveredNode(null)}
              style={{ cursor: 'pointer' }}
            >
              <div className={`node-machine ${isWorking(node) ? 'working' : ''} ${node.status === 'OFFLINE' ? 'offline' : ''} ${node.status === 'ERROR' ? 'error' : ''}`}>
                <div className={`node-indicator ${isWorking(node) ? 'busy' : node.status === 'ONLINE' ? 'online' : 'offline'}`} />
                <PixelWorker state={getNodeState(node)} size="small" name="" />
              </div>
              <div className={`node-screen ${node.status === 'OFFLINE' ? 'offline' : node.status === 'ERROR' ? 'error' : ''}`}>
                {node.status === 'ONLINE' ? `${isWorking(node) ? 'BUSY' : 'IDLE'}` : node.status}
              </div>
              <div className="node-label">
                {(node.name || 'NODE').substring(0, 8)}
              </div>
              {/* 活跃任务数 */}
              {isWorking(node) && (
                <div style={{
                  fontFamily: "'Press Start 2P', monospace", fontSize: 6,
                  color: '#ffa726', marginTop: 2,
                }}>
                  ×{(node.resources?.activeTasks || 0)}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 空状态 */}
        {nodes.length === 0 && (
          <div style={{
            position: 'absolute', top: '65%', right: '10%',
            textAlign: 'center', color: '#b0a0c0',
            fontFamily: "'Press Start 2P', monospace", fontSize: 8,
          }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🖥️</div>
            NO WORKERS<br/>
            <span style={{ fontSize: 6, color: '#ccc' }}>register a GPU node to start</span>
          </div>
        )}

        {/* 悬浮提示 */}
        {hoveredNode !== null && nodes[hoveredNode] && (
          <div className="studio-tooltip" style={{
            top: '50%', right: 10 + hoveredNode * 90,
          }}>
            {nodes[hoveredNode].name}<br/>
            GPU: {(nodes[hoveredNode].resources?.gpuUtilization || 0)}% |
            TEMP: {nodes[hoveredNode].resources?.gpuTemp || '-'}°C
          </div>
        )}
      </div>

      {/* 底部图例 */}
      <div style={{
        display: 'flex', gap: 16, justifyContent: 'center',
        paddingTop: 12, borderTop: '2px dashed #e0d6c8',
        fontFamily: 'monospace', fontSize: 9, color: '#8a7aaa',
      }}>
        <span>🟢 ONLINE</span>
        <span>🟡 BUSY</span>
        <span>⚫ OFFLINE</span>
        <span>🔴 ERROR</span>
        <span>📦 PACKAGE IN TRANSIT: {packages.length}</span>
      </div>
    </div>
  );
}
