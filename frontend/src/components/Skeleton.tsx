const pulseStyle = { animation: 'pulse 1.5s ease-in-out infinite' };

export function SkeletonRow({ width = '100%' }: { width?: string }) {
  return (
    <div style={{
      height: 18,
      width,
      background: 'var(--bg-card)',
      borderRadius: 4,
      ...pulseStyle,
    }} />
  );
}

export function SkeletonCard({ height = 80 }: { height?: number }) {
  return (
    <div className="panel" style={{
      height,
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent)',
        ...pulseStyle,
      }} />
    </div>
  );
}

export function SkeletonTable({ rows = 6 }: { rows?: number }) {
  const widths = ['60%', '80%', '45%', '70%', '55%', '65%', '50%', '75%'];
  return (
    <div className="panel" style={{ padding: 16 }}>
      {/* header row */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
        {[80, 120, 60, 80, 100].map((w, i) => (
          <div key={i} style={{
            height: 12, width: w,
            background: 'var(--bg-card)',
            borderRadius: 3,
            ...pulseStyle,
          }} />
        ))}
      </div>
      {/* data rows */}
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} style={{
          borderTop: '1px solid var(--border)',
          padding: '10px 0',
        }}>
          <SkeletonRow width={widths[i % widths.length]} />
        </div>
      ))}
    </div>
  );
}
