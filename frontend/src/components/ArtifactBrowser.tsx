import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { fetchArtifactList, downloadArtifactFile } from '../services/api';
import { triggerDownload } from '../services/export';
import type { ArtifactFile } from '../types';

type Props = { taskId: string; hasNode: boolean };

function fmtSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

const DIR_LABELS: Record<string, { label: string; color: string }> = {
  logs: { label: 'LOGS', color: 'var(--cyan)' },
  checkpoints: { label: 'CHECKPOINTS', color: 'var(--gold)' },
  results: { label: 'RESULTS', color: 'var(--green)' },
};

export default function ArtifactBrowser({ taskId, hasNode }: Props) {
  const { data } = useApi(() => fetchArtifactList(taskId), hasNode ? 10000 : 0);
  const [downloading, setDownloading] = useState<string | null>(null);

  const files: ArtifactFile[] = data?.files || [];

  if (!hasNode) {
    return (
      <div className="panel" style={{ padding: 20, marginTop: 16 }}>
        <h4 style={{ marginBottom: 8 }}>▸ OUTPUT FILES</h4>
        <div style={{ color: 'var(--dim)', fontFamily: "'Press Start 2P', monospace", fontSize: 7 }}>
          NO NODE ASSIGNED
        </div>
      </div>
    );
  }

  const groups = new Map<string, ArtifactFile[]>();
  for (const f of files) {
    const key = f.dir || '_root';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(f);
  }

  const sortedKeys = [...groups.keys()].sort((a, b) => {
    const order = ['logs', 'checkpoints', 'results'];
    const ai = order.indexOf(a), bi = order.indexOf(b);
    if (ai >= 0 && bi >= 0) return ai - bi;
    if (ai >= 0) return -1;
    if (bi >= 0) return 1;
    return a.localeCompare(b);
  });

  const handleDownload = async (file: ArtifactFile) => {
    setDownloading(file.path);
    try {
      const blob = await downloadArtifactFile(taskId, file.path);
      triggerDownload(blob, file.name);
    } catch { /* */ } finally {
      setDownloading(null);
    }
  };

  const totalSize = files.reduce((s, f) => s + f.size, 0);

  return (
    <div className="panel" style={{ padding: 20, marginTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h4>▸ OUTPUT FILES</h4>
        {files.length > 0 && (
          <span style={{ fontFamily: "'Courier New', monospace", fontSize: 10, color: 'var(--dim)' }}>
            {files.length} files | {fmtSize(totalSize)}
          </span>
        )}
      </div>

      {files.length === 0 && (
        <div style={{ color: 'var(--dim)', fontFamily: "'Press Start 2P', monospace", fontSize: 7, padding: '8px 0' }}>
          NO OUTPUT FILES YET
        </div>
      )}

      {sortedKeys.map(dir => {
        const dirFiles = groups.get(dir)!;
        const meta = DIR_LABELS[dir] || { label: dir.toUpperCase(), color: 'var(--dim)' };
        return (
          <div key={dir} style={{ marginBottom: 12 }}>
            <div style={{
              fontFamily: "'Press Start 2P', monospace", fontSize: 7,
              color: meta.color, marginBottom: 6, letterSpacing: 1,
            }}>
              [{meta.label}]
            </div>
            {dirFiles.map(f => (
              <div key={f.path} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '5px 8px', borderBottom: '1px solid var(--border)',
              }}>
                <span style={{
                  flex: 1, fontFamily: "'Courier New', monospace", fontSize: 11,
                  color: 'var(--white)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {f.name}
                </span>
                <span style={{ fontFamily: "'Courier New', monospace", fontSize: 10, color: 'var(--dim)', minWidth: 70, textAlign: 'right' }}>
                  {fmtSize(f.size)}
                </span>
                <button
                  className="btn sm cyan"
                  style={{ fontSize: 6, padding: '3px 8px' }}
                  disabled={downloading === f.path}
                  onClick={() => handleDownload(f)}
                >
                  {downloading === f.path ? '...' : 'DL'}
                </button>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
