import { useEffect, useRef, useState } from 'react';

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'offline' | 'error' | 'retrying';

export function useAutosave(text: string, save: (text: string) => void, options?: { delay?: number; simulateOffline?: boolean }) {
  const delay = options?.delay ?? 800;
  const [status, setStatus] = useState<AutosaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<string | undefined>();
  const firstRun = useRef(true);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];

    const debounceId = window.setTimeout(() => {
      const offline = options?.simulateOffline || !navigator.onLine;
      if (offline) {
        setStatus('offline');
        const retryId = window.setTimeout(() => {
          setStatus('retrying');
          const finalId = window.setTimeout(() => {
            const stillOffline = options?.simulateOffline || !navigator.onLine;
            if (stillOffline) {
              setStatus('error');
            } else {
              save(text);
              setStatus('saved');
              setLastSavedAt(new Date().toISOString());
            }
          }, 1600);
          timers.current.push(finalId);
        }, 1400);
        timers.current.push(retryId);
        return;
      }
      setStatus('saving');
      const saveId = window.setTimeout(() => {
        save(text);
        setStatus('saved');
        setLastSavedAt(new Date().toISOString());
      }, 400);
      timers.current.push(saveId);
    }, delay);
    timers.current.push(debounceId);

    return () => {
      timers.current.forEach((id) => window.clearTimeout(id));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, options?.simulateOffline]);

  return { status, lastSavedAt };
}
