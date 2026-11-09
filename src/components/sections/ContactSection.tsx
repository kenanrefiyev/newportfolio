import { ArrowUpRight } from 'lucide-react';
import { site } from '@/data/site';

const display = (href: string) => href.replace(/^mailto:/, '').replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');

export function ContactSection() {
  return (
    <section id="contact" tabIndex={-1} className="contact section" aria-labelledby="contact-title">
      <div className="contact__grid page-x">
        <h2 id="contact-title" className="section-title">
          Contact
        </h2>
        <p className="contact__statement">
          Have a business that needs a website, or a site that needs rebuilding? Write to me.
        </p>
        <ul className="contact__list">
          {site.contact.map((c) => (
            <li key={c.label} className="contact__item">
              <span className="contact__label">{c.label}</span>
              {c.href ? (
                <a
                  className="link contact__value"
                  href={c.href}
                  {...(c.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                >
                  {c.display ?? display(c.href)}
                  {c.href.startsWith('http') && <ArrowUpRight size={16} strokeWidth={1.5} aria-hidden="true" />}
                </a>
              ) : (
                <span className="contact__value contact__value--todo" title="Not added yet: set it in src/data/site.ts">
                  to be added
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
