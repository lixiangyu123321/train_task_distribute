import { useState, useRef, DragEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { submitTask, uploadTaskPackage, submitFromPackage } from '../services/api';

export default function SubmitTask() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ZIP 上传状态
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<Record<string, unknown> | null>(null);
  const [taskName, setTaskName] = useState('');

  // 传统 JSON 表单（兼容）
  const [mode, setMode] = useState<'zip' | 'json'>('zip');
  const [form, setForm] = useState({
    name: '', type: 'FINETUNE', modelName: '', datasetPath: '',
    loraRank: '16', loraAlpha: '32', learningRate: '2e-5', epochs: '3', batchSize: '4',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleDragOver = (e: DragEvent) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);
  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.zip')) {
      setSelectedFile(file);
      setTaskName(file.name.replace('.zip', ''));
    }
  };

  // Step 1: 上传 ZIP
  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setError('');
    try {
      const result = await uploadTaskPackage(selectedFile, taskName);
      setUploadResult(result.data);
    } catch (e) {
      setError((e as Error).message || '上传失败');
    } finally {
      setUploading(false);
    }
  };

  // Step 2: 基于 ZIP 创建任务
  const handleCreateTask = async () => {
    if (!uploadResult) return;
    setSubmitting(true);
    try {
      await submitFromPackage(
        uploadResult.packageId as string,
        taskName || (uploadResult.yamlData as Record<string,unknown>)?.name as string || 'task',
      );
      navigate('/tasks');
    } catch (e) {
      setError((e as Error).message || '创建任务失败');
    } finally {
      setSubmitting(false);
    }
  };

  // JSON 方式提交
  const handleJsonSubmit = async () => {
    if (!form.name.trim()) { setError('请输入任务名称'); return; }
    setSubmitting(true);
    setError('');
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
    } catch (e) {
      setError((e as Error).message || '提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 640 }}>
      <h2 style={{ marginBottom: 8 }}>提交训练任务</h2>
      <div style={{ marginBottom: 20, display: 'flex', gap: 0 }}>
        <button onClick={() => setMode('zip')} style={{
          padding: '6px 20px', border: 'none', borderRadius: '4px 0 0 4px',
          background: mode === 'zip' ? '#1677ff' : '#f0f0f0',
          color: mode === 'zip' ? '#fff' : '#333', cursor: 'pointer',
        }}>ZIP 包上传</button>
        <button onClick={() => setMode('json')} style={{
          padding: '6px 20px', border: 'none', borderRadius: '0 4px 4px 0',
          background: mode === 'json' ? '#1677ff' : '#f0f0f0',
          color: mode === 'json' ? '#fff' : '#333', cursor: 'pointer',
        }}>JSON 提交</button>
      </div>

      {mode === 'zip' ? (
        <div style={{ background: '#fff', borderRadius: 8, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          {/* 上传区域 */}
          <div
            onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver ? '#1677ff' : '#d9d9d9'}`,
              borderRadius: 8, padding: 40, textAlign: 'center',
              background: dragOver ? '#e6f4ff' : '#fafafa', cursor: 'pointer',
              marginBottom: 16,
            }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>{selectedFile ? '📦' : '📁'}</div>
            <div style={{ fontSize: 14, color: '#333' }}>
              {selectedFile ? selectedFile.name : '拖拽 ZIP 文件到此处，或点击选择'}
            </div>
            <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
              支持 .zip 格式，包含 task.yaml + 训练脚本 + 数据
            </div>
            <input ref={fileInputRef} type="file" accept=".zip" style={{ display: 'none' }}
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) { setSelectedFile(file); setTaskName(file.name.replace('.zip', '')); }
              }} />
          </div>

          {selectedFile && (
            <>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 13, color: '#666' }}>任务名称</label>
                <input value={taskName} onChange={e => setTaskName(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d9d9d9', borderRadius: 4, fontSize: 14 }} />
              </div>

              {!uploadResult ? (
                <button onClick={handleUpload} disabled={uploading}
                  style={{ width: '100%', padding: '10px', background: '#52c41a', color: '#fff', border: 'none', borderRadius: 6, fontSize: 15, cursor: 'pointer' }}>
                  {uploading ? '上传中...' : 'Step 1: 上传文件'}
                </button>
              ) : (
                <div style={{ background: '#f6ffed', borderRadius: 6, padding: 16, marginBottom: 16 }}>
                  <div style={{ color: '#52c41a', fontWeight: 600, marginBottom: 8 }}>上传成功</div>
                  <div style={{ fontSize: 13, color: '#666' }}>
                    包ID: {(uploadResult.packageId as string)?.substring(0, 12)}... |
                    类型: {uploadResult.detectedType as string} |
                    大小: {((uploadResult.fileSize as number || 0) / 1024).toFixed(1)} KB
                  </div>
                  <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                    包含文件: {(uploadResult.entries as string[])?.join(', ')}
                  </div>
                </div>
              )}

              {uploadResult && (
                <button onClick={handleCreateTask} disabled={submitting}
                  style={{ width: '100%', padding: '10px', background: '#1677ff', color: '#fff', border: 'none', borderRadius: 6, fontSize: 15, cursor: 'pointer' }}>
                  {submitting ? '提交中...' : 'Step 2: 创建任务'}
                </button>
              )}
            </>
          )}
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 8, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <Field label="任务名称" value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} />
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 13, color: '#666' }}>任务类型</label>
            <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d9d9d9', borderRadius: 4, fontSize: 14 }}>
              <option value="TRAIN">TRAIN — 全量训练</option>
              <option value="FINETUNE">FINETUNE — 微调</option>
              <option value="EVAL">EVAL — 评估</option>
            </select>
          </div>
          <Field label="模型名称" value={form.modelName} onChange={v => setForm(p => ({ ...p, modelName: v }))} />
          <Field label="数据集路径" value={form.datasetPath} onChange={v => setForm(p => ({ ...p, datasetPath: v }))} />

          <details style={{ marginBottom: 16 }}>
            <summary style={{ cursor: 'pointer', fontSize: 13, color: '#666', marginBottom: 8 }}>LoRA / 训练参数</summary>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              <Field label="LoRA Rank" value={form.loraRank} onChange={v => setForm(p => ({ ...p, loraRank: v }))} type="number" />
              <Field label="LoRA Alpha" value={form.loraAlpha} onChange={v => setForm(p => ({ ...p, loraAlpha: v }))} type="number" />
              <Field label="学习率" value={form.learningRate} onChange={v => setForm(p => ({ ...p, learningRate: v }))} />
              <Field label="Epochs" value={form.epochs} onChange={v => setForm(p => ({ ...p, epochs: v }))} type="number" />
              <Field label="Batch Size" value={form.batchSize} onChange={v => setForm(p => ({ ...p, batchSize: v }))} type="number" />
            </div>
          </details>

          <button onClick={handleJsonSubmit} disabled={submitting}
            style={{ width: '100%', padding: '10px', background: '#1677ff', color: '#fff', border: 'none', borderRadius: 6, fontSize: 15, cursor: 'pointer' }}>
            {submitting ? '提交中...' : '提交任务'}
          </button>
        </div>
      )}

      {error && <div style={{ color: '#ff4d4f', marginTop: 16, fontSize: 13 }}>{error}</div>}
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; type?: string;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', marginBottom: 4, fontSize: 13, color: '#666' }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        style={{ width: '100%', padding: '8px 12px', border: '1px solid #d9d9d9', borderRadius: 4, fontSize: 14 }} />
    </div>
  );
}
