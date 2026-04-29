import { useEffect, useState } from 'react';
import { subscribe } from '../services/ws';
import type { WsMessage } from '../types';

export function useWebSocketSubscription(type: string) {
  const [lastMessage, setLastMessage] = useState<WsMessage | null>(null);

  useEffect(() => {
    return subscribe(type, (msg) => setLastMessage(msg));
  }, [type]);

  return lastMessage;
}
