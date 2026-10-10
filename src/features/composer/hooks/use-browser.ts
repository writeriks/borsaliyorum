'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';

/** `matchMedia` aboneliği; sunucuda ve ilk boyamada `false` (composer yalnızca istemcide). */
export const useMediaQuery = (query: string): boolean =>
  useSyncExternalStore(
    onChange => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => false
  );

/** Tailwind `md` (768px): üstünde popover, altında klavye üstü tam genişlik panel (tasarım §2.6). */
export const useIsDesktop = (): boolean => useMediaQuery('(min-width: 768px)');

export const useDebouncedValue = <T>(value: T, delayMs: number): T => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    // Gecikmesiz değer de saklanır: sonra gecikmeli moda geçildiğinde eski değer dönmesin
    const timer = setTimeout(() => setDebounced(value), Math.max(0, delayMs));
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return delayMs <= 0 ? value : debounced;
};

/** `value` `delayMs` boyunca kesintisiz `true` kaldıysa `true` (300 ms altı yüklemede skeleton yok). */
export const useDelayedFlag = (value: boolean, delayMs: number): boolean => {
  const [flag, setFlag] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setFlag(value), value ? delayMs : 0);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return value && flag;
};

export type VisualViewportBox = { height: number; offsetTop: number };

/**
 * Sanal klavye açıkken görünür alan (`visualViewport`); mobil sheet toolbar'ı bunun altına
 * yapışır ([CMP-04]). Desteklemeyen tarayıcıda `null` → CSS `100dvh` kullanılır.
 */
export const useVisualViewport = (enabled: boolean): VisualViewportBox | null => {
  const [box, setBox] = useState<VisualViewportBox | null>(null);
  useEffect(() => {
    const viewport = enabled ? window.visualViewport : null;
    if (!viewport) return;
    const update = (): void => setBox({ height: viewport.height, offsetTop: viewport.offsetTop });
    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
    };
  }, [enabled]);
  return enabled ? box : null;
};
