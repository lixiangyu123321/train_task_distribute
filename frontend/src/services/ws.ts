import type { WsMessage } from '../types';

type Callback = (msg: WsMessage) => void;
const listeners: Map<string, Callback[]> = new Map();
let stompClient: WebSocket | null = null;

export function connectWebSocket(schedulerHost: string) {
  const wsUrl = `ws://${schedulerHost}:8081/ws/dashboard`;
  stompClient = new WebSocket(wsUrl);
  stompClient.onmessage = (event) => {
    try {
      const msg: WsMessage = JSON.parse(event.data);
      const cbs = listeners.get(msg.type) || [];
      cbs.forEach((cb) => cb(msg));
    } catch {
      // skip non-JSON frames
    }
  };
  stompClient.onclose = () => {
    setTimeout(() => connectWebSocket(schedulerHost), 5000);
  };
}

export function subscribe(type: string, callback: Callback) {
  const existing = listeners.get(type) || [];
  existing.push(callback);
  listeners.set(type, existing);
  return () => {
    const updated = (listeners.get(type) || []).filter((cb) => cb !== callback);
    listeners.set(type, updated);
  };
}

export function disconnectWebSocket() {
  stompClient?.close();
}
