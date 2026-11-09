import { site } from '@/data/site';

export function Footer() {
  return (
    <footer className="site-footer page-x">
      <p className="site-footer__what">{site.name}, eleven websites</p>
      <ul className="site-footer__links">
        <li>
          <a className="link" href="#work">
            Work
          </a>
        </li>
        <li>
          <a className="link" href="#index">
            Index
          </a>
        </li>
        <li>
          <a className="link" href="#about">
            About
          </a>
        </li>
        <li>
          <a className="link" href="#contact">
            Contact
          </a>
        </li>
      </ul>
      <p className="site-footer__year tnum">2026</p>
    </footer>
  );
}
