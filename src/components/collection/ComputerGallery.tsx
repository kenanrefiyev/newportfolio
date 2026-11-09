'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { projects } from '@/data/projects';
import { site } from '@/data/site';
import { ComputerScene, webglAvailable } from '@/lib/computer-scene';
import { galleryCommands, galleryStore, openProject, useGallery } from '@/lib/gallery-store';
import { getLenis, getScrollY, registerGsap, scrollToY } from '@/lib/scroll';
import { indexLabel } from '@/lib/project-utils';
import { useReducedMotion, useSwipeMode } from '@/hooks/useMedia';
import { ProjectMetadata } from './ProjectMetadata';
import { GalleryNavigation, IndexRail } from './GalleryNavigation';
import { ComputerItem } from './ComputerItem';

const N = projects.length;
const clampP = (p: number) => Math.max(0, Math.min(N - 1, p));
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
/** Scroll length of the opening camera move, in viewport heights (must match --intro-span in CSS). */
const INTRO_VH = 1.2;

export function ComputerGallery() {
  const swipe = useSwipeMode();
  const reduced = useReducedMotion();
  const selected = useGallery((s) => s.selected);
  const overlayOpen = useGallery((s) => s.open !== null);

  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<ComputerScene | null>(null);
  const triggerRef = useRef<ScrollTrigger | null>(null);
  const visibleRef = useRef(true);
  const fallbackP = useRef(0);
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [hoverScreen, setHoverScreen] = useState(false);
  const mode = swipe ? 'swipe' : 'shelf';

  /* ------------------------------------------------------------ position helpers */

  /** Current target shelf position (works with or without WebGL). */
  const getTarget = useCallback(() => sceneRef.current?.getTarget() ?? fallbackP.current, []);

  const setTarget = useCallback((p: number) => {
    const c = clampP(p);
    fallbackP.current = c;
    if (sceneRef.current) sceneRef.current.setTarget(c);
    else galleryStore.set({ selected: Math.round(c) });
  }, []);

  /** Scroll geometry of the pinned section: the intro first, then one step per computer. */
  const geometry = useCallback(() => {
    const st = triggerRef.current;
    if (!st) return null;
    const intro = window.innerHeight * INTRO_VH;
    return { start: st.start, intro, step: (st.end - st.start - intro) / (N - 1) };
  }, []);

  /** Scroll offset that shows shelf position p (shelf mode only). */
  const yFor = useCallback(
    (p: number) => {
      const g = geometry();
      if (!g) return getScrollY();
      return g.start + g.intro + clampP(p) * g.step;
    },
    [geometry],
  );

  /** Intro progress → camera, and the DOM layers that cross-fade with it. */
  const applyIntro = useCallback((v: number) => {
    sceneRef.current?.setIntro(v);
    const el = sectionRef.current;
    if (!el) return;
    el.style.setProperty("--intro", v.toFixed(3));
    el.classList.toggle("is-intro", v < 0.6);
  }, []);

  /** Last index asked for, so repeated key presses / clicks step from where the shelf is going, not where it is. */
  const pending = useRef({ index: 0, t: 0 });
  const baseIndex = () =>
    performance.now() - pending.current.t < 900 ? pending.current.index : galleryStore.get().selected;

  const goTo = useCallback(
    (index: number, opts: { immediate?: boolean } = {}) => {
      const i = Math.round(clampP(index));
      pending.current = { index: i, t: performance.now() };
      if (mode === 'shelf' && triggerRef.current) {
        const distance = Math.abs(i - getTarget());
        scrollToY(yFor(i), { immediate: opts.immediate || reduced, duration: Math.min(1.4, 0.55 + distance * 0.12) });
      } else {
        setTarget(i);
      }
      if (opts.immediate || reduced) {
        if (sceneRef.current) sceneRef.current.jump(i, 1);
        else galleryStore.set({ selected: i });
        fallbackP.current = i;
        applyIntro(1);
      }
    },
    [mode, reduced, getTarget, setTarget, yFor, applyIntro],
  );

  /* ------------------------------------------------------------ scene lifecycle */

  useEffect(() => {
    setWebgl(webglAvailable());
  }, []);

  useEffect(() => {
    if (!webgl || !canvasRef.current) return;
    const scene = new ComputerScene({
      canvas: canvasRef.current,
      projects: projects.map((p) => ({ id: p.id, texture: p.images.texture, scrollTexture: p.images.scrollTexture })),
      mode: window.matchMedia('(max-width: 767px), (pointer: coarse)').matches ? 'swipe' : 'shelf',
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      onSelect: (i) => galleryStore.set({ selected: i }),
      onScreenHover: setHoverScreen,
    });
    scene.jump(galleryStore.get().selected);
    sceneRef.current = scene;
    const ro = new ResizeObserver(() => scene.resize());
    ro.observe(canvasRef.current);
    return () => {
      ro.disconnect();
      scene.dispose();
      sceneRef.current = null;
    };
  }, [webgl]);

  useEffect(() => {
    sceneRef.current?.setMode(mode);
    if (mode === "swipe") applyIntro(1);
  }, [mode, webgl, applyIntro]);

  // Pause rendering while the collection is off-screen or covered by the overlay.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const io = new IntersectionObserver(([e]) => {
      visibleRef.current = e.isIntersecting;
      sceneRef.current?.setActive(e.isIntersecting && galleryStore.get().open === null);
    });
    io.observe(stage);
    return () => io.disconnect();
  }, [webgl]);

  useEffect(() => {
    sceneRef.current?.setActive(visibleRef.current && !overlayOpen);
  }, [overlayOpen]);

  /* ------------------------------------------------------------ shelf mode: vertical scroll drives the shelf */

  useEffect(() => {
    if (mode !== 'shelf' || !sectionRef.current) return;
    registerGsap();
    const st = ScrollTrigger.create({
      trigger: sectionRef.current,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => sync(self.scroll()),
    });
    triggerRef.current = st;
    function sync(y: number) {
      const g = geometry();
      if (!g) return;
      const scrolled = y - g.start;
      applyIntro(clamp01(scrolled / g.intro));
      setTarget(clampP((scrolled - g.intro) / g.step));
    }
    sync(getScrollY());

    // Snap to the nearest computer once scrolling settles inside the collection.
    let timer = 0;
    const onScroll = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (dragRef.current.active || galleryStore.get().open !== null) return;
        const y = getScrollY();
        const g = geometry();
        if (!g || y <= st.start + 2 || y >= st.end - 2) return;
        const scrolled = y - g.start;
        // the opening camera move stays under the hand: no snapping inside it
        if (scrolled < g.intro) return;
        const p = (scrolled - g.intro) / g.step;
        const nearest = Math.round(p);
        if (Math.abs(p - nearest) > 0.004) scrollToY(yFor(nearest), { duration: 0.55 });
      }, 140);
    };
    const lenis = getLenis();
    if (lenis) lenis.on('scroll', onScroll);
    else window.addEventListener('scroll', onScroll, { passive: true });
    ScrollTrigger.refresh();
    return () => {
      window.clearTimeout(timer);
      if (lenis) lenis.off('scroll', onScroll);
      else window.removeEventListener('scroll', onScroll);
      st.kill();
      triggerRef.current = null;
    };
  }, [mode, reduced, setTarget, yFor, geometry, applyIntro]);

  /* ------------------------------------------------------------ commands for the overlay and the index */

  useEffect(() => {
    galleryCommands.goTo = goTo;
    galleryCommands.screenRect = (i) => sceneRef.current?.screenRect(i) ?? null;
    galleryCommands.isCollectionVisible = () => {
      const r = stageRef.current?.getBoundingClientRect();
      return !!r && r.bottom > window.innerHeight * 0.5 && r.top < window.innerHeight * 0.5;
    };
  }, [goTo]);

  /* ------------------------------------------------------------ pointer: drag, click, look-through */

  const dragRef = useRef({ active: false, pressed: false, x: 0, y: 0, startP: 0, lastX: 0, lastT: 0, v: 0, id: -1 });

  const pxPerItem = () => {
    const w = stageRef.current?.clientWidth ?? window.innerWidth;
    return mode === 'shelf' ? w * 0.3 : w * 0.6;
  };

  const applyDragP = (p: number) => {
    if (mode === 'shelf' && triggerRef.current) scrollToY(yFor(p), { immediate: true });
    else setTarget(p);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const d = dragRef.current;
    d.pressed = true;
    d.active = false;
    d.x = d.lastX = e.clientX;
    d.y = e.clientY;
    d.lastT = performance.now();
    d.v = 0;
    d.id = e.pointerId;
    d.startP = getTarget();
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d.pressed) {
      if (e.pointerType === 'mouse') sceneRef.current?.setPointer(e.clientX, e.clientY);
      return;
    }
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.active) {
      if (Math.abs(dx) < 6 || Math.abs(dx) < Math.abs(dy)) return;
      d.active = true;
      try {
        stageRef.current?.setPointerCapture(e.pointerId);
      } catch {
        /* pointer already released (e.g. synthetic events) — dragging still works without capture */
      }
      sceneRef.current?.setPointer(null);
      stageRef.current?.classList.add('is-dragging');
    }
    const now = performance.now();
    const dt = Math.max(1, now - d.lastT);
    d.v = (e.clientX - d.lastX) / dt; // px per ms
    d.lastX = e.clientX;
    d.lastT = now;
    applyDragP(clampP(d.startP - dx / pxPerItem()));
  };

  const endDrag = (e: React.PointerEvent, cancelled = false) => {
    const d = dragRef.current;
    if (!d.pressed) return;
    d.pressed = false;
    stageRef.current?.classList.remove('is-dragging');
    if (stageRef.current?.hasPointerCapture(e.pointerId)) stageRef.current.releasePointerCapture(e.pointerId);
    if (d.active) {
      d.active = false;
      const dx = e.clientX - d.x;
      const raw = d.startP - dx / pxPerItem();
      // a quick flick carries on to the next computer
      const flick = Math.abs(d.v) > 0.45 ? -Math.sign(d.v) * 0.5 : 0;
      goTo(Math.round(clampP(raw + flick)));
      return;
    }
    if (cancelled) return;
    // A click: open the computer in front, or bring another one forward.
    const hit = sceneRef.current ? sceneRef.current.hitTest(e.clientX, e.clientY) : galleryStore.get().selected;
    if (hit === null) return;
    if (hit === galleryStore.get().selected) openProject(hit, 'collection');
    else goTo(hit);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const sel = baseIndex();
    const map: Record<string, number> = { ArrowRight: sel + 1, ArrowLeft: sel - 1, Home: 0, End: N - 1 };
    if (e.key in map) {
      e.preventDefault();
      goTo(map[e.key]);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openProject(sel, 'collection');
    }
  };

  const project = projects[selected];
  const hint = hoverScreen ? 'Point to browse it, click to open' : swipe ? 'Swipe to explore' : 'Scroll or drag to explore';

  return (
    <section
      id="work"
      ref={sectionRef}
      className="collection is-intro"
      data-mode={mode}
      style={{ '--n': N, '--intro': 0 } as React.CSSProperties}
      aria-labelledby="collection-title"
    >
      <div className="collection__stage">
        {/* Opening shot: the name beside one computer, before the camera steps back */}
        <div className="intro page-x">
          <h1 id="collection-title" className="intro__name" lang="az">
            {site.name.split(' ').map((word) => (
              <span key={word} className="intro__line">
                {word}
              </span>
            ))}
          </h1>
          <p className="intro__lede">Web developer. Eleven websites, designed and built in 2026.</p>
        </div>

        <div className="collection__head page-x">
          <p className="overline">Selected works</p>
          <p className="collection__count tnum" aria-hidden="true">
            {indexLabel(selected)}
          </p>
        </div>

        <div
          ref={stageRef}
          className={`collection__objects${hoverScreen ? ' is-screen' : ''}`}
          role="group"
          aria-roledescription="carousel"
          aria-label="Project collection. Left and right arrow keys browse, Enter opens the project in front."
          tabIndex={0}
          onKeyDown={onKeyDown}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={(e) => endDrag(e)}
          onPointerCancel={(e) => endDrag(e, true)}
          onPointerLeave={() => sceneRef.current?.setPointer(null)}
        >
          {webgl !== false && <canvas ref={canvasRef} className="collection__canvas" aria-hidden="true" />}
          {webgl === false && <ComputerItem project={project} />}
        </div>

        <p className="sr-only" aria-live="polite">
          {project.title}, {selected + 1} of {N}
        </p>

        <div className="collection__foot page-x">
          <ProjectMetadata project={project} />
          <IndexRail selected={selected} onGo={(i) => goTo(i)} />
          <GalleryNavigation
            selected={selected}
            hint={hint}
            onPrev={() => goTo(baseIndex() - 1)}
            onNext={() => goTo(baseIndex() + 1)}
            onOpen={() => openProject(selected, 'collection')}
          />
        </div>
      </div>
    </section>
  );
}
