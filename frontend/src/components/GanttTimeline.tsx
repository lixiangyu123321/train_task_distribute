interface GanttTimelineProps {
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  status: string;
}

function fmtDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return s + 's';
  if (s < 3600) return Math.floor(s / 60) + 'm ' + (s % 60) + 's';
  return Math.floor(s / 3600) + 'h ' + Math.floor((s % 3600) / 60) + 'm';
}

export default function GanttTimeline({ createdAt, startedAt, finishedAt, status }: GanttTimelineProps) {
  const created = new Date(createdAt).getTime();
  const started = startedAt ? new Date(startedAt).getTime() : null;
  const finished = finishedAt ? new Date(finishedAt).getTime() : null;
  const now = Date.now();

  const end = finished || now;
  const total = Math.max(end - created, 1);

  // QUEUED phase: createdAt -> startedAt (or now if not started yet)
  const queueEnd = started || end;
  const queueDuration = queueEnd - created;
  const queuePct = (queueDuration / total) * 100;

  // RUNNING phase: startedAt -> finishedAt (or now if still running)
  const runDuration = started ? (end - started) : 0;
  const runPct = (runDuration / total) * 100;

  const isActive = !finished && ['RUNNING', 'DISPATCHING', 'QUEUED'].includes(status);

  return (
    <div className="panel" style={{ padding: '12px 16px', marginTop: 10 }}>
      <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 6, color: 'var(--dim)', marginBottom: 8 }}>
        LIFECYCLE TIMELINE
      </div>

      {/* Gantt bar */}
      <div style={{
        height: 16, background: 'var(--bg-deep)', border: '2px solid var(--border)',
        display: 'flex', overflow: 'hidden',
        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)',
      }}>
        {/* Queue segment */}
        {queuePct > 0 && (
          <div style={{
            width: `${queuePct}%`, minWidth: queuePct > 0 ? 2 : 0,
            background: 'repeating-linear-gradient(90deg, var(--cyan) 0px, var(--cyan) 6px, var(--cyan-dim) 6px, var(--cyan-dim) 8px)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)',
          }} />
        )}
        {/* Running segment */}
        {runPct > 0 && (
          <div style={{
            width: `${runPct}%`, minWidth: runPct > 0 ? 2 : 0,
            background: 'repeating-linear-gradient(90deg, var(--gold) 0px, var(--gold) 6px, var(--gold-dim) 6px, var(--gold-dim) 8px)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)',
            animation: isActive ? 'pulse 1.5s ease-in-out infinite' : 'none',
          }} />
        )}
      </div>

      {/* Labels */}
      <div style={{ display: 'flex', gap: 16, marginTop: 6, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 8, height: 8, background: 'var(--cyan)', border: '1px solid var(--cyan-dim)' }} />
          <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 6, color: 'var(--cyan)' }}>
            QUEUE {fmtDuration(queueDuration)}
          </span>
        </div>
        {started && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 8, height: 8, background: 'var(--gold)', border: '1px solid var(--gold-dim)' }} />
            <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 6, color: 'var(--gold)' }}>
              RUN {fmtDuration(runDuration)}
            </span>
          </div>
        )}
        <div style={{ marginLeft: 'auto' }}>
          <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 6, color: 'var(--dim)' }}>
            TOTAL {fmtDuration(total)}
          </span>
        </div>
      </div>
    </div>
  );
}
