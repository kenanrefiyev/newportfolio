'use client';

import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/*
 * One Lenis instance for the page, driven by GSAP's ticker so ScrollTrigger and Lenis
 * agree on every frame. With reduced motion Lenis is not created and the page scrolls natively.
 */

let lenis: Lenis | null = null;
let registered = false;

export function registerGsap() {
  if (registered || typeof window === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);
  registered = true;
}

const raf = (time: number) => lenis?.raf(time * 1000);

export function initSmoothScroll(reducedMotion: boolean) {
  registerGsap();
  if (lenis || reducedMotion) return lenis;
  lenis = new Lenis({ lerp: 0.11, wheelMultiplier: 0.9, touchMultiplier: 1.1, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(raf);
  gsap.ticker.lagSmoothing(0);
  return lenis;
}

export function destroySmoothScroll() {
  if (!lenis) return;
  gsap.ticker.remove(raf);
  lenis.destroy();
  lenis = null;
}

export function getLenis() {
  return lenis;
}

export function getScrollY() {
  return lenis ? lenis.scroll : window.scrollY;
}

export function scrollToY(y: number, opts: { immediate?: boolean; duration?: number } = {}) {
  if (lenis) {
    lenis.scrollTo(y, { immediate: opts.immediate, duration: opts.duration ?? 0.9, force: true });
    // Lenis ignores immediate jumps while stopped (overlay open); move the window as well
    if (opts.immediate) window.scrollTo(0, y);
  } else {
    window.scrollTo({ top: y, behavior: opts.immediate ? 'auto' : 'smooth' });
  }
}

export function scrollToElement(el: HTMLElement, opts: { immediate?: boolean; offset?: number } = {}) {
  const y = el.getBoundingClientRect().top + getScrollY() + (opts.offset ?? 0);
  scrollToY(y, { immediate: opts.immediate, duration: 1.1 });
}

export function lockScroll(locked: boolean) {
  if (lenis) {
    if (locked) lenis.stop();
    else {
      lenis.start();
      // resync Lenis with wherever the page was moved while it was stopped
      lenis.scrollTo(window.scrollY, { immediate: true, force: true });
    }
  }
  document.documentElement.classList.toggle('is-locked', locked);
}
