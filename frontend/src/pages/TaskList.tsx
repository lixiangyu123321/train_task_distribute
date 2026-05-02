import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { fetchTasks, batchCancelTasks, batchRetryTasks } from '../services/api';
import { showToast } from '../services/toast';
import { subscribe } from '../services/ws';
import StatusBadge from '../components/StatusBadge';
import { SkeletonTable } from '../components/Skeleton';
import type { TaskStatus } from '../types';

export default function TaskList() {
  const [sp] = useSearchParams();
  const [status, setStatus] = useState(sp.get('status') || '');
  const [page, setPage] = useState(1);
  const nav = useNavigate();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { data, loading, refresh } = useApi(() => fetchTasks(status || undefined, page), 15000, [status, page]);

  /* WS status change → refresh immediately */
  useEffect(() => subscribe('TASK_STATUS_CHANGE', () => refresh()), [refresh]);

  if (loading && !data) return <SkeletonTable rows={8} />;

  const items = (data as Record<string,unknown>)?.items as Record<string,unknown>[] || [];
  const total = (data as Record<string,unknown>)?.total as number || 0;
  const pages = Math.ceil(total / 20);
  const opts = ['', 'PENDING', 'DISPATCHING', 'QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'];

  return (
    <div>
      <h2>◇ TASKS</h2>
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
              <th style={{ width: 30 }}>
                <input type="checkbox"
                  checked={items.length > 0 && selectedIds.size === items.length}
                  onChange={e => {
                    if (e.target.checked) setSelectedIds(new Set(items.map((t: Record<string,unknown>) => t.taskId as string)));
                    else setSelectedIds(new Set());
                  }}
                  style={{ accentColor: 'var(--cyan)' }}
                />
              </th>
              <th style={{ padding: '10px 12px' }}>ID</th><th>NAME</th><th>TYPE</th><th>STATUS</th><th>CREATED</th>
            </tr>
          </thead>
          <tbody>
            {items.map((t: Record<string,unknown>) => (
              <tr key={t.taskId as string} onClick={() => nav(`/tasks/${t.taskId}`)}
                style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', font: '9px var(--font-mono)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = ''; }}>
                <td>
                  <input type="checkbox"
                    checked={selectedIds.has(t.taskId as string)}
                    onChange={e => {
                      const next = new Set(selectedIds);
                      if (e.target.checked) next.add(t.taskId as string);
                      else next.delete(t.taskId as string);
                      setSelectedIds(next);
                    }}
                    onClick={e => e.stopPropagation()}
                    style={{ accentColor: 'var(--cyan)' }}
                  />
                </td>
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
      {selectedIds.size > 0 && (
        <div style={{
          position: 'fixed', bottom: 0, left: 210, right: 0,
          background: 'var(--bg-panel)', borderTop: '3px solid var(--border)',
          padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 10, zIndex: 100,
        }}>
          <span style={{ font: '7px var(--font-pixel)', color: 'var(--dim)' }}>
            {selectedIds.size} SELECTED
          </span>
          <button className="btn red" style={{ fontSize: 7 }} onClick={async () => {
            await batchCancelTasks([...selectedIds]);
            showToast('success', `${selectedIds.size} TASKS CANCELLED`);
            setSelectedIds(new Set());
            refresh();
          }}>CANCEL SELECTED</button>
          <button className="btn cyan" style={{ fontSize: 7 }} onClick={async () => {
            await batchRetryTasks([...selectedIds]);
            showToast('success', 'RETRY SUBMITTED');
            setSelectedIds(new Set());
            refresh();
          }}>RETRY SELECTED</button>
        </div>
      )}
    </div>
  );
}
