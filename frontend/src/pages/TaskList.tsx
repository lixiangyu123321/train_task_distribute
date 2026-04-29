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
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ marginBottom: 6 }}>TASK LIST</h2>
        <div className="pixel-divider" />
      </div>

      {/* 筛选按钮 */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {statusOptions.map(s => (
          <button key={s} onClick={() => { setStatus(s); setPage(1); }}
            style={{
              fontFamily: "'Press Start 2P', monospace", fontSize: 8,
              padding: '8px 14px',
              border: `2px solid ${status === s ? '#b44dff' : '#2a2a50'}`,
              background: status === s ? 'rgba(180,77,255,0.15)' : '#111',
              color: status === s ? '#b44dff' : '#6666aa',
              boxShadow: status === s ? '0 0 10px rgba(180,77,255,0.3)' : 'none',
              cursor: 'pointer',
              textShadow: status === s ? '0 0 4px #b44dff' : 'none',
            }}>
            {s || 'ALL'}
          </button>
        ))}
      </div>

      {loading && !items.length ? (
        <div style={{ color: '#00f0ff', fontFamily: "'Press Start 2P', monospace", fontSize: 10 }}>
          LOADING<span className="neon-text">...</span>
        </div>
      ) : (
        <div className="pixel-card" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%' }}>
            <thead>
              <tr style={{
                background: '#0d0d1f', fontFamily: "'Press Start 2P', monospace", fontSize: 8,
                textAlign: 'left', color: '#b44dff',
                borderBottom: '2px solid #2a2a50',
                textShadow: '0 0 4px #b44dff44',
              }}>
                <th style={{ padding: '12px 14px' }}>ID</th>
                <th>NAME</th>
                <th>TYPE</th>
                <th>STATUS</th>
                <th>NODE</th>
                <th>CREATED</th>
              </tr>
            </thead>
            <tbody>
              {items.map((task: Record<string,unknown>) => (
                <tr key={task.taskId as string}
                  onClick={() => navigate(`/tasks/${task.taskId}`)}
                  style={{
                    borderBottom: '1px solid #1a1a30', cursor: 'pointer',
                    fontSize: 11, fontFamily: 'monospace',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(180,77,255,0.06)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '10px 14px', color: '#6666aa', fontSize: 10 }}>
                    {(task.taskId as string)?.substring(0, 10)}..
                  </td>
                  <td style={{ color: '#e0e0f0', fontWeight: 600 }}>{task.name as string}</td>
                  <td style={{ color: '#b44dff' }}>{task.type as string}</td>
                  <td><StatusBadge status={task.status as TaskStatus} /></td>
                  <td style={{ color: '#888', fontSize: 10 }}>
                    {(task.nodeId as string)?.substring(0, 8) || '-'}
                  </td>
                  <td style={{ color: '#555', fontSize: 10 }}>
                    {(task.createdAt as string)?.substring(0, 19)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 分页 */}
      {totalPages > 1 && (
        <div style={{ marginTop: 20, display: 'flex', gap: 12, justifyContent: 'center', alignItems: 'center' }}>
          <button
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
            className="pixel-btn"
            style={{ opacity: page <= 1 ? 0.4 : 1, fontSize: 8 }}>
            ◀ PREV
          </button>
          <span style={{
            fontFamily: "'Press Start 2P', monospace", fontSize: 9, color: '#b44dff',
          }}>
            {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
            className="pixel-btn"
            style={{ opacity: page >= totalPages ? 0.4 : 1, fontSize: 8 }}>
            NEXT ▶
          </button>
        </div>
      )}
    </div>
  );
}
