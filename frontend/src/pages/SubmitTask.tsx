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
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith('.zip')) {
      setSelectedFile(file); setTaskName(file.name.replace('.zip', ''));
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true); setError('');
    try {
      const result = await uploadTaskPackage(selectedFile, taskName);
      setUploadResult(result.data as Record<string, unknown>);
    } catch (e) { setError((e as Error).message); }
    finally { setUploading(false); }
  };

  const handleCreateTask = async () => {
    if (!uploadResult) return;
    setSubmitting(true);
    try {
      await submitFromPackage(uploadResult.packageId as string, taskName || 'task');
      navigate('/tasks');
    } catch (e) { setError((e as Error).message); }
    finally { setSubmitting(false); }
  };

  const handleJsonSubmit = async () => {
    if (!form.name.trim()) { setError('ENTER TASK NAME'); return; }
    setSubmitting(true); setError('');
    try {
      await submitTask({
        name: form.name, type: form.type, modelName: form.modelName,
        datasetPath: form.datasetPath,
        params: {
          loraRank: parseInt(form.loraRank), loraAlpha: parseInt(form.loraAlpha),
          learningRate: parseFloat(form.learningRate), epochs: parseInt(form.epochs),
          batchSize: parseInt(form.batchSize),
        },
      });
      navigate('/tasks');
    } catch (e) { setError((e as Error).message); }
    finally { setSubmitting(false); }
  };

  return (
    <div style={{ maxWidth: 600 }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ marginBottom: 6 }}>SUBMIT TASK</h2>
        <div className="pixel-divider" />
      </div>

      {/* 模式切换 */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20 }}>
        <button onClick={() => setMode('zip')} className={mode === 'zip' ? 'pixel-btn' : ''}
          style={mode !== 'zip' ? {
            fontFamily: "'Press Start 2P', monospace", fontSize: 9,
            padding: '8px 16px', background: '#111', border: '2px solid #2a2a50', color: '#666',
          } : { fontSize: 9 }}>
          ▸ ZIP UPLOAD
        </button>
        <button onClick={() => setMode('json')} className={mode === 'json' ? 'pixel-btn' : ''}
          style={mode !== 'json' ? {
            fontFamily: "'Press Start 2P', monospace", fontSize: 9,
            padding: '8px 16px', background: '#111', border: '2px solid #2a2a50', color: '#666',
          } : { fontSize: 9 }}>
          ▸ JSON FORM
        </button>
      </div>

      {mode === 'zip' ? (
        <div className="pixel-card" style={{ padding: 20 }}>
          {/* 拖拽区 */}
          <div
            onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `3px dashed ${dragOver ? '#b44dff' : '#2a2a50'}`,
              padding: 40, textAlign: 'center', cursor: 'pointer',
              background: dragOver ? 'rgba(180,77,255,0.08)' : '#0a0a12',
              boxShadow: dragOver ? '0 0 30px rgba(180,77,255,0.2)' : 'none',
              transition: 'all 0.1s steps(2)',
              marginBottom: 16,
            }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>{selectedFile ? '📦' : '⬇'}</div>
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 9, color: '#b44dff' }}>
              {selectedFile ? selectedFile.name : 'DROP ZIP HERE'}
            </div>
            <div style={{ fontSize: 9, color: '#444', marginTop: 6 }}>
              .ZIP WITH task.yaml + train.py
            </div>
            <input ref={fileInputRef} type="file" accept=".zip" style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) { setSelectedFile(f); setTaskName(f.name.replace('.zip', '')); } }} />
          </div>

          {selectedFile && (
            <>
              <div style={{ marginBottom: 12 }}>
                <label style={{
                  display: 'block', marginBottom: 4, fontSize: 9, color: '#888',
                  fontFamily: "'Press Start 2P', monospace",
                }}>TASK NAME</label>
                <input value={taskName} onChange={e => setTaskName(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', fontSize: 12 }} />
              </div>

              {!uploadResult ? (
                <button onClick={handleUpload} disabled={uploading}
                  className="pixel-btn green" style={{ width: '100%', fontSize: 10 }}>
                  {uploading ? 'UPLOADING...' : '▸ STEP 1: UPLOAD FILE'}
                </button>
              ) : (
                <div style={{
                  background: 'rgba(57,255,20,0.06)', border: '2px solid #39ff14',
                  padding: 14, marginBottom: 14,
                }}>
                  <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: '#39ff14' }}>
                    ✓ UPLOAD OK
                  </div>
                  <div style={{ fontSize: 10, color: '#888', marginTop: 8, lineHeight: 1.8 }}>
                    TYPE: <span style={{ color: '#b44dff' }}>{uploadResult.detectedType as string}</span><br />
                    SIZE: <span style={{ color: '#ffe600' }}>{((uploadResult.fileSize as number || 0) / 1024).toFixed(1)} KB</span><br />
                    FILES: <span style={{ color: '#666' }}>{(uploadResult.entries as string[])?.join(', ')}</span>
                  </div>
                </div>
              )}

              {uploadResult && (
                <button onClick={handleCreateTask} disabled={submitting}
                  className="pixel-btn cyan" style={{ width: '100%', fontSize: 10 }}>
                  {submitting ? 'SUBMITTING...' : '▸ STEP 2: CREATE TASK'}
                </button>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="pixel-card" style={{ padding: 20 }}>
          <Field label="TASK NAME" value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} />
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 9, color: '#888', fontFamily: "'Press Start 2P', monospace" }}>TYPE</label>
            <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
              style={{ width: '100%', padding: '10px 14px', fontSize: 12 }}>
              <option value="TRAIN">[TRAIN]</option>
              <option value="FINETUNE">[FINETUNE]</option>
              <option value="EVAL">[EVAL]</option>
            </select>
          </div>
          <Field label="MODEL" value={form.modelName} onChange={v => setForm(p => ({ ...p, modelName: v }))} />
          <Field label="DATASET PATH" value={form.datasetPath} onChange={v => setForm(p => ({ ...p, datasetPath: v }))} />

          <details style={{ marginBottom: 14 }}>
            <summary style={{
              cursor: 'pointer', fontSize: 9, color: '#b44dff',
              fontFamily: "'Press Start 2P', monospace", marginBottom: 8,
            }}>▸ LORA PARAMS</summary>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
              <Field label="RANK" value={form.loraRank} onChange={v => setForm(p => ({ ...p, loraRank: v }))} type="number" />
              <Field label="ALPHA" value={form.loraAlpha} onChange={v => setForm(p => ({ ...p, loraAlpha: v }))} type="number" />
              <Field label="LR" value={form.learningRate} onChange={v => setForm(p => ({ ...p, learningRate: v }))} />
              <Field label="EPOCHS" value={form.epochs} onChange={v => setForm(p => ({ ...p, epochs: v }))} type="number" />
              <Field label="BATCH" value={form.batchSize} onChange={v => setForm(p => ({ ...p, batchSize: v }))} type="number" />
            </div>
          </details>

          <button onClick={handleJsonSubmit} disabled={submitting}
            className="pixel-btn" style={{ width: '100%', fontSize: 10 }}>
            {submitting ? 'SUBMITTING...' : '▸ SUBMIT TASK'}
          </button>
        </div>
      )}

      {error && (
        <div style={{
          marginTop: 16, padding: '12px 16px', background: 'rgba(255,45,120,0.1)',
          border: '2px solid #ff2d78', fontFamily: "'Press Start 2P', monospace",
          fontSize: 8, color: '#ff2d78',
        }}>
          ! ERROR: {error}
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; type?: string;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', marginBottom: 4, fontSize: 9, color: '#888', fontFamily: "'Press Start 2P', monospace" }}>
        {label}
      </label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        style={{ width: '100%', padding: '10px 14px', fontSize: 12 }} />
    </div>
  );
}
