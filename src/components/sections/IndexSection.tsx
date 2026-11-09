'use client';

import { useRef, useState } from 'react';
import { projects } from '@/data/projects';
import { openProject } from '@/lib/gallery-store';

/*
 * The same eleven objects as a quiet ledger: title, kind of work, year.
 * Hover or focus a row to see its screen; activate it to open the project.
 */
export function IndexSection() {
  const [active, setActive] = useState<number | null>(null);
  // the preview keeps the last project pointed at, so the column is never empty
  const [preview, setPreview] = useState(0);
  const [top, setTop] = useState(0);
  const listRef = useRef<HTMLOListElement>(null);

  const show = (i: number, el: HTMLElement) => {
    setActive(i);
    setPreview(i);
    const list = listRef.current;
    if (list) setTop(el.offsetTop);
  };

  return (
    <section id="index" tabIndex={-1} className="index section" aria-labelledby="index-title">
      <div className="index__grid page-x">
        <h2 id="index-title" className="section-title">
          Index
        </h2>
        <div className="index__body">
          <ol ref={listRef} className={`ledger${active !== null ? ' has-active' : ''}`} onMouseLeave={() => setActive(null)}>
            {projects.map((p, i) => (
              <li key={p.id}>
                <button
                  type="button"
                  className={`ledger__row${active === i ? ' is-active' : ''}`}
                  onMouseEnter={(e) => show(i, e.currentTarget)}
                  onFocus={(e) => show(i, e.currentTarget)}
                  onBlur={() => setActive(null)}
                  onClick={() => openProject(i, 'index')}
                >
                  <span className="ledger__title" lang={p.lang}>
                    {p.title}
                  </span>
                  <span className="ledger__kind">{p.category}</span>
                  <span className="ledger__year tnum">{p.year}</span>
                </button>
              </li>
            ))}
          </ol>
          <div className="ledger__preview" aria-hidden="true" style={{ transform: `translateY(${top}px)` }}>
            {projects.map((p, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={p.id}
                src={p.thumbnail}
                width={480}
                height={300}
                alt=""
                loading="lazy"
                decoding="async"
                className={preview === i ? 'is-on' : undefined}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
