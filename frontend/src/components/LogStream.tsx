import { useState, useEffect, useRef } from 'react';
import { fetchTaskLogsTail } from '../services/api';

type Props = { taskId: string; autoRefresh?: boolean };

export default function LogStream({ taskId, autoRefresh = true }: Props) {
  const [logs, setLogs] = useState('');
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchTaskLogsTail(taskId, 200);
        setLogs(data.logs || '[ NO LOGS YET ]');
      } catch {
        setLogs('[ LOG LOAD FAILED ]');
      } finally {
        setLoading(false);
      }
    };
    load();
    if (autoRefresh) {
      const timer = setInterval(load, 5000);
      return () => clearInterval(timer);
    }
  }, [taskId, autoRefresh]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  if (loading) return (
    <div style={{ color: '#ffe600', fontFamily: "'Press Start 2P', monospace", fontSize: 8 }}>
      ▸ LOADING LOGS...
    </div>
  );

  return (
    <div style={{
      border: '3px solid #2a2a50',
      boxShadow: '4px 4px 0 rgba(0,0,0,0.6), inset 0 0 30px rgba(0,240,255,0.03)',
      position: 'relative',
    }}>
      {/* 终端标题栏 */}
      <div style={{
        background: '#0d0d1f', padding: '6px 12px',
        borderBottom: '2px solid #2a2a50',
        display: 'flex', alignItems: 'center', gap: 8,
        fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: '#666',
      }}>
        <span style={{ color: '#ff2d78' }}>●</span>
        <span style={{ color: '#ffe600' }}>●</span>
        <span style={{ color: '#39ff14' }}>●</span>
        <span style={{ marginLeft: 8 }}>training.log</span>
        <span style={{ marginLeft: 'auto', color: '#39ff14' }}>
          {autoRefresh ? 'LIVE' : 'STATIC'}
        </span>
      </div>
      {/* 日志内容 */}
      <div ref={containerRef} style={{
        background: '#08081a',
        color: '#a8e8a8',
        padding: '12px 16px',
        fontFamily: "'Courier New', monospace",
        fontSize: 11,
        maxHeight: 400,
        overflow: 'auto',
        whiteSpace: 'pre-wrap',
        lineHeight: 1.5,
        textShadow: '0 0 2px rgba(168,232,168,0.3)',
      }}>
        {logs.split('\n').map((line, i) => (
          <div key={i} style={{
            color: line.startsWith('PROGRESS:') ? '#ffe600' :
                   line.startsWith('METRICS:') ? '#b44dff' :
                   line.startsWith('#') ? '#555' :
                   line.includes('Done') || line.includes('complete') ? '#39ff14' :
                   line.includes('Error') || line.includes('FAIL') ? '#ff2d78' :
                   '#a8e8a8',
          }}>
            {line || ' '}
          </div>
        ))}
        {autoRefresh && (
          <div style={{ color: '#39ff14', marginTop: 4 }}>
            <span style={{ animation: 'neonFlicker 2s infinite' }}>▌</span>
          </div>
        )}
      </div>
    </div>
  );
}
