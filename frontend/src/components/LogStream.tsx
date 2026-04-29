import { useState, useEffect, useRef } from 'react';
import { fetchTaskLogsTail } from '../services/api';

type Props = { taskId: string; autoRefresh?: boolean };

export default function LogStream({ taskId, autoRefresh = true }: Props) {
  const [logs, setLogs] = useState('');
  const [loading, setLoading] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      try { const d = await fetchTaskLogsTail(taskId, 200); setLogs(d.logs || '[ NO LOGS ]'); }
      catch { setLogs('[ LOAD FAILED ]'); } finally { setLoading(false); }
    };
    load();
    if (autoRefresh) { const t = setInterval(load, 5000); return () => clearInterval(t); }
  }, [taskId, autoRefresh]);

  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [logs]);

  if (loading) return <div style={{ color: '#b0a0c0', fontFamily: "'Press Start 2P', monospace", fontSize: 7 }}>LOADING LOGS...</div>;

  return (
    <div style={{ border: '2px solid #e0d6c8', borderRadius: 6, overflow: 'hidden' }}>
      <div style={{ background: '#f5f0ff', padding: '6px 12px', borderBottom: '2px solid #e0d6c8', display: 'flex', gap: 6, alignItems: 'center', fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: '#8a7aaa' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff8a80' }} />
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ffd166' }} />
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#8cd790' }} />
        <span style={{ marginLeft: 6 }}>training.log</span>
        <span style={{ marginLeft: 'auto', color: '#8cd790' }}>{autoRefresh ? '● LIVE' : 'STATIC'}</span>
      </div>
      <div ref={ref} style={{ background: '#2a2538', color: '#c8e8c8', padding: '12px 14px', fontFamily: "'Courier New', monospace", fontSize: 10, maxHeight: 350, overflow: 'auto', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
        {logs.split('\n').map((line, i) => (
          <div key={i} style={{ color: line.startsWith('PROGRESS:') ? '#ffd166' : line.startsWith('METRICS:') ? '#b8a0e8' : line.startsWith('#') ? '#888' : line.includes('Done') || line.includes('complete') ? '#8cd790' : line.includes('Error') || line.includes('FAIL') ? '#ff8a80' : '#c8e8c8' }}>{line || ' '}</div>
        ))}
        {autoRefresh && <div style={{ color: '#8cd790' }}>_</div>}
      </div>
    </div>
  );
}
