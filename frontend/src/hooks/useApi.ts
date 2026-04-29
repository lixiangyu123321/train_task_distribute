import { useState, useEffect, useCallback, useRef } from 'react';

export function useApi<T>(fetcher: () => Promise<T>, intervalMs = 0) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const callbackRef = useRef(fetcher);
  callbackRef.current = fetcher;

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await callbackRef.current();
      setData(result);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    if (intervalMs > 0) {
      const timer = setInterval(refresh, intervalMs);
      return () => clearInterval(timer);
    }
  }, [refresh, intervalMs]);

  return { data, loading, error, refresh };
}
