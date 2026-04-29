const steps = ['PENDING', 'QUEUED', 'RUNNING', 'COMPLETED'] as const;
const labels: Record<string, string> = { PENDING: 'SUBMIT', QUEUED: 'QUEUE', RUNNING: 'TRAIN', COMPLETED: 'DONE', FAILED: 'FAIL', CANCELLED: 'CANCEL' };

type Props = { status: string };

export default function TaskTimeline({ status }: Props) {
  const failed = status === 'FAILED' || status === 'CANCELLED';
  const idx = steps.indexOf(status as typeof steps[number]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '16px 0', fontFamily: "'Press Start 2P', monospace", fontSize: 7 }}>
      {steps.map((step, i) => {
        const done = i < idx || (step === status && step === 'COMPLETED');
        const active = step === status;
        const isFailed = failed && (step === 'RUNNING' || step === 'COMPLETED');

        let bg, border, col;
        if (isFailed) { bg = '#ffebee'; border = '#ff8a80'; col = '#ff8a80'; }
        else if (done) { bg = '#e8f5e9'; border = '#8cd790'; col = '#8cd790'; }
        else if (active) { bg = '#e3f2fd'; border = '#7ec8e3'; col = '#7ec8e3'; }
        else { bg = '#f5f5f5'; border = '#e0d6c8'; col = '#c0b8d0'; }

        return (
          <div key={step} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <div style={{ textAlign: 'center', zIndex: 1 }}>
              <div style={{ width: 30, height: 30, margin: '0 auto', borderRadius: 4, background: bg, border: `2px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: col, fontSize: 14 }}>{isFailed ? '✕' : done ? '✓' : active ? '▸' : String(i + 1)}</span>
              </div>
              <div style={{ marginTop: 4, color: col }}>{isFailed && step === 'RUNNING' ? 'FAIL' : labels[step]}</div>
            </div>
            {i < steps.length - 1 && (
              <div style={{ flex: 1, height: 3, margin: '0 4px', marginTop: -14, borderRadius: 2, background: done && i < idx ? `repeating-linear-gradient(90deg, ${col} 0px, ${col} 6px, transparent 6px, transparent 8px)` : '#f0e8d8' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}
