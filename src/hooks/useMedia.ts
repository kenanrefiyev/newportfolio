'use client';

import { useSyncExternalStore } from 'react';

function subscribeTo(query: string) {
  return (cb: () => void) => {
    const mql = window.matchMedia(query);
    mql.addEventListener('change', cb);
    return () => mql.removeEventListener('change', cb);
  };
}

/** SSR-safe media query hook. `fallback` is used on the server and the first client render. */
export function useMedia(query: string, fallback = false) {
  return useSyncExternalStore(
    subscribeTo(query),
    () => window.matchMedia(query).matches,
    () => fallback,
  );
}

export const useReducedMotion = () => useMedia('(prefers-reduced-motion: reduce)');

/** Touch-first or narrow screens get the swipe collection instead of the scroll-driven shelf. */
export const useSwipeMode = () => useMedia('(max-width: 767px), (pointer: coarse)');
