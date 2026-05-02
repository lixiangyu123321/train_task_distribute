import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { fetchTemplates, createTemplate, updateTemplate, deleteTemplate } from '../services/api';
import { showToast } from '../services/toast';
import type { TaskTemplate } from '../types';

export default function TemplateManager() {
  const { data: templates, loading, refresh } = useApi(fetchTemplates);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', type: 'TRAIN', description: '', defaultParams: '{}' });
  const [busy, setBusy] = useState(false);

  const handleSave = async () => {
    if (!form.name.trim()) { showToast('error', 'NAME IS REQUIRED'); return; }
    setBusy(true);
    try {
      const params = JSON.parse(form.defaultParams);
      if (editId) {
        await updateTemplate(editId, { ...form, defaultParams: params });
        showToast('success', 'TEMPLATE UPDATED');
      } else {
        await createTemplate({ ...form, defaultParams: params });
        showToast('success', 'TEMPLATE CREATED');
      }
      resetForm();
      refresh();
    } catch (e) {
      showToast('error', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this template?')) return;
    try {
      await deleteTemplate(id);
      showToast('success', 'TEMPLATE DELETED');
      refresh();
    } catch (e) {
      showToast('error', (e as Error).message);
    }
  };

  const startEdit = (t: TaskTemplate) => {
    setEditId(t.id);
    setForm({
      name: t.name,
      type: t.type,
      description: t.description || '',
      defaultParams: JSON.stringify(t.defaultParams, null, 2),
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setEditId(null);
    setShowForm(false);
    setForm({ name: '', type: 'TRAIN', description: '', defaultParams: '{}' });
  };

  const typeBadge = (type: string) => {
    const color = type === 'TRAIN' ? 'cyan' : type === 'FINETUNE' ? 'gold' : type === 'EVAL' ? 'purple' : 'green';
    return <span className={`badge ${color}`}>{type}</span>;
  };

  const truncate = (s: string, max: number) => s.length > max ? s.substring(0, max) + '...' : s;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2>&#9678; TASK TEMPLATES</h2>
          <div className="divider" />
        </div>
        <button className="btn cyan" onClick={() => { if (showForm) resetForm(); else setShowForm(true); }} style={{ fontSize: 8 }}>
          {showForm ? '✕ CANCEL' : '+ NEW TEMPLATE'}
        </button>
      </div>

      {showForm && (
        <div className="panel" style={{ padding: 16, marginBottom: 16 }}>
          <h4 style={{ marginBottom: 12 }}>{editId ? '▸ EDIT TEMPLATE' : '▸ NEW TEMPLATE'}</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
            <div style={{ marginBottom: 10 }}>
              <label style={{ display: 'block', fontSize: 7, color: 'var(--dim)', fontFamily: "'Press Start 2P', monospace", marginBottom: 3 }}>NAME *</label>
              <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="my-finetune-template" style={{ width: '100%', padding: '8px 10px', fontSize: 11 }} />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ display: 'block', fontSize: 7, color: 'var(--dim)', fontFamily: "'Press Start 2P', monospace", marginBottom: 3 }}>TYPE</label>
              <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                style={{ width: '100%', padding: '8px 10px', fontSize: 11 }}>
                <option value="TRAIN">TRAIN</option>
                <option value="FINETUNE">FINETUNE</option>
                <option value="EVAL">EVAL</option>
                <option value="FULL">FULL</option>
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: 'block', fontSize: 7, color: 'var(--dim)', fontFamily: "'Press Start 2P', monospace", marginBottom: 3 }}>DESCRIPTION</label>
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="What this template is for..."
              style={{
                width: '100%', padding: '8px 10px', fontSize: 11, minHeight: 50,
                fontFamily: 'var(--font-mono)', background: 'var(--bg-input)', color: 'var(--white)',
                border: '2px solid var(--border)', outline: 'none', resize: 'vertical',
              }} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: 'block', fontSize: 7, color: 'var(--dim)', fontFamily: "'Press Start 2P', monospace", marginBottom: 3 }}>DEFAULT PARAMS (JSON)</label>
            <textarea value={form.defaultParams} onChange={e => setForm(p => ({ ...p, defaultParams: e.target.value }))}
              placeholder='{"loraRank": 16, "epochs": 3}'
              style={{
                width: '100%', padding: '8px 10px', fontSize: 11, minHeight: 90,
                fontFamily: 'var(--font-mono)', background: 'var(--bg-input)', color: 'var(--cyan)',
                border: '2px solid var(--border)', outline: 'none', resize: 'vertical',
              }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn gold" onClick={handleSave} disabled={busy}
              style={{ flex: 1, fontSize: 8, opacity: busy ? 0.5 : 1 }}>
              {busy ? 'SAVING...' : editId ? 'UPDATE TEMPLATE' : 'CREATE TEMPLATE'}
            </button>
            <button className="btn" onClick={resetForm} style={{ fontSize: 8 }}>CANCEL</button>
          </div>
        </div>
      )}

      {loading && !templates ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--dim)', fontFamily: "'Press Start 2P', monospace", fontSize: 8 }}>LOADING...</div>
      ) : (
        <div className="panel" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%' }}>
            <thead>
              <tr style={{ background: 'var(--bg-card)', fontFamily: "'Press Start 2P', monospace", fontSize: 7, textAlign: 'left', color: 'var(--cyan)', borderBottom: '2px solid var(--border)' }}>
                <th style={{ padding: '10px 12px' }}>NAME</th>
                <th>TYPE</th>
                <th>DESCRIPTION</th>
                <th>PARAMS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {(templates || []).length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 30, color: 'var(--dim)', fontFamily: "'Press Start 2P', monospace", fontSize: 7 }}>
                    NO TEMPLATES YET
                  </td>
                </tr>
              ) : (templates || []).map((t: TaskTemplate) => (
                <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: 'var(--gold)' }}>{t.name}</span>
                  </td>
                  <td>{typeBadge(t.type)}</td>
                  <td style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--dim)', maxWidth: 200 }}>
                    {truncate(t.description || '-', 40)}
                  </td>
                  <td>
                    <details style={{ cursor: 'pointer' }}>
                      <summary style={{ font: '6px var(--font-pixel)', color: 'var(--purple)' }}>
                        {truncate(JSON.stringify(t.defaultParams), 30)}
                      </summary>
                      <pre style={{
                        margin: '4px 0 0', padding: 6, fontSize: 9,
                        fontFamily: 'var(--font-mono)', color: 'var(--cyan)',
                        background: 'var(--bg-deep)', border: '1px solid var(--border)',
                        maxWidth: 260, overflow: 'auto', whiteSpace: 'pre-wrap',
                      }}>
                        {JSON.stringify(t.defaultParams, null, 2)}
                      </pre>
                    </details>
                  </td>
                  <td style={{ padding: '10px 8px' }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => startEdit(t)} className="btn cyan sm">EDIT</button>
                      <button onClick={() => handleDelete(t.id)} className="btn red sm">DEL</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
