'use client';

import { site } from '@/data/site';
import { scrollToElement } from '@/lib/scroll';

const LINKS = [
  { href: '#work', label: 'Work' },
  { href: '#about', label: 'About' },
  { href: '#contact', label: 'Contact' },
];

export function Header() {
  const onNav = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    const el = document.querySelector<HTMLElement>(href);
    if (!el) return;
    e.preventDefault();
    scrollToElement(el);
    history.replaceState(history.state, '', href === '#work' ? window.location.pathname : href);
    el.focus({ preventScroll: true });
  };

  return (
    <header className="site-header page-x">
      <a className="site-header__name" href="#work" onClick={(e) => onNav(e, '#work')}>
        {site.name}
        <span className="site-header__role">{site.role}</span>
      </a>
      <nav aria-label="Main">
        <ul className="site-header__nav">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a className="nav-link" href={l.href} onClick={(e) => onNav(e, l.href)}>
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
