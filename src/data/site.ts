/*
 * Personal details. Anything set to null renders as a visible placeholder
 * (never as a link), so nothing unverified is presented as real.
 * Fill these in before publishing.
 */
export interface ContactLink {
  label: string;
  /** Full href (mailto:, https://). null = not provided yet. */
  href: string | null;
  /** What is shown. Defaults to the href without its scheme. */
  display?: string;
}

export const site = {
  /** Shown in the header, footer and the About signature. */
  name: 'Kənan Rəfiyev',
  role: 'Web developer',
  title: 'Kənan Rəfiyev — Selected web work',
  description: 'Eleven websites designed and developed in 2026 by Kənan Rəfiyev, shown as a collection of computers.',
  contact: [
    { label: 'Email', href: 'mailto:kenanrefiyev0@gmail.com', display: 'kenanrefiyev0@gmail.com' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/k%C9%99nan-r%C9%99fiyev-54a044385/', display: 'Kənan Rəfiyev' },
    { label: 'GitHub', href: 'https://github.com/kenanrefiyev', display: 'kenanrefiyev' },
    { label: 'Instagram', href: 'https://www.instagram.com/kananrfyv/', display: '@kananrfyv' },
  ] satisfies ContactLink[] as ContactLink[],
};
