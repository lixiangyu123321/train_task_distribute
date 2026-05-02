import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { fetchSchedules, fetchTemplates, createSchedule, deleteSchedule, toggleSchedule } from '../services/api';
import { showToast } from '../services/toast';
import { SkeletonTable } from '../components/Skeleton';
import type { ScheduledTaskItem, TaskTemplate } from '../types';

const CRON_PRESETS = [
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Every 6h', value: '0 */6 * * *' },
  { label: 'Daily 3AM', value: '0 3 * * *' },
  { label: 'Daily 9AM', value: '0 9 * * *' },
  { label: 'Mon-Fri 8AM', value: '0 8 * * 1-5' },
  { label: 'Weekly Mon', value: '0 0 * * 1' },
  { label: 'Monthly 1st', value: '0 0 1 * *' },
];

function cronToHuman(cron: string): string {
  const preset = CRON_PRESETS.find(p => p.value === cron);
  if (preset) return preset.label;
  const parts = cron.split(' ');
  if (parts.length !== 5) return cron;
  const [min, hour, dom, mon, dow] = parts;
  const pieces: string[] = [];
  if (dow !== '*' && dow !== '?') pieces.push(`DOW:${dow}`);
  if (mon !== '*') pieces.push(`MON:${mon}`);
  if (dom !== '*') pieces.push(`DOM:${dom}`);
  if (hour !== '*') pieces.push(`${hour}h`);
  if (min !== '*') pieces.push(`${min}m`);
  return pieces.length ? pieces.join(' ') : cron;
}

function formatDt(dt: string | null): string {
  if (!dt) return '--';
  const d = new Date(dt);
  if (isNaN(d.getTime())) return dt;
  return d.toLocaleString('sv-SE', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function ScheduleManager() {
  const { data: schedules, loading, refresh } = useApi<ScheduledTaskItem[]>(fetchSchedules);
  const { data: templates } = useApi<TaskTemplate[]>(fetchTemplates);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ templateId: '', taskName: '', cronExpression: '0 3 * * *' });
  const [submitting, setSubmitting] = useState(false);

  const templateMap = new Map((templates || []).map(t => [t.id, t]));

  async function handleCreate() {
    if (!form.templateId) { showToast('warning', 'SELECT A TEMPLATE'); return; }
    if (!form.cronExpression.trim()) { showToast('warning', 'CRON EXPRESSION REQUIRED'); return; }
    setSubmitting(true);
    try {
      await createSchedule({
        templateId: form.templateId,
        taskName: form.taskName || undefined,
        cronExpression: form.cronExpression,
      });
      showToast('success', 'SCHEDULE CREATED');
      setForm({ templateId: '', taskName: '', cronExpression: '0 3 * * *' });
      setShowForm(false);
      refresh();
    } catch { /* interceptor handles */ }
    setSubmitting(false);
  }

  async function handleToggle(id: string) {
    try {
      await toggleSchedule(id);
      refresh();
    } catch { /* interceptor handles */ }
  }

  async function handleDelete(id: string) {
    try {
      await deleteSchedule(id);
      showToast('success', 'SCHEDULE DELETED');
      refresh();
    } catch { /* interceptor handles */ }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h2 style={{ font: '10px var(--font-pixel)', color: 'var(--gold)', letterSpacing: 2, margin: 0 }}>
          SCHEDULED TASKS
        </h2>
        <button className="btn cyan" style={{ fontSize: 7 }} onClick={() => setShowForm(v => !v)}>
          {showForm ? 'CANCEL' : '+ ADD SCHEDULE'}
        </button>
      </div>

      {showForm && (
        <div className="panel" style={{ marginBottom: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ font: '7px var(--font-pixel)', color: 'var(--cyan)', marginBottom: 2, letterSpacing: 1 }}>
            NEW SCHEDULE
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <label style={{ font: '6px var(--font-pixel)', color: 'var(--dim)', display: 'block', marginBottom: 3 }}>
                TEMPLATE *
              </label>
              <select value={form.templateId} onChange={e => setForm(f => ({ ...f, templateId: e.target.value }))}
                style={{ width: '100%', padding: '6px 8px', background: 'var(--bg-deep)', color: 'var(--text)',
                  border: '2px solid var(--border)', font: '7px var(--font-mono)' }}>
                <option value="">-- SELECT --</option>
                {(templates || []).map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.type})</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ font: '6px var(--font-pixel)', color: 'var(--dim)', display: 'block', marginBottom: 3 }}>
                TASK NAME (optional)
              </label>
              <input value={form.taskName} onChange={e => setForm(f => ({ ...f, taskName: e.target.value }))}
                placeholder="Override template name"
                style={{ width: '100%', padding: '6px 8px', background: 'var(--bg-deep)', color: 'var(--text)',
                  border: '2px solid var(--border)', font: '7px var(--font-mono)', boxSizing: 'border-box' }} />
            </div>
          </div>

          <div>
            <label style={{ font: '6px var(--font-pixel)', color: 'var(--dim)', display: 'block', marginBottom: 3 }}>
              CRON EXPRESSION *
            </label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input value={form.cronExpression} onChange={e => setForm(f => ({ ...f, cronExpression: e.target.value }))}
                placeholder="0 3 * * *"
                style={{ flex: 1, padding: '6px 8px', background: 'var(--bg-deep)', color: 'var(--text)',
                  border: '2px solid var(--border)', font: '7px var(--font-mono)' }} />
              <select onChange={e => { if (e.target.value) setForm(f => ({ ...f, cronExpression: e.target.value })); }}
                value=""
                style={{ padding: '6px 8px', background: 'var(--bg-deep)', color: 'var(--cyan)',
                  border: '2px solid var(--border)', font: '6px var(--font-pixel)' }}>
                <option value="">PRESETS</option>
                {CRON_PRESETS.map(p => (
                  <option key={p.value} value={p.value}>{p.label} — {p.value}</option>
                ))}
              </select>
            </div>
            <div style={{ font: '6px var(--font-mono)', color: 'var(--muted)', marginTop: 3 }}>
              Format: MIN HOUR DOM MON DOW — e.g. "0 3 * * *" = daily at 3AM
            </div>
          </div>

          <button className="btn gold" style={{ fontSize: 7, alignSelf: 'flex-start', marginTop: 4 }}
            disabled={submitting} onClick={handleCreate}>
            {submitting ? 'CREATING...' : 'CREATE SCHEDULE'}
          </button>
        </div>
      )}

      {loading ? <SkeletonTable rows={5} /> : (
        <div className="panel" style={{ padding: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', font: '7px var(--font-mono)' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)', font: '6px var(--font-pixel)', color: 'var(--dim)' }}>
                <th style={{ padding: '8px 10px', textAlign: 'left' }}>NAME</th>
                <th style={{ padding: '8px 10px', textAlign: 'left' }}>TEMPLATE</th>
                <th style={{ padding: '8px 10px', textAlign: 'left' }}>CRON</th>
                <th style={{ padding: '8px 10px', textAlign: 'center' }}>ENABLED</th>
                <th style={{ padding: '8px 10px', textAlign: 'left' }}>LAST RUN</th>
                <th style={{ padding: '8px 10px', textAlign: 'left' }}>NEXT RUN</th>
                <th style={{ padding: '8px 10px', textAlign: 'center' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {(!schedules || schedules.length === 0) ? (
                <tr>
                  <td colSpan={7} style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', font: '7px var(--font-pixel)' }}>
                    NO SCHEDULED TASKS
                  </td>
                </tr>
              ) : schedules.map(s => {
                const tpl = templateMap.get(s.templateId);
                return (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--border)', opacity: s.enabled ? 1 : 0.5 }}>
                    <td style={{ padding: '8px 10px', color: 'var(--white)' }}>
                      {s.taskName || (tpl?.name) || '--'}
                    </td>
                    <td style={{ padding: '8px 10px', color: 'var(--cyan)' }}>
                      {tpl ? `${tpl.name}` : s.templateId.slice(0, 8)}
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <span style={{ color: 'var(--gold)' }}>{s.cronExpression}</span>
                      <span style={{ color: 'var(--muted)', marginLeft: 6, fontSize: 6 }}>
                        {cronToHuman(s.cronExpression)}
                      </span>
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                      <button
                        onClick={() => handleToggle(s.id)}
                        style={{
                          background: s.enabled ? 'rgba(80,200,120,0.15)' : 'rgba(255,80,80,0.1)',
                          border: `2px solid ${s.enabled ? 'var(--green)' : 'var(--red)'}`,
                          color: s.enabled ? 'var(--green)' : 'var(--red)',
                          padding: '3px 8px', font: '6px var(--font-pixel)', cursor: 'pointer',
                        }}>
                        {s.enabled ? 'ON' : 'OFF'}
                      </button>
                    </td>
                    <td style={{ padding: '8px 10px', color: 'var(--muted)' }}>{formatDt(s.lastRunAt)}</td>
                    <td style={{ padding: '8px 10px', color: s.enabled ? 'var(--cyan)' : 'var(--muted)' }}>
                      {formatDt(s.nextRunAt)}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                      <button className="btn red" style={{ fontSize: 6, padding: '3px 8px' }}
                        onClick={() => handleDelete(s.id)}>
                        DEL
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
