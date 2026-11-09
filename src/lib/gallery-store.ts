'use client';

import { useSyncExternalStore } from 'react';
import type { ScreenRect } from './computer-scene';

/*
 * Tiny shared store for the collection. The 3D scene updates `selected` only when the
 * nearest computer changes, so React re-renders a handful of times per scroll, never per frame.
 */

export interface GalleryState {
  selected: number;
  /** Index of the project open in the overlay, or null. */
  open: number | null;
  /** Where the open request came from, for the opening transition and focus return. */
  origin: 'collection' | 'index' | 'url' | null;
}

let state: GalleryState = { selected: 0, open: null, origin: null };
const listeners = new Set<() => void>();

export const galleryStore = {
  get: () => state,
  set(partial: Partial<GalleryState>) {
    const next = { ...state, ...partial };
    if (next.selected === state.selected && next.open === state.open && next.origin === state.origin) return;
    state = next;
    listeners.forEach((l) => l());
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export function useGallery<T>(selector: (s: GalleryState) => T): T {
  return useSyncExternalStore(
    galleryStore.subscribe,
    () => selector(state),
    () => selector({ selected: 0, open: null, origin: null }),
  );
}

/** Commands the collection registers so the overlay and the index can drive it. */
export const galleryCommands: {
  goTo: (index: number, opts?: { immediate?: boolean }) => void;
  screenRect: (index: number) => ScreenRect | null;
  isCollectionVisible: () => boolean;
} = {
  goTo: () => {},
  screenRect: () => null,
  isCollectionVisible: () => false,
};

export function openProject(index: number, origin: GalleryState['origin']) {
  galleryStore.set({ open: index, origin });
}

export function closeProject() {
  galleryStore.set({ open: null });
}
