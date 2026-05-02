const steps = ['UPLOAD', 'TRANSFER', 'TRAIN', 'DONE'] as const;

const statusToStep: Record<string, number> = {
  PENDING: 0, DISPATCHING: 1, QUEUED: 2, RUNNING: 2, COMPLETED: 3, FAILED: -1, CANCELLED: -1,
};

type Props = { status: string };

export default function TaskTimeline({ status }: Props) {
  const failed = status === 'FAILED' || status === 'CANCELLED';
  const idx = statusToStep[status] ?? 0;
  const isDone = status === 'COMPLETED';

  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '16px 0', fontFamily: "'Press Start 2P', monospace", fontSize: 7 }}>
      {steps.map((step, i) => {
        const done = isDone ? true : i < idx;
        const active = !failed && !isDone && i === idx;
        const isFailed = failed && i >= 2;

        let bg, border, col;
        if (isFailed) { bg = 'rgba(240,64,80,0.1)'; border = '#f04050'; col = '#f04050'; }
        else if (done) { bg = 'rgba(80,224,96,0.1)'; border = '#50e060'; col = '#50e060'; }
        else if (active) { bg = 'rgba(64,216,240,0.1)'; border = '#40d8f0'; col = '#40d8f0'; }
        else { bg = '#1c2333'; border = '#2a3548'; col = '#506080'; }

        return (
          <div key={step} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <div style={{ textAlign: 'center', zIndex: 1 }}>
              <div style={{ width: 30, height: 30, margin: '0 auto', borderRadius: 4, background: bg, border: `2px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s' }}>
                <span style={{ color: col, fontSize: 14 }}>{isFailed ? '✕' : done ? '✓' : active ? '▸' : String(i + 1)}</span>
              </div>
              <div style={{ marginTop: 4, color: col, transition: 'color 0.3s' }}>{isFailed && i === 2 ? 'FAIL' : step}</div>
            </div>
            {i < steps.length - 1 && (
              <div style={{ flex: 1, height: 3, margin: '0 4px', marginTop: -14, borderRadius: 2, background: done && (isDone || i < idx) ? `repeating-linear-gradient(90deg, ${col} 0px, ${col} 6px, transparent 6px, transparent 8px)` : '#2a3548', transition: 'background 0.3s' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}
