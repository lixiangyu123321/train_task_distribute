import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { fetchTasks } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import type { TaskStatus } from '../types';

export default function TaskList() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [page, setPage] = useState(1);
  const navigate = useNavigate();
  const { data, loading } = useApi(() => fetchTasks(status || undefined, page), 3000);

  const statusOptions = ['', 'PENDING', 'QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'];
  const items = (data as Record<string,unknown>)?.items as Record<string,unknown>[] || [];
  const total = (data as Record<string,unknown>)?.total as number || 0;
  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ marginBottom: 4 }}>📋 TASK LIST</h2>
        <div className="pixel-divider" />
      </div>

      {/* 筛选 */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
        {statusOptions.map(s => {
          const active = status === s;
          return (
            <button key={s} onClick={() => { setStatus(s); setPage(1); }}
              style={{
                fontFamily: "'Press Start 2P', monospace", fontSize: 7,
                padding: '7px 12px', borderRadius: 4,
                border: `2px solid ${active ? '#b8a0e8' : '#e0d6c8'}`,
                background: active ? '#f5f0ff' : '#fff',
                color: active ? '#5a4a8a' : '#b0a0c0',
              }}>
              {s || '✨ ALL'}
            </button>
          );
        })}
      </div>

      {loading && !items.length ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#b0a0c0', fontFamily: "'Press Start 2P', monospace", fontSize: 9 }}>
          LOADING...
        </div>
      ) : (
        <div className="pixel-card" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%' }}>
            <thead>
              <tr style={{
                background: '#fdfaf5', fontFamily: "'Press Start 2P', monospace",
                fontSize: 8, textAlign: 'left', color: '#8a7aaa',
                borderBottom: '2px solid #e0d6c8',
              }}>
                <th style={{ padding: '12px 14px' }}>ID</th>
                <th>NAME</th>
                <th>TYPE</th>
                <th>STATUS</th>
                <th>CREATED</th>
              </tr>
            </thead>
            <tbody>
              {items.map((task: Record<string,unknown>) => (
                <tr key={task.taskId as string}
                  onClick={() => navigate(`/tasks/${task.taskId}`)}
                  style={{ borderBottom: '1px solid #f0e8d8', cursor: 'pointer', fontSize: 11, fontFamily: 'monospace' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#fdfaf5')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '10px 14px', color: '#b0a0c0', fontSize: 10 }}>
                    {(task.taskId as string)?.substring(0, 10)}..
                  </td>
                  <td style={{ fontWeight: 600 }}>{task.name as string}</td>
                  <td style={{ color: '#b8a0e8' }}>{task.type as string}</td>
                  <td><StatusBadge status={task.status as TaskStatus} /></td>
                  <td style={{ color: '#b0a0c0', fontSize: 10 }}>
                    {(task.createdAt as string)?.substring(0, 19)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ marginTop: 18, display: 'flex', gap: 10, justifyContent: 'center', alignItems: 'center' }}>
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
            className="pixel-btn" style={{ opacity: page <= 1 ? 0.4 : 1, fontSize: 8 }}>
            ◀ PREV
          </button>
          <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 9, color: '#b8a0e8' }}>
            {page}/{totalPages}
          </span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
            className="pixel-btn" style={{ opacity: page >= totalPages ? 0.4 : 1, fontSize: 8 }}>
            NEXT ▶
          </button>
        </div>
      )}
    </div>
  );
}
