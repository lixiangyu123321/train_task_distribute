import { useState, useEffect, useCallback, useRef } from 'react';

export function useApi<T>(fetcher: () => Promise<T>, intervalMs = 0, deps: any[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const callbackRef = useRef(fetcher);
  callbackRef.current = fetcher;
  const hasLoaded = useRef(false);

  const refresh = useCallback(async () => {
    if (!hasLoaded.current) setLoading(true);
    setError(null);
    const maxRetries = 3;
    const delays = [1000, 2000, 4000];
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await callbackRef.current();
        setData(result);
        hasLoaded.current = true;
        setLoading(false);
        return;
      } catch (e: any) {
        const status = e?.response?.status;
        if (status && status >= 400 && status < 500) {
          setError(e.message);
          setLoading(false);
          return;
        }
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, delays[attempt]));
        } else {
          setError(e.message);
          setLoading(false);
        }
      }
    }
  }, []);

  useEffect(() => {
    refresh();
    if (intervalMs > 0) {
      const timer = setInterval(refresh, intervalMs);
      return () => clearInterval(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh, intervalMs, ...deps]);

  return { data, loading, error, refresh };
}
