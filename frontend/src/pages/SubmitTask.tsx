import { useState, useRef, DragEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { submitTask, uploadTaskPackage, submitFromPackage } from '../services/api';

export default function SubmitTask() {
  const nav = useNavigate(); const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<'zip' | 'json'>('zip');
  const [file, setFile] = useState<File | null>(null); const [drag, setDrag] = useState(false);
  const [uploading, setUploading] = useState(false); const [result, setResult] = useState<Record<string,unknown>|null>(null);
  const [name, setName] = useState(''); const [err, setErr] = useState(''); const [sub, setSub] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'FINETUNE', modelName: '', datasetPath: '', loraRank: '16', loraAlpha: '32', learningRate: '2e-5', epochs: '3', batchSize: '4' });

  const F = ({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) => (
    <div style={{ marginBottom: 8 }}>
      <div style={{ font: '6px var(--font-pixel)', color: 'var(--dim)', marginBottom: 2 }}>{label}</div>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} style={{ width: '100%' }} />
    </div>
  );

  return (
    <div style={{ maxWidth: 560 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>◻ CARGO BAY</h2>
        <Link to="/tutorial" style={{ font: '6px var(--font-pixel)', color: 'var(--cyan)', textDecoration: 'none', border: '2px solid var(--border)', padding: '5px 10px' }}>◉ TUTORIAL</Link>
      </div>
      <div className="divider" />
      <div style={{ display: 'flex', gap: 0, margin: '14px 0' }}>
        <button className={`btn ${mode === 'zip' ? 'cyan' : ''}`} onClick={() => setMode('zip')} style={{ font: '7px var(--font-pixel)' }}>ZIP UPLOAD</button>
        <button className={`btn ${mode === 'json' ? '' : ''}`} onClick={() => setMode('json')} style={mode !== 'json' ? { font: '7px var(--font-pixel)', background: 'var(--bg-panel)', border: '2px solid var(--border)', color: 'var(--dim)', boxShadow: 'none' } : { font: '7px var(--font-pixel)' }}>JSON FORM</button>
      </div>
      <div className="panel" style={{ padding: 16 }}>
        {mode === 'zip' ? (<>
          <div onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f?.name.endsWith('.zip')) { setFile(f); setName(f.name.replace('.zip', '')); } }}
            onClick={() => fileRef.current?.click()}
            style={{ border: `2px dashed ${drag ? 'var(--cyan)' : 'var(--border)'}`, padding: 30, textAlign: 'center', cursor: 'pointer', background: drag ? 'rgba(64,216,240,0.05)' : 'var(--bg-deep)', marginBottom: 12 }}>
            <div style={{ fontSize: 28 }}>{file ? '📦' : '⬇'}</div>
            <div style={{ font: '7px var(--font-pixel)', color: 'var(--cyan)' }}>{file ? file.name : 'DROP CARGO HERE'}</div>
            <input ref={fileRef} type="file" accept=".zip" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) { setFile(f); setName(f.name.replace('.zip', '')); } }} />
          </div>
          {file && (<>
            <F label="MISSION NAME" value={name} onChange={v => setName(v)} />
            {!result ? (
              <button className="btn cyan" disabled={uploading} onClick={async () => { setUploading(true); setErr(''); try { const r = await uploadTaskPackage(file, name); setResult(r.data as Record<string,unknown>); } catch (e) { const msg = axios.isAxiosError(e) ? (e.response?.data?.message || e.message) : (e as Error).message; setErr(msg); } finally { setUploading(false); } }} style={{ width: '100%' }}>
                {uploading ? 'UPLOADING...' : 'STAGE 1: UPLOAD'}
              </button>
            ) : (<>
              <div className="panel" style={{ padding: 10, marginBottom: 10, borderColor: 'var(--cyan)' }}>
                <div style={{ font: '7px var(--font-pixel)', color: 'var(--cyan)' }}>READY — {result.detectedType as string}</div>
              </div>
              <button className="btn gold" disabled={sub} onClick={async () => { setSub(true); setErr(''); try { await submitFromPackage(result.packageId as string, name); nav('/tasks'); } catch (e) { const msg = axios.isAxiosError(e) ? (e.response?.data?.message || e.message) : (e as Error).message; setErr(msg); } finally { setSub(false); } }} style={{ width: '100%' }}>
                {sub ? 'LAUNCHING...' : 'STAGE 2: DEPLOY'}
              </button>
            </>)}
          </>)}
        </>) : (<>
          <F label="MISSION NAME" value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} />
          <div style={{ marginBottom: 8 }}>
            <div style={{ font: '6px var(--font-pixel)', color: 'var(--dim)', marginBottom: 2 }}>TYPE</div>
            <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} style={{ width: '100%' }}>
              <option value="TRAIN">TRAIN</option><option value="FINETUNE">FINETUNE</option><option value="EVAL">EVAL</option>
            </select>
          </div>
          <F label="MODEL" value={form.modelName} onChange={v => setForm(p => ({ ...p, modelName: v }))} />
          <F label="DATASET" value={form.datasetPath} onChange={v => setForm(p => ({ ...p, datasetPath: v }))} />
          <details style={{ marginBottom: 8 }}>
            <summary style={{ font: '7px var(--font-pixel)', color: 'var(--purple)', cursor: 'pointer' }}>PARAMS</summary>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 8px', marginTop: 6 }}>
              <F label="RANK" value={form.loraRank} onChange={v => setForm(p => ({ ...p, loraRank: v }))} type="number" />
              <F label="ALPHA" value={form.loraAlpha} onChange={v => setForm(p => ({ ...p, loraAlpha: v }))} type="number" />
              <F label="LR" value={form.learningRate} onChange={v => setForm(p => ({ ...p, learningRate: v }))} />
              <F label="EPOCHS" value={form.epochs} onChange={v => setForm(p => ({ ...p, epochs: v }))} type="number" />
              <F label="BATCH" value={form.batchSize} onChange={v => setForm(p => ({ ...p, batchSize: v }))} type="number" />
            </div>
          </details>
          <button className="btn gold" disabled={sub} onClick={async () => { setSub(true); setErr(''); try { await submitTask({ name: form.name, type: form.type, modelName: form.modelName, datasetPath: form.datasetPath, params: { loraRank: parseInt(form.loraRank), loraAlpha: parseInt(form.loraAlpha), learningRate: parseFloat(form.learningRate), epochs: parseInt(form.epochs), batchSize: parseInt(form.batchSize) } }); nav('/tasks'); } catch (e) { const msg = axios.isAxiosError(e) ? (e.response?.data?.message || e.message) : (e as Error).message; setErr(msg); } finally { setSub(false); } }} style={{ width: '100%' }}>DEPLOY MISSION</button>
        </>)}
        {err && <div className="panel" style={{ marginTop: 10, padding: 8, borderColor: 'var(--red)', font: '6px var(--font-pixel)', color: 'var(--red)' }}>! {err}</div>}
      </div>
    </div>
  );
}
