'use client';

import { ArrowLeft, ArrowRight } from 'lucide-react';
import { projects } from '@/data/projects';

interface Props {
  selected: number;
  hint: string;
  onPrev: () => void;
  onNext: () => void;
  onOpen: () => void;
}

export function GalleryNavigation({ selected, hint, onPrev, onNext, onOpen }: Props) {
  const last = projects.length - 1;
  return (
    <div className="controls">
      <p className="controls__hint overline" aria-hidden="true">
        {hint}
      </p>
      <div className="controls__row">
        <button type="button" className="icon-btn" onClick={onPrev} disabled={selected === 0} aria-label="Previous project">
          <ArrowLeft size={18} strokeWidth={1.5} aria-hidden="true" />
        </button>
        <button type="button" className="icon-btn" onClick={onNext} disabled={selected === last} aria-label="Next project">
          <ArrowRight size={18} strokeWidth={1.5} aria-hidden="true" />
        </button>
        <button type="button" className="btn btn--primary" onClick={onOpen}>
          Open project
        </button>
      </div>
    </div>
  );
}

/** Index of objects: one tick per computer; jumps straight to it. */
export function IndexRail({ selected, onGo }: { selected: number; onGo: (i: number) => void }) {
  return (
    <ol className="rail" aria-label="Jump to a project">
      {projects.map((p, i) => (
        <li key={p.id}>
          <button
            type="button"
            className="rail__btn"
            aria-label={`${p.title}, ${i + 1} of ${projects.length}`}
            aria-current={i === selected ? 'true' : undefined}
            onClick={() => onGo(i)}
          >
            <span className="rail__tick" />
            <span className="rail__tip" aria-hidden="true">
              {p.title}
            </span>
          </button>
        </li>
      ))}
    </ol>
  );
}
