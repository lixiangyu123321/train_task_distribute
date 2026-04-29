const steps = ['PENDING', 'QUEUED', 'RUNNING', 'COMPLETED'] as const;
const stepLabels: Record<string, string> = {
  PENDING: '已提交', QUEUED: '已排队', RUNNING: '执行中', COMPLETED: '已完成', FAILED: '失败', CANCELLED: '已取消'
};

type Props = { status: string };

export default function TaskTimeline({ status }: Props) {
  const failed = status === 'FAILED' || status === 'CANCELLED';
  const currentIdx = steps.indexOf(status as typeof steps[number]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, padding: '16px 0' }}>
      {steps.map((step, i) => {
        const done = i < currentIdx || (step === status && step === 'COMPLETED');
        const active = step === status;
        const isFailed = failed && (step === 'RUNNING' || step === 'COMPLETED');
        return (
          <div key={step} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: isFailed ? '#ff4d4f' : done ? '#52c41a' : active ? '#1677ff' : '#d9d9d9',
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, margin: '0 auto',
              }}>
                {isFailed ? '✕' : done ? '✓' : i + 1}
              </div>
              <div style={{ fontSize: 12, marginTop: 4, color: active ? '#1677ff' : '#888' }}>
                {status === 'FAILED' && step === 'RUNNING' ? '失败' : stepLabels[step]}
              </div>
            </div>
            {i < steps.length - 1 && (
              <div style={{
                flex: 1, height: 2, margin: '0 8px', marginTop: -16,
                background: done && i < currentIdx ? '#52c41a' : '#d9d9d9',
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}
