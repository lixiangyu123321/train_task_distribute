import { useState, useRef, DragEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { submitTask, uploadTaskPackage, submitFromPackage } from '../services/api';

export default function SubmitTask() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<'zip' | 'json'>('zip');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<Record<string, unknown> | null>(null);
  const [taskName, setTaskName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '', type: 'FINETUNE', modelName: '', datasetPath: '',
    loraRank: '16', loraAlpha: '32', learningRate: '2e-5', epochs: '3', batchSize: '4',
  });

  const handleDragOver = (e: DragEvent) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);
  const handleDrop = (e: DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f?.name.endsWith('.zip')) { setSelectedFile(f); setTaskName(f.name.replace('.zip', '')); }
  };
  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true); setError('');
    try { const r = await uploadTaskPackage(selectedFile, taskName); setUploadResult(r.data as Record<string, unknown>); }
    catch (e) { setError((e as Error).message); } finally { setUploading(false); }
  };
  const handleCreateTask = async () => {
    if (!uploadResult) return; setSubmitting(true);
    try { await submitFromPackage(uploadResult.packageId as string, taskName || 'task'); navigate('/tasks'); }
    catch (e) { setError((e as Error).message); } finally { setSubmitting(false); }
  };
  const handleJsonSubmit = async () => {
    if (!form.name.trim()) { setError('ENTER TASK NAME'); return; }
    setSubmitting(true); setError('');
    try {
      await submitTask({ name: form.name, type: form.type, modelName: form.modelName,
        datasetPath: form.datasetPath, params: { loraRank: parseInt(form.loraRank),
        loraAlpha: parseInt(form.loraAlpha), learningRate: parseFloat(form.learningRate),
        epochs: parseInt(form.epochs), batchSize: parseInt(form.batchSize) } });
      navigate('/tasks');
    } catch (e) { setError((e as Error).message); } finally { setSubmitting(false); }
  };

  const F = ({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) => (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', marginBottom: 3, fontSize: 8, color: '#8a7aaa', fontFamily: "'Press Start 2P', monospace" }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} style={{ width: '100%', padding: '10px 14px', fontSize: 12 }} />
    </div>
  );

  return (
    <div style={{ maxWidth: 600 }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ marginBottom: 4 }}>📦 SUBMIT TASK</h2>
        <div className="pixel-divider" />
      </div>
      <div style={{ display: 'flex', gap: 0, marginBottom: 18 }}>
        <button onClick={() => setMode('zip')} className={mode === 'zip' ? 'pixel-btn' : ''}
          style={mode !== 'zip' ? { fontFamily: "'Press Start 2P', monospace", fontSize: 8, padding: '8px 14px', background: '#fff', border: '2px solid #e0d6c8', borderRadius: '4px 0 0 4px', color: '#b0a0c0' } : { fontSize: 8, borderRadius: '4px 0 0 4px' }}>
          📂 ZIP
        </button>
        <button onClick={() => setMode('json')} className={mode === 'json' ? 'pixel-btn' : ''}
          style={mode !== 'json' ? { fontFamily: "'Press Start 2P', monospace", fontSize: 8, padding: '8px 14px', background: '#fff', border: '2px solid #e0d6c8', borderRadius: '0 4px 4px 0', color: '#b0a0c0' } : { fontSize: 8, borderRadius: '0 4px 4px 0' }}>
          📝 JSON
        </button>
      </div>
      {mode === 'zip' ? (
        <div className="pixel-card" style={{ padding: 20 }}>
          <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{ border: `3px dashed ${dragOver ? '#b8a0e8' : '#e0d6c8'}`, borderRadius: 8, padding: 36, textAlign: 'center', cursor: 'pointer', background: dragOver ? '#f5f0ff' : '#fdfaf5', marginBottom: 16 }}>
            <div style={{ fontSize: 36 }}>{selectedFile ? '📦' : '📂'}</div>
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 9, color: '#8a7aaa' }}>{selectedFile ? selectedFile.name : 'DROP ZIP HERE'}</div>
            <div style={{ fontSize: 9, color: '#c0b8d0', marginTop: 4, fontFamily: 'monospace' }}>.zip with task.yaml + train.py</div>
            <input ref={fileInputRef} type="file" accept=".zip" style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) { setSelectedFile(f); setTaskName(f.name.replace('.zip', '')); } }} />
          </div>
          {selectedFile && (<>
            <F label="TASK NAME" value={taskName} onChange={v => setTaskName(v)} />
            {!uploadResult ? (
              <button onClick={handleUpload} disabled={uploading} className="pixel-btn" style={{ width: '100%', fontSize: 9 }}>{uploading ? 'UPLOADING...' : 'STEP 1: UPLOAD'}</button>
            ) : (<>
              <div style={{ background: '#f5f0ff', border: '2px solid #b8a0e8', borderRadius: 6, padding: 12, marginBottom: 12 }}>
                <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: '#5a4a8a' }}>READY!</div>
                <div style={{ fontSize: 10, color: '#8a7aaa', marginTop: 6, fontFamily: 'monospace' }}>
                  TYPE: <b>{uploadResult.detectedType as string}</b> | {((uploadResult.fileSize as number||0)/1024).toFixed(1)}KB
                </div>
              </div>
              <button onClick={handleCreateTask} disabled={submitting} className="pixel-btn cyan" style={{ width: '100%', fontSize: 9 }}>{submitting ? 'CREATING...' : 'STEP 2: LAUNCH'}</button>
            </>)}
          </>)}
        </div>
      ) : (
        <div className="pixel-card" style={{ padding: 20 }}>
          <F label="TASK NAME" value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} />
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 3, fontSize: 8, color: '#8a7aaa', fontFamily: "'Press Start 2P', monospace" }}>TYPE</label>
            <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} style={{ width: '100%', padding: '10px 14px', fontSize: 12 }}>
              <option value="TRAIN">TRAIN</option><option value="FINETUNE">FINETUNE</option><option value="EVAL">EVAL</option>
            </select>
          </div>
          <F label="MODEL" value={form.modelName} onChange={v => setForm(p => ({ ...p, modelName: v }))} />
          <F label="DATASET" value={form.datasetPath} onChange={v => setForm(p => ({ ...p, datasetPath: v }))} />
          <details style={{ marginBottom: 12 }}>
            <summary style={{ cursor: 'pointer', fontSize: 8, color: '#b8a0e8', fontFamily: "'Press Start 2P', monospace", marginBottom: 8 }}>▸ LORA PARAMS</summary>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 10px' }}>
              <F label="RANK" value={form.loraRank} onChange={v => setForm(p => ({ ...p, loraRank: v }))} type="number" />
              <F label="ALPHA" value={form.loraAlpha} onChange={v => setForm(p => ({ ...p, loraAlpha: v }))} type="number" />
              <F label="LR" value={form.learningRate} onChange={v => setForm(p => ({ ...p, learningRate: v }))} />
              <F label="EPOCHS" value={form.epochs} onChange={v => setForm(p => ({ ...p, epochs: v }))} type="number" />
              <F label="BATCH" value={form.batchSize} onChange={v => setForm(p => ({ ...p, batchSize: v }))} type="number" />
            </div>
          </details>
          <button onClick={handleJsonSubmit} disabled={submitting} className="pixel-btn" style={{ width: '100%', fontSize: 9 }}>{submitting ? '...' : 'LAUNCH TASK'}</button>
        </div>
      )}
      {error && (
        <div style={{ marginTop: 14, padding: '10px 14px', background: '#ffebee', border: '2px solid #ff8a80', borderRadius: 6, fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: '#c62828' }}>! {error}</div>
      )}
    </div>
  );
}
