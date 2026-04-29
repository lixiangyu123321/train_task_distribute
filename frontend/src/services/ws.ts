import { Client, IMessage } from '@stomp/stompjs';
import type { WsMessage } from '../types';

type Callback = (msg: WsMessage) => void;
const listeners: Map<string, Callback[]> = new Map();
let stompClient: Client | null = null;

function dispatch(msg: WsMessage) {
  const cbs = listeners.get(msg.type) || [];
  cbs.forEach((cb) => cb(msg));
}

function handleMessage(message: IMessage) {
  try {
    const data = JSON.parse(message.body);
    if (data.type) {
      dispatch(data as WsMessage);
    } else {
      dispatch({ type: 'DASHBOARD_SNAPSHOT', payload: data } as WsMessage);
    }
  } catch { /* skip non-JSON */ }
}

export function connectWebSocket() {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const brokerURL = `${proto}//${window.location.host}/ws/dashboard`;

  stompClient = new Client({
    brokerURL,
    reconnectDelay: 5000,
    onConnect: () => {
      stompClient?.subscribe('/topic/dashboard', handleMessage);
      stompClient?.subscribe('/topic/task-status', handleMessage);
      stompClient?.subscribe('/topic/node-resource', handleMessage);
    },
    onStompError: (frame) => {
      console.warn('STOMP error:', frame.headers['message']);
    },
  });

  stompClient.activate();
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
  stompClient?.deactivate();
}
