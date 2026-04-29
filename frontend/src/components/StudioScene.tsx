import { useState, useEffect } from 'react';
import './StudioScene.css';
import PixelWorker from './PixelWorker';
import type { NodeItem } from '../types';

type Props = {
  nodes: NodeItem[];
  pendingTasks: number;
  queuedTasks: number;
  runningTasks: number;
  onNodeClick?: (node: NodeItem) => void;
};

type Pkg = { id: number; phase: 'to-station' | 'to-node'; targetIdx: number; x: number; y: number };

export default function StudioScene({ nodes, pendingTasks, queuedTasks, runningTasks, onNodeClick }: Props) {
  const [pkgs, setPkgs] = useState<Pkg[]>([]);

  const hasActivity = (pendingTasks + queuedTasks + runningTasks) > 0;
  const onlineNodes = nodes.filter(n => n.status === 'ONLINE');

  // 仅在有待处理/排队/运行中任务时生成包裹
  useEffect(() => {
    if (pendingTasks <= 0 || onlineNodes.length === 0) {
      setPkgs([]); // 无任务时清空包裹
      return;
    }

    const interval = setInterval(() => {
      const target = Math.floor(Math.random() * onlineNodes.length);
      const p: Pkg = { id: Date.now(), phase: 'to-station', targetIdx: target, x: 12, y: 40 };
      setPkgs(prev => [...prev.slice(-8), p]);

      setTimeout(() => {
        setPkgs(prev => prev.map(x => x.id === p.id ? { ...x, phase: 'to-node' as const, x: 82 + target * 10, y: 68 } : x));
        setTimeout(() => setPkgs(prev => prev.filter(x => x.id !== p.id)), 3000);
      }, 1800);
    }, 4000 + pendingTasks * 500);

    return () => clearInterval(interval);
  }, [pendingTasks, onlineNodes.length]);

  const getState = (n: NodeItem) => {
    if (n.status === 'OFFLINE') return 'sleeping' as const;
    if (n.status === 'ERROR') return 'error' as const;
    if ((n.resources?.activeTasks || 0) > 0) return 'working' as const;
    return 'idle' as const;
  };
  const isWorking = (n: NodeItem) => (n.resources?.activeTasks || 0) > 0;

  return (
    <div className="studio">
      <div className="studio-grid" />
      <div className="studio-floor" />

      {/* 标题栏 */}
      <div style={{ position: 'absolute', top: 10, left: 14, zIndex: 20, font: '9px var(--font-pixel)', color: '#5a4a8a' }}>
        🏭 STUDIO SIMULATION
      </div>
      <div style={{ position: 'absolute', top: 10, right: 14, zIndex: 20, display: 'flex', gap: 10, font: '7px var(--font-pixel)', color: 'var(--c-dim)' }}>
        <span>NODES: {nodes.length}</span>
        <span style={{ color: 'var(--c-green)' }}>ON: {onlineNodes.length}</span>
        <span style={{ color: 'var(--c-orange)' }}>BUSY: {nodes.filter(isWorking).length}</span>
      </div>

      <div style={{ position: 'relative', height: 320 }}>

        {/* 投递工人 */}
        <div className="client-area">
          <PixelWorker state={hasActivity ? 'working' : 'idle'} size="medium" />
          <div style={{ font: '6px var(--font-pixel)', color: 'var(--c-dim)', marginTop: -4 }}>
            CLIENT
          </div>
        </div>

        {/* 中转站 */}
        <div className="station">
          <div className={`station-body ${hasActivity ? 'active' : ''}`}>
            <div className="station-roof" />
            <div className="station-door" />
          </div>
          <div className="station-label">TRANSFER</div>
        </div>

        {/* 传送带 — 仅活跃时移动 */}
        <div className="conveyor-wrap">
          <div className={`conveyor-belt ${hasActivity ? 'moving' : ''}`} />
          {hasActivity && <div className="conveyor-arrow">▸▸▸</div>}
        </div>

        {/* 飞行包裹 — 仅当有待处理任务 */}
        {pkgs.map(p => (
          <div key={p.id} className="flying-pkg"
            style={{ left: `${p.x}%`, top: `${p.y}%` }}>
            📦
          </div>
        ))}

        {/* 节点工作台 */}
        <div className="nodes-row">
          {nodes.map((node) => (
            <div key={node.nodeId} className="node-station"
              onClick={() => onNodeClick?.(node)}>
              <div className={`node-box ${isWorking(node) ? 'working' : ''} ${node.status === 'OFFLINE' ? 'offline' : ''} ${node.status === 'ERROR' ? 'error' : ''}`}>
                <div className={`node-dot ${isWorking(node) ? 'busy' : node.status === 'ONLINE' ? 'online' : 'offline'}`} />
                <PixelWorker state={getState(node)} size="small" />
              </div>
              <div className={`node-screen ${node.status === 'OFFLINE' ? 'offline' : node.status === 'ERROR' ? 'error' : ''}`}>
                {node.status === 'ONLINE' ? (isWorking(node) ? 'BUSY' : 'IDLE') : node.status}
              </div>
              <div className="node-name">{node.name || 'NODE'}</div>
              {isWorking(node) && <div className="node-tasks">x{node.resources?.activeTasks}</div>}
            </div>
          ))}
        </div>

        {/* 空状态 */}
        {nodes.length === 0 && (
          <div className="empty-state">
            <div style={{ fontSize: 40, marginBottom: 8 }}>?</div>
            <div style={{ font: '9px var(--font-pixel)', color: 'var(--c-dim)' }}>NO WORKERS</div>
            <div style={{ fontSize: 8, color: 'var(--c-muted)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
              register a GPU node
            </div>
          </div>
        )}
      </div>

      {/* 底部图例 */}
      {nodes.length > 0 && (
        <div style={{
          display: 'flex', gap: 14, justifyContent: 'center',
          padding: '10px 0 0', borderTop: '2px dashed var(--c-border)',
          font: '7px var(--font-mono)', color: 'var(--c-dim)',
        }}>
          <span>ONLINE</span>
          <span>BUSY</span>
          <span>OFFLINE</span>
          {hasActivity && <span>IN TRANSIT: {pkgs.length}</span>}
          {!hasActivity && <span style={{ color: 'var(--c-muted)' }}>IDLE - NO PENDING TASKS</span>}
        </div>
      )}
    </div>
  );
}
