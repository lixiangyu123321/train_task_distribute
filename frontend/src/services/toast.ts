export type ToastType = 'success' | 'error' | 'warning';
export interface ToastItem { id: number; type: ToastType; message: string; }
type Listener = (toast: ToastItem) => void;

const listeners: Set<Listener> = new Set();
let nextId = 0;

export function showToast(type: ToastType, message: string) {
  const toast: ToastItem = { id: nextId++, type, message };
  listeners.forEach(cb => cb(toast));
}

export function onToast(cb: Listener): () => void {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}
