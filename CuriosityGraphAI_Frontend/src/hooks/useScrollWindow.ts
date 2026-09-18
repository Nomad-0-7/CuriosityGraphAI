import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface Options {
  count: number;        // total items
  itemSize: number;     // height of one slot (item + gap)
  padTop: number;       // padding before the first item
  overscan: number;     // extra items rendered above/below viewport
  resetKey?: string | null;
}

export interface ScrollWindow {
  containerRef: React.RefObject<HTMLDivElement | null>;
  setContainerRef: (el: HTMLDivElement | null) => void; // NEW — use this in JSX `ref={}`
  range: { start: number; end: number };
  scrollTop: number;
  viewport: { width: number; height: number };
  scrollToOffset: (offset: number, behavior?: ScrollBehavior) => void;
}

export function useScrollWindow({
  count,
  itemSize,
  padTop,
  overscan,
  resetKey = null,
}: Options): ScrollWindow {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });

  // Bumped whenever the DOM node actually attaches/detaches — not tied to resetKey
  const [attachTick, setAttachTick] = useState(0);
  const setContainerRef = useCallback((el: HTMLDivElement | null) => {
    if (containerRef.current === el) return;
    containerRef.current = el;
    setAttachTick((n) => n + 1);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let raf = 0;
    const measure = () =>
      setViewport({ width: el.clientWidth, height: el.clientHeight });
    measure();
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    });
    ro.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [resetKey, attachTick]); // <-- attachTick added

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setScrollTop(el.scrollTop));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("scroll", onScroll);
    };
  }, [resetKey, attachTick]); // <-- attachTick added

  const range = useMemo(() => {
    if (count <= 0) return { start: 1, end: 0 };
    if (itemSize <= 0 || viewport.height <= 0) {
      return { start: 1, end: Math.min(count, 1 + overscan * 2) };
    }
    const first = Math.floor((scrollTop - padTop) / itemSize) + 1;
    const last =
      Math.ceil((scrollTop + viewport.height - padTop) / itemSize) + 1;
    return {
      start: Math.max(1, first - overscan),
      end: Math.min(count, last + overscan),
    };
  }, [count, itemSize, padTop, overscan, scrollTop, viewport.height]);

  const scrollToOffset = useCallback(
    (offset: number, behavior: ScrollBehavior = "auto") => {
      containerRef.current?.scrollTo({ top: Math.max(0, offset), behavior });
    },
    [],
  );

  return { containerRef, setContainerRef, range, scrollTop, viewport, scrollToOffset };
}