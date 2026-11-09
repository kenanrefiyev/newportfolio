'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ArrowLeft, ArrowRight, ArrowUpRight, X } from 'lucide-react';
import { projects } from '@/data/projects';
import { closeProject, galleryCommands, galleryStore, useGallery, type GalleryState } from '@/lib/gallery-store';
import { lockScroll } from '@/lib/scroll';
import { hostOf, indexLabel, indexOfId, wrapIndex } from '@/lib/project-utils';
import { useReducedMotion } from '@/hooks/useMedia';
import { ProjectImageGallery } from './ProjectImageGallery';

const EASE = 'expo.inOut';
const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function ProjectOverlay() {
  const open = useGallery((s) => s.open);
  const reduced = useReducedMotion();
  const [shown, setShown] = useState<number | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLImageElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const phase = useRef<'closed' | 'opening' | 'open' | 'closing'>('closed');
  const origin = useRef<GalleryState['origin']>(null);
  const pushed = useRef(false);
  const returnFocus = useRef<HTMLElement | null>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);

  /* ------------------------------------------------------------ URL ⇄ state */

  useEffect(() => {
    // The overlay owns scroll position across its history entries; the browser must not restore it on Back.
    history.scrollRestoration = 'manual';
    // deep link: /?project=<id>
    const id = new URL(window.location.href).searchParams.get('project');
    const i = indexOfId(id);
    if (i >= 0) galleryStore.set({ open: i, origin: 'url', selected: i });

    const onPop = () => {
      const idx = indexOfId(new URL(window.location.href).searchParams.get('project'));
      if (idx >= 0) {
        galleryStore.set({ open: idx, origin: galleryStore.get().open === null ? 'url' : galleryStore.get().origin });
      } else {
        pushed.current = false;
        closeProject();
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const requestClose = useCallback(() => {
    if (pushed.current) {
      pushed.current = false;
      history.back(); // popstate closes
    } else {
      if (new URL(window.location.href).searchParams.has('project')) history.replaceState(null, '', window.location.pathname);
      closeProject();
    }
  }, []);

  /* ------------------------------------------------------------ react to the store */

  useEffect(() => {
    if (open !== null && shown === null && phase.current === 'closed') {
      returnFocus.current = document.activeElement as HTMLElement | null;
      origin.current = galleryStore.get().origin;
      if (origin.current !== 'url') {
        history.pushState({ project: projects[open].id }, '', `?project=${projects[open].id}`);
        pushed.current = true;
      }
      lockScroll(true);
      phase.current = 'opening';
      setShown(open);
    } else if (open !== null && shown !== null && open !== shown && phase.current === 'open') {
      swap(open);
    } else if (open === null && shown !== null && phase.current !== 'closing') {
      runClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /* ------------------------------------------------------------ opening: the screen becomes the page */

  useLayoutEffect(() => {
    if (shown === null || phase.current !== 'opening') return;
    const root = rootRef.current!;
    const hero = heroRef.current!;
    const fades = root.querySelectorAll<HTMLElement>('[data-ov-fade]');
    scrollRef.current!.scrollTop = 0;

    const from = origin.current !== 'index' && galleryCommands.isCollectionVisible() ? galleryCommands.screenRect(shown) : null;
    tl.current?.kill();
    const t = gsap.timeline({
      onComplete: () => {
        phase.current = 'open';
        closeRef.current?.focus({ preventScroll: true });
        // the store may have moved on while we animated
        const now = galleryStore.get().open;
        if (now === null) runClose();
        else if (now !== shown) swap(now);
      },
    });
    tl.current = t;

    if (reduced || !from) {
      t.fromTo(backdropRef.current, { opacity: 0 }, { opacity: 1, duration: reduced ? 0.2 : 0.45, ease: 'power2.out' })
        .fromTo(hero, { opacity: 0 }, { opacity: 1, duration: reduced ? 0.2 : 0.5 }, '<0.05')
        .fromTo(fades, { opacity: 0, y: reduced ? 0 : 16 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.05, ease: 'power3.out' }, '<0.1');
      return;
    }

    const to = hero.getBoundingClientRect();
    gsap.set(hero, {
      transformOrigin: '0 0',
      x: from.x - to.left,
      y: from.y - to.top,
      scaleX: from.width / to.width,
      scaleY: from.height / to.height,
    });
    gsap.set(fades, { opacity: 0, y: 18 });
    t.fromTo(backdropRef.current, { opacity: 0 }, { opacity: 1, duration: 0.55, ease: 'power2.inOut' }, 0)
      .to(hero, { x: 0, y: 0, scaleX: 1, scaleY: 1, duration: 1.05, ease: EASE }, 0.05)
      .to(fades, { opacity: 1, y: 0, duration: 0.6, stagger: 0.06, ease: 'power3.out' }, 0.62);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown]);

  /* ------------------------------------------------------------ closing: the page returns to its computer */

  function runClose() {
    if (shown === null && phase.current === 'closed') return;
    phase.current = 'closing';
    const root = rootRef.current;
    const hero = heroRef.current;
    const index = galleryStore.get().selected;
    const current = shownRef.current;
    if (!root || !hero || current === null) return finishClose();

    const fades = root.querySelectorAll<HTMLElement>('[data-ov-fade], .gallery');
    let to: ReturnType<typeof galleryCommands.screenRect> = null;
    if (origin.current !== 'index') {
      galleryCommands.goTo(current, { immediate: true }); // restore the shelf on this computer
      scrollRef.current!.scrollTop = 0;
      if (galleryCommands.isCollectionVisible()) to = galleryCommands.screenRect(current);
    }
    void index;
    tl.current?.kill();
    const t = gsap.timeline({ onComplete: finishClose });
    tl.current = t;
    if (reduced || !to) {
      t.to(root, { opacity: 0, duration: reduced ? 0.15 : 0.35, ease: 'power2.out' });
      return;
    }
    const from = hero.getBoundingClientRect();
    t.to(fades, { opacity: 0, y: 10, duration: 0.25, ease: 'power2.in' }, 0)
      .to(
        hero,
        {
          transformOrigin: '0 0',
          x: to.x - from.left,
          y: to.y - from.top,
          scaleX: to.width / from.width,
          scaleY: to.height / from.height,
          duration: 0.85,
          ease: EASE,
        },
        0.1,
      )
      .to(backdropRef.current, { opacity: 0, duration: 0.5, ease: 'power2.inOut' }, 0.42)
      .set(hero, { opacity: 0 });
  }

  function finishClose() {
    phase.current = 'closed';
    lockScroll(false);
    setShown(null);
    const back = returnFocus.current;
    if (back && document.contains(back)) back.focus({ preventScroll: true });
    else document.querySelector<HTMLElement>('.collection__objects')?.focus({ preventScroll: true });
  }

  /* ------------------------------------------------------------ previous / next inside the overlay */

  const shownRef = useRef<number | null>(null);
  shownRef.current = shown;

  function swap(next: number) {
    const root = rootRef.current;
    if (!root) return setShown(next);
    const items = root.querySelectorAll<HTMLElement>('[data-ov-swap]');
    tl.current?.kill();
    const t = gsap.timeline();
    tl.current = t;
    t.to(items, { opacity: 0, duration: reduced ? 0.1 : 0.22, ease: 'power2.in' }).add(() => {
      setShown(next);
      galleryStore.set({ selected: next });
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
      requestAnimationFrame(() => {
        gsap.fromTo(
          root.querySelectorAll('[data-ov-swap]'),
          { opacity: 0, y: reduced ? 0 : 14 },
          { opacity: 1, y: 0, duration: 0.5, stagger: 0.04, ease: 'power3.out' },
        );
      });
    });
  }

  const go = (delta: number) => {
    if (shown === null) return;
    const next = wrapIndex(shown + delta);
    history.replaceState({ project: projects[next].id }, '', `?project=${projects[next].id}`);
    galleryStore.set({ open: next });
  };

  /* ------------------------------------------------------------ keyboard: Escape, focus trap, arrows */

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      requestClose();
      return;
    }
    if (e.key === 'Tab') {
      const list = [...rootRef.current!.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (!list.length) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  if (shown === null) return null;
  const p = projects[shown];
  const prev = projects[wrapIndex(shown - 1)];
  const next = projects[wrapIndex(shown + 1)];

  return (
    <div ref={rootRef} className="overlay" role="dialog" aria-modal="true" aria-labelledby="overlay-title" onKeyDown={onKeyDown}>
      <div ref={backdropRef} className="overlay__backdrop" />
      <div ref={scrollRef} className="overlay__scroll" data-lenis-prevent>
        <header className="overlay__bar page-x" data-ov-fade>
          <p className="overlay__index tnum" data-ov-swap>
            {indexLabel(shown)}
          </p>
          <p className="overlay__category" data-ov-swap>
            {p.category}
          </p>
          <button ref={closeRef} type="button" className="overlay__close" onClick={requestClose}>
            <span>Close project</span>
            <X size={18} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </header>

        <div className="overlay__inner page-x">
          <h2 id="overlay-title" className="overlay__title" lang={p.lang} data-ov-fade data-ov-swap>
            {p.title}
          </h2>

          <figure className="overlay__hero">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={heroRef}
              key={p.id}
              src={p.screenshot}
              width={1440}
              height={900}
              alt={`${p.title} homepage, captured from the live site in a desktop browser`}
              data-ov-swap
            />
          </figure>

          <div className="overlay__info" data-ov-fade data-ov-swap>
            <p className="overlay__desc">{p.description}</p>
            <dl className="overlay__facts">
              <div>
                <dt>Role</dt>
                <dd>{p.role}</dd>
              </div>
              <div>
                <dt>Year</dt>
                <dd className="tnum">{p.year}</dd>
              </div>
              <div>
                <dt>Built with</dt>
                <dd>
                  <ul className="tech">
                    {p.technologies.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                </dd>
              </div>
              <div>
                <dt>Live site</dt>
                <dd>{hostOf(p.url)}</dd>
              </div>
            </dl>
            <a className="btn btn--primary btn--wide" href={p.url} target="_blank" rel="noopener noreferrer">
              Visit live website
              <ArrowUpRight size={18} strokeWidth={1.5} aria-hidden="true" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </div>

          <ProjectImageGallery project={p} />

          <nav className="overlay__nav" aria-label="More projects" data-ov-fade>
            <button type="button" className="overlay__step" onClick={() => go(-1)}>
              <span className="overline">
                <ArrowLeft size={14} strokeWidth={1.5} aria-hidden="true" /> Previous project
              </span>
              <span className="overlay__step-title" lang={prev.lang}>
                {prev.title}
              </span>
            </button>
            <button type="button" className="overlay__step overlay__step--next" onClick={() => go(1)}>
              <span className="overline">
                Next project <ArrowRight size={14} strokeWidth={1.5} aria-hidden="true" />
              </span>
              <span className="overlay__step-title" lang={next.lang}>
                {next.title}
              </span>
            </button>
          </nav>
          <div className="overlay__end">
            <button type="button" className="link" onClick={requestClose}>
              Close project
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
