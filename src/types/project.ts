export interface ProjectImages {
  /** 1440×900 capture of the live homepage, as rendered in a desktop browser. */
  screen: string;
  /** 1280×800 version of the same capture, used as the computer's display texture. */
  texture: string;
  /** Long capture of the homepage (1200px wide). */
  fullPage: { src: string; width: number; height: number } | null;
  /** Long capture prepared as a GPU texture for the "look through the screen" move. */
  scrollTexture: { src: string; width: number; height: number } | null;
  /** 390×844 capture of the homepage on a phone. */
  mobile: string | null;
}

export interface PortfolioProject {
  id: string;
  title: string;
  url: string;
  category: string;
  year: string;
  description: string;
  role: string;
  technologies: string[];
  /** Overlay hero image (real capture). */
  screenshot: string;
  /** Small preview (real capture). */
  thumbnail: string;
  featured: boolean;
  /** Language of the TITLE, so capitals come out right: 'tr'/'az' give İ, English brand names need 'en'. */
  lang: string;
  images: ProjectImages;
  /** Internal notes for the owner; never rendered. */
  notes?: string;
}
