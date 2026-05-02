import { Client, IMessage } from '@stomp/stompjs';
import type { WsMessage } from '../types';

export type ConnectionState = 'CONNECTED' | 'DISCONNECTED';

type Callback = (msg: WsMessage) => void;
type TopicCallback = (body: any) => void;

let stompClient: Client | null = null;
let connState: ConnectionState = 'DISCONNECTED';
const stateCbs: Set<(s: ConnectionState) => void> = new Set();

/* ── type-based dispatch (original pattern) ── */
const listeners: Map<string, Callback[]> = new Map();

/* ── dynamic topic subscriptions ── */
interface TopicSub {
  id: string;
  cbs: Set<TopicCallback>;
}
const topicSubs: Map<string, TopicSub> = new Map();

/* ── connection state ── */

export function getConnState(): ConnectionState {
  return connState;
}

export function onConnStateChange(cb: (s: ConnectionState) => void): () => void {
  stateCbs.add(cb);
  return () => { stateCbs.delete(cb); };
}

/* ── message dispatch (original pattern) ── */

function dispatch(msg: WsMessage) {
  const cbs = listeners.get(msg.type);
  if (cbs) cbs.forEach(cb => cb(msg));
}

function handleMessage(message: IMessage) {
  try {
    const data = JSON.parse(message.body);
    if (data && data.type) {
      dispatch(data as WsMessage);
    } else {
      dispatch({ type: 'DASHBOARD_SNAPSHOT', payload: data } as WsMessage);
    }
  } catch (e) {
    console.warn('WS parse error:', e);
  }
}

/* ── public API ── */

export function subscribe(type: string, cb: Callback): () => void {
  const existing = listeners.get(type) || [];
  existing.push(cb);
  listeners.set(type, existing);
  return () => {
    const updated = (listeners.get(type) || []).filter(c => c !== cb);
    listeners.set(type, updated);
  };
}

export function subscribeTopic(topic: string, cb: TopicCallback): () => void {
  let entry = topicSubs.get(topic);
  if (!entry) {
    const sub = stompClient?.connected
      ? stompClient.subscribe(topic, (msg) => {
          try {
            const body = JSON.parse(msg.body);
            const e = topicSubs.get(topic);
            if (e) e.cbs.forEach(c => c(body));
          } catch { /* skip */ }
        })
      : null;
    entry = { id: sub?.id || '', cbs: new Set() };
    topicSubs.set(topic, entry);
  }
  entry.cbs.add(cb);
  return () => {
    const e = topicSubs.get(topic);
    if (!e) return;
    e.cbs.delete(cb);
    if (e.cbs.size === 0) {
      topicSubs.delete(topic);
    }
  };
}

export function publish(dest: string, body: unknown) {
  if (stompClient?.connected) {
    stompClient.publish({ destination: dest, body: JSON.stringify(body) });
  }
}

/* ── lifecycle (keep close to original) ── */

export function connectWebSocket() {
  if (stompClient?.active) return;

  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  stompClient = new Client({
    brokerURL: `${proto}//${window.location.host}/ws/dashboard`,
    reconnectDelay: 5000,
    onConnect: () => {
      connState = 'CONNECTED';
      stateCbs.forEach(cb => cb('CONNECTED'));
      stompClient!.subscribe('/topic/dashboard', handleMessage);
      stompClient!.subscribe('/topic/task-status', handleMessage);
      stompClient!.subscribe('/topic/node-resource', handleMessage);
      /* resubscribe dynamic topics */
      for (const [topic, entry] of topicSubs) {
        const sub = stompClient!.subscribe(topic, (msg) => {
          try {
            const body = JSON.parse(msg.body);
            const e = topicSubs.get(topic);
            if (e) e.cbs.forEach(c => c(body));
          } catch { /* skip */ }
        });
        entry.id = sub.id;
      }
    },
    onStompError: (frame) => {
      console.warn('STOMP error:', frame.headers['message']);
    },
  });

  stompClient.activate();
}

export function disconnectWebSocket() {
  stompClient?.deactivate();
  stompClient = null;
  connState = 'DISCONNECTED';
  stateCbs.forEach(cb => cb('DISCONNECTED'));
}
