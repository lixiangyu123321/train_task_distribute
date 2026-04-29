import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { fetchTasks } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import type { TaskStatus } from '../types';

export default function TaskList() {
  const [sp] = useSearchParams();
  const [status, setStatus] = useState(sp.get('status') || '');
  const [page, setPage] = useState(1);
  const nav = useNavigate();
  const { data, loading } = useApi(() => fetchTasks(status || undefined, page), 3000);
  const items = (data as Record<string,unknown>)?.items as Record<string,unknown>[] || [];
  const total = (data as Record<string,unknown>)?.total as number || 0;
  const pages = Math.ceil(total / 20);
  const opts = ['', 'PENDING', 'QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'];

  return (
    <div>
      <h2>◇ MISSIONS</h2>
      <div className="divider" />
      <div style={{ display: 'flex', gap: 4, margin: '12px 0', flexWrap: 'wrap' }}>
        {opts.map(s => {
          const a = status === s;
          return (
            <button key={s} onClick={() => { setStatus(s); setPage(1); }} style={{
              font: '6px var(--font-pixel)', padding: '6px 10px', cursor: 'pointer',
              border: `2px solid ${a ? 'var(--cyan)' : 'var(--border)'}`,
              background: a ? 'rgba(64,216,240,0.1)' : 'var(--bg-panel)',
              color: a ? 'var(--cyan)' : 'var(--dim)',
            }}>{s || 'ALL'}</button>
          );
        })}
      </div>
      <div className="panel" style={{ overflow: 'hidden' }}>
        <table>
          <thead>
            <tr style={{ font: '6px var(--font-pixel)', color: 'var(--cyan)', textAlign: 'left', borderBottom: '2px solid var(--border)' }}>
              <th style={{ padding: '10px 12px' }}>ID</th><th>NAME</th><th>TYPE</th><th>STATUS</th><th>CREATED</th>
            </tr>
          </thead>
          <tbody>
            {items.map((t: Record<string,unknown>) => (
              <tr key={t.taskId as string} onClick={() => nav(`/tasks/${t.taskId}`)}
                style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', font: '9px var(--font-mono)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = ''; }}>
                <td style={{ padding: '9px 12px', color: 'var(--muted)', fontSize: 9 }}>{(t.taskId as string)?.substring(0, 10)}..</td>
                <td style={{ color: 'var(--white)' }}>{t.name as string}</td>
                <td style={{ color: 'var(--purple)' }}>{t.type as string}</td>
                <td><StatusBadge status={t.status as TaskStatus} /></td>
                <td style={{ color: 'var(--muted)', fontSize: 9 }}>{(t.createdAt as string)?.substring(0, 19)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 14, alignItems: 'center' }}>
          <button className="btn sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>◀</button>
          <span style={{ font: '7px var(--font-pixel)', color: 'var(--cyan)' }}>{page}/{pages}</span>
          <button className="btn sm" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>▶</button>
        </div>
      )}
    </div>
  );
}
