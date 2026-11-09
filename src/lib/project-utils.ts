import { projects } from '@/data/projects';

export const pad2 = (n: number) => String(n).padStart(2, '0');

/** "01 / 11" */
export const indexLabel = (i: number) => `${pad2(i + 1)} / ${pad2(projects.length)}`;

export const wrapIndex = (i: number) => (i + projects.length) % projects.length;

export const hostOf = (url: string) => {
  try {
    return new URL(url).host.replace(/^www\./, '');
  } catch {
    return url;
  }
};

export const indexOfId = (id: string | null) => (id ? projects.findIndex((p) => p.id === id) : -1);
