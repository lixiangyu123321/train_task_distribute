import { useState, useEffect, useRef } from 'react';
import { subscribeTopic, publish, getConnState } from '../services/ws';
import { fetchTaskLogsTail } from '../services/api';

type Props = { taskId: string; autoRefresh?: boolean };

export default function LogStream({ taskId, autoRefresh = true }: Props) {
  const [logs, setLogs] = useState('');
  const [loading, setLoading] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  /* WebSocket log streaming (preferred) */
  useEffect(() => {
    if (!autoRefresh) return;

    const topic = `/topic/task-log-stream/${taskId}`;
    const unsub = subscribeTopic(topic, (msg: any) => {
      if (msg?.payload?.logs) {
        setLogs(msg.payload.logs);
        setLoading(false);
      }
    });

    /* tell backend we're watching this task's logs */
    publish('/app/logs/subscribe', { taskId });

    return () => {
      unsub();
      publish('/app/logs/unsubscribe', { taskId });
    };
  }, [taskId, autoRefresh]);

  /* Fallback HTTP polling (when WS disconnects or autoRefresh=false) */
  useEffect(() => {
    const load = async () => {
      if (getConnState() === 'CONNECTED' && autoRefresh) return; /* WS handles it */
      try {
        const d = await fetchTaskLogsTail(taskId, 200);
        setLogs(d.logs || '[ NO LOGS ]');
      } catch {
        if (!logs) setLogs('[ LOAD FAILED ]');
      } finally {
        setLoading(false);
      }
    };
    if (!autoRefresh || getConnState() !== 'CONNECTED') {
      load();
    }

    if (autoRefresh) {
      const t = setInterval(() => {
        if (getConnState() === 'CONNECTED') return; /* skip poll when WS active */
        load();
      }, 5000);
      return () => clearInterval(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId, autoRefresh]);

  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [logs]);

  if (loading) return <div style={{ color: 'var(--dim)', fontFamily: "'Press Start 2P', monospace", fontSize: 7 }}>LOADING LOGS...</div>;

  return (
    <div style={{ border: '2px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
      <div style={{ background: 'var(--bg-card)', padding: '6px 12px', borderBottom: '2px solid var(--border)', display: 'flex', gap: 6, alignItems: 'center', fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: 'var(--dim)' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f04050' }} />
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f0c040' }} />
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#50e060' }} />
        <span style={{ marginLeft: 6 }}>training.log</span>
        <span style={{ marginLeft: 'auto', color: 'var(--green)' }}>{autoRefresh ? '● LIVE' : 'STATIC'}</span>
      </div>
      <div ref={ref} style={{ background: 'var(--bg-deep)', color: 'var(--green)', padding: '12px 14px', fontFamily: "'Courier New', monospace", fontSize: 10, maxHeight: 350, overflow: 'auto', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
        {logs.split('\n').map((line, i) => (
          <div key={i} style={{ color: line.startsWith('PROGRESS:') ? '#f0c040' : line.startsWith('METRICS:') ? '#9060e0' : line.startsWith('#') ? '#506080' : line.includes('Done') || line.includes('complete') ? '#50e060' : line.includes('Error') || line.includes('FAIL') ? '#f04050' : '#50e060' }}>{line || ' '}</div>
        ))}
        {autoRefresh && <div style={{ color: 'var(--green)' }}>_</div>}
      </div>
    </div>
  );
}
