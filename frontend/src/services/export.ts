export function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportMetricsCSV(metrics: Record<string, unknown>[]): Blob {
  if (metrics.length === 0) return new Blob([''], { type: 'text/csv' });
  const keys = Object.keys(metrics[0]);
  const header = keys.join(',');
  const rows = metrics.map(m =>
    keys.map(k => {
      const v = m[k];
      if (v == null) return '';
      if (typeof v === 'string') return `"${v.replace(/"/g, '""')}"`;
      return String(v);
    }).join(',')
  );
  return new Blob([header + '\n' + rows.join('\n') + '\n'], { type: 'text/csv' });
}

export function exportMetricsJSON(metrics: Record<string, unknown>[]): Blob {
  return new Blob([JSON.stringify(metrics, null, 2)], { type: 'application/json' });
}

export function exportMetricsJSONL(metrics: Record<string, unknown>[]): Blob {
  const lines = metrics.map(m => JSON.stringify(m)).join('\n');
  return new Blob([lines + '\n'], { type: 'application/x-ndjson' });
}
