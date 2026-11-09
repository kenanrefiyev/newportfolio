'use client';

import { useEffect } from 'react';
import { destroySmoothScroll, initSmoothScroll } from '@/lib/scroll';
import { useReducedMotion } from '@/hooks/useMedia';

/** Starts Lenis (unless the visitor prefers reduced motion) and keeps it in step with GSAP. */
export function SmoothScroll() {
  const reduced = useReducedMotion();
  useEffect(() => {
    initSmoothScroll(reduced);
    document.documentElement.classList.add('js');
    return () => destroySmoothScroll();
  }, [reduced]);
  return null;
}
