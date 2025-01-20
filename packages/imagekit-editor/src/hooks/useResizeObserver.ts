import {useCallback, useEffect, useMemo, useRef} from "react";

type OnResizeFn = (data: {entry: ResizeObserverEntry; width: number; height: number}) => void;

const useResizeObserver = (
  onResize: OnResizeFn = () => {},
): [
  observeElement: (element: HTMLElement | null, newOnResizeCallback?: OnResizeFn) => void,
  unobserveElement: (element: HTMLElement | null, newOnResizeCallback?: OnResizeFn) => void,
  updateOnResizeCallback: (newOnResizeCallback: OnResizeFn) => void,
] => {
  const onResizeCallback = useRef<OnResizeFn>(onResize);
  const resizeObserver = useRef<ResizeObserver>();

  const observerCallback = useCallback((entries: ResizeObserverEntry[]) => {
    entries.forEach((entry) => {
      if (entry.contentRect) {
        const {width, height} = entry.contentRect;

        onResizeCallback.current?.({
          entry,
          width,
          height,
        });
      }
    });
  }, []);

  const updateOnResizeCallback = useCallback((newOnResizeCallback: OnResizeFn) => {
    onResizeCallback.current = newOnResizeCallback;
  }, []);

  const initObserver = useCallback(() => {
    if (!resizeObserver.current) {
      resizeObserver.current = new ResizeObserver(observerCallback);
    }
  }, []);

  const observeElement = useCallback((element: HTMLElement | null, newOnResizeCallback?: OnResizeFn) => {
    if (element) {
      if (!resizeObserver.current) {
        initObserver();
      }

      resizeObserver.current!.observe(element);

      if (newOnResizeCallback) {
        onResizeCallback.current = newOnResizeCallback;
      }
    }
  }, []);

  const unobserveElement = useCallback((element: HTMLElement | null, newOnResizeCallback?: OnResizeFn) => {
    if (resizeObserver.current && element) {
      resizeObserver.current.unobserve(element);

      if (newOnResizeCallback) {
        onResizeCallback.current = newOnResizeCallback;
      }
    }
  }, []);

  const removeObserver = useCallback(() => {
    if (resizeObserver.current) {
      resizeObserver.current.disconnect();
    }
  }, []);

  useEffect(() => {
    initObserver();
    return removeObserver;
  }, []);

  return useMemo(() => [observeElement, unobserveElement, updateOnResizeCallback], []);
};

export default useResizeObserver;
