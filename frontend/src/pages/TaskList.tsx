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
  const items = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>任务列表</h2>

      <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
        {statusOptions.map(s => (
          <button key={s} onClick={() => { setStatus(s); setPage(1); }}
            style={{
              padding: '4px 16px', border: '1px solid #d9d9d9', borderRadius: 4,
              background: status === s ? '#1677ff' : '#fff',
              color: status === s ? '#fff' : '#333', cursor: 'pointer',
            }}>
            {s || '全部'}
          </button>
        ))}
      </div>

      {loading && !items.length ? <div>加载中...</div> : (
        <table style={{ width: '100%', background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <thead>
            <tr style={{ background: '#fafafa', textAlign: 'left' }}>
              <th style={{ padding: '12px 16px' }}>任务 ID</th>
              <th>名称</th>
              <th>类型</th>
              <th>状态</th>
              <th>节点</th>
              <th>创建时间</th>
            </tr>
          </thead>
          <tbody>
            {items.map((task: Record<string, unknown>) => (
              <tr key={task.taskId as string}
                style={{ borderTop: '1px solid #f0f0f0', cursor: 'pointer' }}
                onClick={() => navigate(`/tasks/${task.taskId}`)}>
                <td style={{ padding: '10px 16px', fontFamily: 'monospace', fontSize: 13 }}>
                  {(task.taskId as string)?.substring(0, 12)}...
                </td>
                <td style={{ fontWeight: 500 }}>{task.name as string}</td>
                <td>{task.type as string}</td>
                <td><StatusBadge status={task.status as TaskStatus} /></td>
                <td style={{ fontFamily: 'monospace', fontSize: 12 }}>
                  {(task.nodeId as string) || '-'}
                </td>
                <td style={{ fontSize: 13, color: '#888' }}>
                  {(task.createdAt as string)?.substring(0, 19)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {totalPages > 1 && (
        <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</button>
          <span style={{ lineHeight: '32px' }}>第 {page} / {totalPages} 页</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>下一页</button>
        </div>
      )}
    </div>
  );
}
