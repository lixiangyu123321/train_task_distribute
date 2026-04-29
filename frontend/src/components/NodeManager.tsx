import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { fetchNodes } from '../services/api';
import StatusBadge from './StatusBadge';
import PixelWorker from './PixelWorker';
import type { NodeItem } from '../types';

export default function NodeManager() {
  const { data: nodes, loading, refresh } = useApi(fetchNodes, 5000);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '', publicIp: '', apiPort: '9000',
    gpuModel: '', gpuCount: '1', vramTotalMb: '0',
  });
  const [msg, setMsg] = useState('');

  const handleRegister = async () => {
    if (!form.name || !form.publicIp) { setMsg('Name and IP required!'); return; }
    setMsg('');
    try {
      const resp = await fetch('/api/v1/nodes/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name, publicIp: form.publicIp,
          apiPort: parseInt(form.apiPort), gpuModel: form.gpuModel,
          gpuCount: parseInt(form.gpuCount), vramTotalMb: parseInt(form.vramTotalMb),
        }),
      });
      const d = await resp.json();
      if (d.code === 200) {
        setMsg('Node registered!');
        setShowForm(false);
        refresh();
      } else {
        setMsg('Failed: ' + d.message);
      }
    } catch (e) { setMsg('Error: ' + (e as Error).message); }
  };

  const handleHeartbeat = async (nodeId: string) => {
    try {
      await fetch('/api/v1/nodes/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId, resources: { gpuUtilization: 0, memoryUtilization: 0, vramUsedMb: 0, activeTasks: 0, gpuTemp: 0 } }),
      });
      refresh();
    } catch {}
  };

  const getWorkerState = (n: NodeItem) => {
    if (n.status === 'OFFLINE') return 'sleeping' as const;
    if (n.status === 'ERROR') return 'error' as const;
    if ((n.resources?.activeTasks || 0) > 0) return 'working' as const;
    return 'idle' as const;
  };

  const F = ({ label, value, onChange, placeholder = '', type = 'text' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) => (
    <div style={{ marginBottom: 10 }}>
      <label style={{ display: 'block', fontSize: 7, color: '#8a7aaa', fontFamily: "'Press Start 2P', monospace", marginBottom: 3 }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', padding: '8px 10px', fontSize: 11 }} />
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ marginBottom: 4 }}>🖥️ NODE MANAGE</h2>
          <div className="pixel-divider" />
        </div>
        <button className="pixel-btn" onClick={() => setShowForm(!showForm)} style={{ fontSize: 8 }}>
          {showForm ? '✕ CANCEL' : '+ ADD NODE'}
        </button>
      </div>

      {msg && (
        <div style={{
          marginBottom: 14, padding: '8px 14px', borderRadius: 4,
          background: msg.includes('Error') || msg.includes('Failed') ? '#ffebee' : '#e8f5e9',
          border: `2px solid ${msg.includes('Error') || msg.includes('Failed') ? '#ff8a80' : '#8cd790'}`,
          fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: '#333',
        }}>
          {msg}
        </div>
      )}

      {/* 新增表单 */}
      {showForm && (
        <div className="pixel-card" style={{ padding: 16, marginBottom: 16 }}>
          <h4 style={{ marginBottom: 12 }}>▸ REGISTER NEW NODE</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
            <F label="NODE NAME *" value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} placeholder="gpu-worker-01" />
            <F label="PUBLIC IP *" value={form.publicIp} onChange={v => setForm(p => ({ ...p, publicIp: v }))} placeholder="1.2.3.4" />
            <F label="API PORT" value={form.apiPort} onChange={v => setForm(p => ({ ...p, apiPort: v }))} type="number" />
            <F label="GPU MODEL" value={form.gpuModel} onChange={v => setForm(p => ({ ...p, gpuModel: v }))} placeholder="RTX 4090" />
            <F label="GPU COUNT" value={form.gpuCount} onChange={v => setForm(p => ({ ...p, gpuCount: v }))} type="number" />
            <F label="VRAM (MB)" value={form.vramTotalMb} onChange={v => setForm(p => ({ ...p, vramTotalMb: v }))} type="number" />
          </div>
          <button className="pixel-btn green" onClick={handleRegister} style={{ width: '100%', marginTop: 10, fontSize: 8 }}>
            REGISTER NODE
          </button>
        </div>
      )}

      {/* 节点列表 */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#b0a0c0', fontFamily: "'Press Start 2P', monospace", fontSize: 8 }}>LOADING...</div>
      ) : (
        <div className="pixel-card" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%' }}>
            <thead>
              <tr style={{ background: '#fdfaf5', fontFamily: "'Press Start 2P', monospace", fontSize: 7, textAlign: 'left', color: '#8a7aaa', borderBottom: '2px solid #e0d6c8' }}>
                <th style={{ padding: '10px 12px' }}>WORKER</th>
                <th>STATUS</th>
                <th>GPU</th>
                <th>LOAD</th>
                <th>IP</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {(nodes || []).map((node: NodeItem) => {
                const isWorking = (node.resources?.activeTasks || 0) > 0;
                return (
                  <tr key={node.nodeId} style={{ borderBottom: '1px solid #f0e8d8' }}>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <PixelWorker state={getWorkerState(node)} size="small" />
                        <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: '#5a4a8a' }}>{(node.name || '').substring(0, 12)}</span>
                      </div>
                    </td>
                    <td><StatusBadge status={node.status} /></td>
                    <td style={{ fontSize: 10, fontFamily: 'monospace', color: '#8a7aaa' }}>{node.gpuModel || '-'}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 50, height: 8, background: '#f0e8d8', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ width: `${node.resources?.gpuUtilization || 0}%`, height: '100%', background: isWorking ? '#ffa726' : '#8cd790', borderRadius: 2, transition: 'width 0.3s' }} />
                        </div>
                        <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#8a7aaa' }}>{node.resources?.gpuUtilization || 0}%</span>
                      </div>
                    </td>
                    <td style={{ fontSize: 10, fontFamily: 'monospace', color: '#b0a0c0' }}>{node.publicIp}:{node.apiPort}</td>
                    <td style={{ padding: '10px 8px' }}>
                      <button
                        onClick={() => handleHeartbeat(node.nodeId)}
                        className="pixel-btn"
                        style={{ fontSize: 6, padding: '4px 10px', background: '#7ec8e3', boxShadow: '2px 2px 0 #5a9ab8' }}>
                        PING
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
