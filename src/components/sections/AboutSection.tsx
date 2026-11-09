import { site } from '@/data/site';
import { projects } from '@/data/projects';

/** How many of the eleven projects use each technology — counted from the dataset, not typed in. */
function toolbox() {
  const counts = new Map<string, number>();
  for (const p of projects) for (const t of p.technologies) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 12);
}

/*
 * First-person letter. Every factual sentence is checked against the project audit
 * (sectors, countries, year, stacks). The tone and the last paragraph are a draft for
 * the owner to rewrite in their own words.
 */
export function AboutSection() {
  return (
    <section id="about" tabIndex={-1} className="about section" aria-labelledby="about-title">
      <div className="about__grid page-x">
        <div className="about__side">
          <h2 id="about-title" className="section-title">
            About
          </h2>
          <figure className="about__portrait">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/about/portrait.webp" width={460} height={460} alt={site.name} loading="lazy" decoding="async" />
          </figure>
        </div>
        <div className="about__letter">
          <p>
            I design and build websites. The eleven computers above each run one of them, all made in 2026, most for
            businesses in Azerbaijan and Türkiye: a car rental, two accounting firms, a jewellery shop, a tea house, a
            student-housing platform, a vintage marketplace, a music-instrument marketplace, an IT company, a design
            agency, and one experiment that is broken on purpose.
          </p>
          <p>
            I like starting from what a business already has. A printed menu becomes 152 searchable items; a fleet of
            cars becomes a booking flow; three languages become one site that switches cleanly between them.
          </p>
          <p>
            Most of my work is TypeScript with React and Next.js. Around that I use Vite, Meteor, Tailwind CSS, GSAP,
            Lenis and Framer Motion on the front end, and PostgreSQL with Prisma, MongoDB, SQLite and Express behind it.
          </p>
          <p>
            This portfolio is built the same way: Next.js, Three.js for the computers, and real captures of every live
            site on their screens.
          </p>
          <p className="about__sign">
            <span className="about__name">{site.name}</span>
            <span className="about__role">{site.role}</span>
          </p>
        </div>
        <figure className="about__tools">
          <figcaption>Used across the {projects.length} projects</figcaption>
          <table>
            <tbody>
              {toolbox().map(([name, n]) => (
                <tr key={name}>
                  <th scope="row">{name}</th>
                  <td className="tnum">{n}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </figure>
      </div>
    </section>
  );
}
