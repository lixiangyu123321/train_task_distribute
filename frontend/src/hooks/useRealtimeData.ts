import { useState, useEffect, useCallback, useRef } from 'react';
import { subscribe, subscribeTopic, getConnState, onConnStateChange } from '../services/ws';
import type { ConnectionState } from '../services/ws';

interface WsConfig<T> {
  topic?: string;
  type?: string;
  extract: (msg: any) => T | null;
}

export function useRealtimeData<T>(
  fetchFn: () => Promise<T>,
  intervalMs: number,
  wsConfig?: WsConfig<T>,
  deps: any[] = [],
): {
  data: T | null;
  loading: boolean;
  source: 'ws' | 'poll' | 'none';
  refresh: () => Promise<void>;
} {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<'ws' | 'poll' | 'none'>('none');
  const wsConnected = useRef(getConnState() === 'CONNECTED');
  const didInitialLoad = useRef(false);

  /* track WS connection state */
  useEffect(() => onConnStateChange((s: ConnectionState) => {
    wsConnected.current = s === 'CONNECTED';
  }), []);

  /* subscribe to WS data source */
  useEffect(() => {
    if (!wsConfig) return;

    const handler = (msg: any) => {
      const extracted = wsConfig.extract(msg);
      if (extracted !== null && extracted !== undefined) {
        setData(extracted);
        setLoading(false);
        setSource('ws');
      }
    };

    if (wsConfig.topic) {
      return subscribeTopic(wsConfig.topic, handler);
    }
    if (wsConfig.type) {
      return subscribe(wsConfig.type, handler);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wsConfig?.topic, wsConfig?.type]);

  /* fallback polling */
  const refresh = useCallback(async () => {
    if (didInitialLoad.current && wsConnected.current && wsConfig) return;
    if (!didInitialLoad.current) setLoading(true);
    try {
      const result = await fetchFn();
      if (result !== null && result !== undefined) {
        setData(result);
        setSource('poll');
        didInitialLoad.current = true;
      }
    } catch (e) {
      console.warn('Poll fallback error:', (e as Error).message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchFn]);

  useEffect(() => {
    refresh();
    if (intervalMs > 0) {
      const timer = setInterval(refresh, intervalMs);
      return () => clearInterval(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh, intervalMs, ...deps]);

  return { data, loading, source, refresh };
}
