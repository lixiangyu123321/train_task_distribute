import { useState, useEffect } from 'react';
import { fetchTaskLogsTail } from '../services/api';

type Props = { taskId: string; autoRefresh?: boolean };

export default function LogStream({ taskId, autoRefresh = true }: Props) {
  const [logs, setLogs] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchTaskLogsTail(taskId, 200);
        setLogs(data.logs || '(暂无日志)');
      } catch {
        setLogs('(日志加载失败)');
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

  if (loading) return <div style={{ color: '#888', fontSize: 13 }}>加载日志中...</div>;

  return (
    <div style={{
      background: '#1a1a2e', color: '#a8d8a8', borderRadius: 6,
      padding: 16, fontFamily: 'Consolas, monospace', fontSize: 12,
      maxHeight: 400, overflow: 'auto', whiteSpace: 'pre-wrap',
      lineHeight: 1.6,
    }}>
      {logs}
    </div>
  );
}
