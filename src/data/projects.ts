import type { PortfolioProject } from '@/types/project';
import manifest from './asset-manifest.json';

/*
 * The collection. Order here is the order on the shelf.
 *
 * Sources of truth (audited 2026-11-09):
 *  - title / category / description: the live site (title tag, meta description, headings, navigation)
 *  - technologies: the live build (framework fingerprints, response headers) cross-checked with the
 *    project's own package.json / build notes. Nothing is listed that was not verified.
 *  - year: project build dates (all 2026).
 *  - role: from the brief ("websites I have developed"). Edit per project if needed.
 * Screens are real captures of the live homepages (scripts/capture-screens.mjs → scripts/build-assets.mjs).
 */

type Manifest = Record<
  string,
  { screen?: boolean; fullPage?: { width: number; height: number }; scrollTex?: { width: number; height: number }; mobile?: boolean }
>;
const m = manifest as Manifest;

function images(slug: string) {
  const e = m[slug] ?? {};
  const base = `/projects/${slug}`;
  return {
    screen: `${base}/screen.webp`,
    texture: `${base}/texture.webp`,
    fullPage: e.fullPage ? { src: `${base}/full-page.webp`, ...e.fullPage } : null,
    scrollTexture: e.scrollTex ? { src: `${base}/scroll-tex.webp`, ...e.scrollTex } : null,
    mobile: e.mobile ? `${base}/mobile.webp` : null,
  };
}

const ROLE = 'Design & development';

type Input = Omit<PortfolioProject, 'images' | 'screenshot' | 'thumbnail' | 'role'> & { role?: string };

const input: Input[] = [
  {
    id: 'galaxy-technology',
    title: 'Galaxy Technology',
    url: 'https://galaxytechnology.az/',
    category: 'IT company',
    year: '2026',
    lang: 'az',
    description:
      'Website for a Baku IT company that builds websites, CRM and ERP systems, AI tools, cybersecurity services and social-media bots. Three languages (Azerbaijani, English, Russian), a blog and an admin panel backed by its own API.',
    technologies: ['React', 'TypeScript', 'Vite', 'Tailwind CSS', 'Framer Motion', 'Express', 'SQLite'],
    featured: true,
  },
  {
    id: 'rum-rentacar',
    title: 'RUM Rent A Car',
    url: 'https://rumrentacar.az/',
    category: 'Car rental',
    year: '2026',
    lang: 'az',
    description:
      'Booking site for a car rental company in Baku: the fleet by brand and body type, a three-step rental process, FAQ and a reservation request, rebuilt as a new front end on top of the existing Meteor application and its admin panel.',
    technologies: ['Meteor', 'React', 'TypeScript', 'Tailwind CSS', 'Framer Motion', 'Express'],
    featured: true,
  },
  {
    id: 'taxwise',
    title: 'Tax Wise Solutions',
    url: 'https://www.taxwisesolution.az/',
    category: 'Accounting & tax',
    year: '2026',
    lang: 'en', // English brand name: capitals must not become "WİSE"
    description:
      'Corporate site for an Azerbaijani firm offering accounting, tax, audit, payroll and financial reporting: services, the sectors it works with, how an engagement starts, and an insights section.',
    technologies: ['Next.js', 'React', 'TypeScript', 'Tailwind CSS', 'Framer Motion', 'Radix UI'],
    featured: false,
  },
  {
    id: 'vintage',
    title: 'VINTAGE',
    url: 'https://vintage.az/',
    category: 'Vintage fashion marketplace',
    year: '2026',
    lang: 'az',
    description:
      'Marketplace for vintage and second-hand clothing in Baku, in Azerbaijani, English and Russian: shops, categories, brands and new arrivals, with accounts for stores and for customers.',
    technologies: ['Next.js', 'React', 'TypeScript', 'Tailwind CSS', 'Radix UI', 'Prisma', 'PostgreSQL'],
    featured: true,
  },
  {
    id: 'direct',
    title: 'DIRECT',
    url: 'https://direct-iota-self.vercel.app/',
    category: 'Brand & design agency',
    year: '2026',
    lang: 'tr',
    description:
      'Turkish-language website for a B2B brand and design agency covering strategy, design, development and marketing, with scroll-driven motion throughout.',
    technologies: ['React', 'Vite', 'Tailwind CSS', 'GSAP', 'Lenis'],
    featured: false,
    notes: 'Reconstruction of an existing agency site (wearedirect.co). Owner chose (2026-11-10) to present it as is.',
  },
  {
    id: 'yuva',
    title: 'YUVA',
    url: 'https://emlak-sigma-eight.vercel.app/az',
    category: 'Student housing',
    year: '2026',
    lang: 'az',
    description:
      'Housing platform for students in Azerbaijan and Türkiye: rooms, shared flats and roommates in Baku, Istanbul, Ankara, İzmir and other cities, searchable near universities, with prices in AZN or TRY.',
    technologies: ['Next.js', 'React', 'TypeScript', 'Tailwind CSS', 'next-intl', 'Prisma', 'PostgreSQL', 'Leaflet'],
    featured: true,
  },
  {
    id: 'chaidash',
    title: 'CHAIDASH',
    url: 'https://chaidash.vercel.app/',
    category: 'QR menu',
    year: '2026',
    lang: 'az',
    description:
      'Digital QR menu for CHAIDASH, a tea house, lounge and rooms: eighteen sections and 152 items transcribed from the printed menu, with photographs, prices and a jump list for every section.',
    technologies: ['Next.js', 'React', 'TypeScript', 'CSS Modules'],
    featured: false,
  },
  {
    id: 'xaxaxa',
    title: 'XAXAXA',
    url: 'https://xaxaxa-info.vercel.app/',
    category: 'Experimental web art',
    year: '2026',
    lang: 'en',
    description:
      'WWWORLD // 0007: a deliberately broken homepage in the spirit of the early web, with procedurally generated assets and a chaos-level slider that rearranges the whole page.',
    technologies: ['Next.js', 'React', 'TypeScript', 'Tailwind CSS', 'Framer Motion', 'GSAP'],
    featured: false,
  },
  {
    id: 'finline',
    title: 'Finline Advisory',
    url: 'https://finlinee.vercel.app/',
    category: 'Financial advisory',
    year: '2026',
    lang: 'en', // English brand name: capitals must not become "FİNLİNE"
    description:
      'Website for an accounting, tax and financial advisory firm: services, how a cooperation starts, who it is for, FAQ, a blog and a consultation request.',
    technologies: ['Next.js', 'React', 'TypeScript', 'Tailwind CSS', 'Framer Motion', 'Radix UI'],
    featured: false,
  },
  {
    id: 'yasemin',
    title: 'Yaseminin Takı Dünyası',
    url: 'https://www.yaseminintakidunyasi.com/',
    category: 'Jewellery store',
    year: '2026',
    lang: 'tr',
    description:
      'Turkish online store for handmade jewellery (rings, necklaces, earrings and bracelets) with collections, new arrivals, favourites, customer accounts and order tracking.',
    technologies: ['Next.js', 'React', 'TypeScript', 'Tailwind CSS', 'MongoDB'],
    featured: true,
  },
  {
    id: 'instrument-az',
    title: 'Instrument.az',
    url: 'https://instrument-az.vercel.app/',
    category: 'Musical instrument marketplace',
    year: '2026',
    lang: 'az',
    description:
      'Marketplace for new and used musical instruments in Azerbaijan, from guitars and synthesizers to tar, kamancha and saz, browsable by category and by city.',
    technologies: ['React', 'TypeScript', 'Vite', 'Tailwind CSS', 'Framer Motion', 'React Router'],
    featured: false,
  },
];

export const projects: PortfolioProject[] = input.map((p) => {
  const img = images(p.id);
  return {
    ...p,
    role: p.role ?? ROLE,
    screenshot: img.screen,
    thumbnail: `/projects/${p.id}/thumb.webp`,
    images: img,
  };
});

export const projectCount = projects.length;
