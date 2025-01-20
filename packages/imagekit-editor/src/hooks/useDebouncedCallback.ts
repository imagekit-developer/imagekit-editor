import {useCallback, useEffect, useRef} from "react";
import {useCallbackRef} from "./useCallbackRef";

export function useDebouncedCallback<T extends (...args: any[]) => any>(callback: T, delay: number) {
  const handleCallback = useCallbackRef(callback);
  const debouncedTimerRef = useRef(0);
  useEffect(() => window.clearTimeout(debouncedTimerRef.current), []);

  return useCallback(
    (...args: Parameters<T>) => {
      window.clearTimeout(debouncedTimerRef.current);
      debouncedTimerRef.current = window.setTimeout(() => handleCallback(...args), delay);
    },
    [handleCallback, delay],
  );
}
