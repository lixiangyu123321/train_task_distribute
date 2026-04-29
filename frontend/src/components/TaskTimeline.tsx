const steps = ['PENDING', 'QUEUED', 'RUNNING', 'COMPLETED'] as const;
const labels: Record<string, string> = {
  PENDING: 'SUBMIT', QUEUED: 'QUEUE', RUNNING: 'TRAIN', COMPLETED: 'DONE',
  FAILED: 'FAIL', CANCELLED: 'CANCEL'
};

type Props = { status: string };

export default function TaskTimeline({ status }: Props) {
  const failed = status === 'FAILED' || status === 'CANCELLED';
  const currentIdx = steps.indexOf(status as typeof steps[number]);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 0,
      padding: '20px 0',
      fontFamily: "'Press Start 2P', monospace", fontSize: 8,
    }}>
      {steps.map((step, i) => {
        const done = i < currentIdx || (step === status && step === 'COMPLETED');
        const active = step === status;
        const isFailed = failed && (step === 'RUNNING' || step === 'COMPLETED');

        let color = '#444';
        if (isFailed) color = '#ff2d78';
        else if (done) color = '#39ff14';
        else if (active) color = '#00f0ff';

        return (
          <div key={step} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <div style={{ textAlign: 'center', zIndex: 1 }}>
              {/* 像素方块 */}
              <div style={{
                width: 36, height: 36, margin: '0 auto',
                background: isFailed ? '#2a000a' : done ? '#002a0a' : active ? '#001a2a' : '#111',
                border: `2px solid ${color}`,
                boxShadow: active ? `0 0 16px ${color}66, 3px 3px 0 #000` : '3px 3px 0 #000',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                imageRendering: 'pixelated',
              }}>
                <span style={{ color, fontSize: 14, textShadow: `0 0 6px ${color}` }}>
                  {isFailed ? '×' : done ? '✓' : active ? '▸' : String(i + 1)}
                </span>
              </div>
              <div style={{
                marginTop: 6, color,
                textShadow: active ? `0 0 6px ${color}` : 'none',
              }}>
                {isFailed && step === 'RUNNING' ? 'FAIL' : labels[step]}
              </div>
            </div>
            {i < steps.length - 1 && (
              <div style={{
                flex: 1, height: 4, margin: '0 4px', marginTop: -16,
                background: done && i < currentIdx
                  ? `repeating-linear-gradient(90deg, ${color} 0px, ${color} 6px, transparent 6px, transparent 8px)`
                  : '#1a1a30',
                animation: done && i < currentIdx ? 'pixelStripes 0.3s linear infinite' : 'none',
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}
