import { useCallback, useEffect, useRef, useState } from 'react';
import { api, errorMessage } from '../lib/http';

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string;
}

export function useApi<T>(path: string | null) {
  const [state, setState] = useState<ApiState<T>>({ data: null, loading: Boolean(path), error: '' });
  const [nonce, setNonce] = useState(0);
  const requestId = useRef(0);

  useEffect(() => {
    if (!path) {
      setState({ data: null, loading: false, error: '' });
      return;
    }

    const controller = new AbortController();
    const id = ++requestId.current;

    setState((previous) => ({ ...previous, loading: true, error: '' }));

    api<T>(path, { signal: controller.signal })
      .then((data) => {
        if (requestId.current === id) {
          setState({ data, loading: false, error: '' });
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || requestId.current !== id) {
          return;
        }

        setState({ data: null, loading: false, error: errorMessage(error) });
      });

    return () => controller.abort();
  }, [path, nonce]);

  const reload = useCallback(() => setNonce((value) => value + 1), []);

  return { ...state, reload, setData: (data: T) => setState({ data, loading: false, error: '' }) };
}
