import { useState } from 'react';
import { deleteNode, offlineNode } from '../services/api';
import StatusBadge from './StatusBadge';
import PixelWorker from './PixelWorker';
import type { NodeItem } from '../types';

type Props = {
  nodes: NodeItem[] | null;
  loading: boolean;
  refresh: () => void;
};

export default function NodeManager({ nodes, loading, refresh }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '', publicIp: '', apiPort: '9000',
    gpuModel: '', gpuCount: '1', vramTotalMb: '0',
  });
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ type: 'offline' | 'delete'; nodeId: string; nodeName: string } | null>(null);

  const handleRegister = async () => {
    if (!form.name || !form.publicIp) { setMsg('Name and IP required!'); return; }
    setMsg(''); setBusy('register');
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
    finally { setBusy(null); }
  };

  const handleHeartbeat = async (nodeId: string) => {
    setBusy(nodeId + ':ping');
    try {
      await fetch('/api/v1/nodes/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId, resources: { gpuUtilization: 0, memoryUtilization: 0, vramUsedMb: 0, activeTasks: 0, gpuTemp: 0 } }),
      });
      refresh();
    } catch {}
    finally { setBusy(null); }
  };

  const executeConfirm = async () => {
    if (!confirm) return;
    const { type, nodeId, nodeName } = confirm;
    setConfirm(null);
    setBusy(nodeId + ':' + type);
    try {
      if (type === 'offline') {
        await offlineNode(nodeId);
        setMsg(`Node "${nodeName}" set offline`);
      } else {
        await deleteNode(nodeId);
        setMsg(`Node "${nodeName}" deleted`);
      }
      refresh();
    } catch (e) {
      setMsg(`${type === 'offline' ? 'Offline' : 'Delete'} failed: ` + (e as Error).message);
    } finally { setBusy(null); }
  };

  const getWorkerState = (n: NodeItem) => {
    if (n.status === 'OFFLINE') return 'sleeping' as const;
    if (n.status === 'ERROR') return 'error' as const;
    if ((n.resources?.activeTasks || 0) > 0) return 'working' as const;
    return 'idle' as const;
  };

  const F = ({ label, value, onChange, placeholder = '', type = 'text' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) => (
    <div style={{ marginBottom: 10 }}>
      <label style={{ display: 'block', fontSize: 7, color: 'var(--dim)', fontFamily: "'Press Start 2P', monospace", marginBottom: 3 }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', padding: '8px 10px', fontSize: 11 }} />
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ marginBottom: 4 }}>◈ NODE MANAGE</h2>
          <div className="divider" />
        </div>
        <button className="btn cyan" onClick={() => setShowForm(!showForm)} style={{ fontSize: 8 }}>
          {showForm ? '✕ CANCEL' : '+ ADD NODE'}
        </button>
      </div>

      {msg && (
        <div style={{
          marginBottom: 14, padding: '8px 14px', borderRadius: 4,
          background: msg.includes('Error') || msg.includes('Failed') || msg.includes('failed') ? 'rgba(240,64,80,0.1)' : 'rgba(80,224,96,0.1)',
          border: `2px solid ${msg.includes('Error') || msg.includes('Failed') || msg.includes('failed') ? 'var(--red)' : 'var(--green)'}`,
          fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: 'var(--white)',
        }}>
          {msg}
          <span onClick={() => setMsg('')} style={{ float: 'right', cursor: 'pointer', color: 'var(--dim)' }}>✕</span>
        </div>
      )}

      {/* Inline confirmation dialog */}
      {confirm && (
        <div style={{
          marginBottom: 14, padding: '12px 16px', borderRadius: 4,
          background: confirm.type === 'delete' ? 'rgba(240,64,80,0.08)' : 'rgba(240,192,64,0.08)',
          border: `2px solid ${confirm.type === 'delete' ? 'var(--red)' : 'var(--gold)'}`,
          fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: 'var(--white)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <span>
            {confirm.type === 'delete'
              ? `DELETE "${confirm.nodeName}" permanently?`
              : `Set "${confirm.nodeName}" OFFLINE?`}
          </span>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button className={`btn ${confirm.type === 'delete' ? 'red' : 'gold'} sm`} onClick={executeConfirm}>
              CONFIRM
            </button>
            <button className="btn sm" onClick={() => setConfirm(null)}>CANCEL</button>
          </div>
        </div>
      )}

      {showForm && (
        <div className="panel" style={{ padding: 16, marginBottom: 16 }}>
          <h4 style={{ marginBottom: 12 }}>▸ REGISTER NEW NODE</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
            <F label="NODE NAME *" value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} placeholder="gpu-worker-01" />
            <F label="PUBLIC IP *" value={form.publicIp} onChange={v => setForm(p => ({ ...p, publicIp: v }))} placeholder="1.2.3.4" />
            <F label="API PORT" value={form.apiPort} onChange={v => setForm(p => ({ ...p, apiPort: v }))} type="number" />
            <F label="GPU MODEL" value={form.gpuModel} onChange={v => setForm(p => ({ ...p, gpuModel: v }))} placeholder="RTX 4090" />
            <F label="GPU COUNT" value={form.gpuCount} onChange={v => setForm(p => ({ ...p, gpuCount: v }))} type="number" />
            <F label="VRAM (MB)" value={form.vramTotalMb} onChange={v => setForm(p => ({ ...p, vramTotalMb: v }))} type="number" />
          </div>
          <button className="btn green" onClick={handleRegister} disabled={busy === 'register'}
            style={{ width: '100%', marginTop: 10, fontSize: 8, opacity: busy === 'register' ? 0.5 : 1 }}>
            {busy === 'register' ? 'REGISTERING...' : 'REGISTER NODE'}
          </button>
        </div>
      )}

      {loading && !nodes ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--dim)', fontFamily: "'Press Start 2P', monospace", fontSize: 8 }}>LOADING...</div>
      ) : (
        <div className="panel" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%' }}>
            <thead>
              <tr style={{ background: 'var(--bg-card)', fontFamily: "'Press Start 2P', monospace", fontSize: 7, textAlign: 'left', color: 'var(--cyan)', borderBottom: '2px solid var(--border)' }}>
                <th style={{ padding: '10px 12px' }}>WORKER</th>
                <th>STATUS</th>
                <th>GPU</th>
                <th>LOAD</th>
                <th>IP</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {(nodes || []).length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 30, color: 'var(--dim)', fontFamily: "'Press Start 2P', monospace", fontSize: 7 }}>
                    NO NODES REGISTERED
                  </td>
                </tr>
              ) : (nodes || []).map((node: NodeItem) => {
                const isWorking = (node.resources?.activeTasks || 0) > 0;
                const isBusy = busy?.startsWith(node.nodeId);
                return (
                  <tr key={node.nodeId} style={{ borderBottom: '1px solid var(--border)', opacity: isBusy ? 0.6 : 1, transition: 'opacity 0.2s' }}>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <PixelWorker state={getWorkerState(node)} size="small" />
                        <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: 'var(--cyan)' }}>{(node.name || '').substring(0, 12)}</span>
                      </div>
                    </td>
                    <td><StatusBadge status={node.status} /></td>
                    <td style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--dim)' }}>{node.gpuModel || '-'}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 50, height: 8, background: 'var(--bg-deep)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ width: `${node.resources?.gpuUtilization || 0}%`, height: '100%', background: isWorking ? 'var(--gold)' : 'var(--green)', borderRadius: 2, transition: 'width 0.3s' }} />
                        </div>
                        <span style={{ fontSize: 9, fontFamily: 'monospace', color: 'var(--dim)' }}>{node.resources?.gpuUtilization || 0}%</span>
                      </div>
                    </td>
                    <td style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--muted)' }}>{node.publicIp}:{node.apiPort}</td>
                    <td style={{ padding: '10px 8px' }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => handleHeartbeat(node.nodeId)} className="btn cyan sm"
                          disabled={!!busy} style={{ opacity: busy ? 0.5 : 1 }}>
                          {busy === node.nodeId + ':ping' ? '...' : 'PING'}
                        </button>
                        {node.status === 'ONLINE' && (
                          <button onClick={() => setConfirm({ type: 'offline', nodeId: node.nodeId, nodeName: node.name })}
                            className="btn gold sm" disabled={!!busy} style={{ opacity: busy ? 0.5 : 1 }}>
                            {busy === node.nodeId + ':offline' ? '...' : 'OFF'}
                          </button>
                        )}
                        <button onClick={() => setConfirm({ type: 'delete', nodeId: node.nodeId, nodeName: node.name })}
                          className="btn red sm" disabled={!!busy} style={{ opacity: busy ? 0.5 : 1 }}>
                          {busy === node.nodeId + ':delete' ? '...' : 'DEL'}
                        </button>
                      </div>
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
