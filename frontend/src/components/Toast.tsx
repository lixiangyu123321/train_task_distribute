import { useState, useEffect, useCallback } from 'react';
import { onToast, type ToastItem } from '../services/toast';

const colorMap: Record<string, string> = {
  success: 'var(--green)',
  error: 'var(--red)',
  warning: 'var(--gold)',
};

export default function Toast() {
  const [toasts, setToasts] = useState<(ToastItem & { fading: boolean })[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, fading: true } : t));
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 300);
  }, []);

  useEffect(() => {
    return onToast((toast) => {
      setToasts(prev => [...prev, { ...toast, fading: false }]);
      setTimeout(() => dismiss(toast.id), 4000);
    });
  }, [dismiss]);

  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed', top: 16, right: 16, zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: 8,
      pointerEvents: 'none',
    }}>
      {toasts.map(t => (
        <div key={t.id} className="panel" style={{
          padding: '10px 16px',
          borderLeft: `4px solid ${colorMap[t.type] || 'var(--dim)'}`,
          font: '7px var(--font-pixel)',
          color: colorMap[t.type] || 'var(--dim)',
          minWidth: 200,
          maxWidth: 360,
          pointerEvents: 'auto',
          opacity: t.fading ? 0 : 1,
          transition: 'opacity 0.3s ease-out',
          cursor: 'pointer',
        }} onClick={() => dismiss(t.id)}>
          {t.type.toUpperCase()}: {t.message}
        </div>
      ))}
    </div>
  );
}
