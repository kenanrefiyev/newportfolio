# Computer Collection — portfolio

Eleven real websites, each shown on its own silver all-in-one computer (Three.js), in a scroll/drag-driven collection.

```bash
npm install
npm run dev        # http://localhost:3500
npm run build && npm start
```

## Where things live

| What | File |
| --- | --- |
| Project data (titles, descriptions, stacks, URLs) | `src/data/projects.ts` |
| Your name, role, contact links (null = shown as "to be added") | `src/data/site.ts` |
| Design tokens + all styles | `src/app/globals.css` |
| 3D computer model / scene | `src/lib/computer-model.ts`, `src/lib/computer-scene.ts` |
| Collection (scroll, drag, keys, swipe) | `src/components/collection/ComputerGallery.tsx` |
| Project overlay | `src/components/project/ProjectOverlay.tsx` |
| Design DNA, brief | `design/` |

## Screenshots

Every screen is a real capture of the live site.

```bash
node scripts/capture-screens.mjs assets-src/captures            # all sites (or add: rum-rentacar,taxwise)
npm run assets                                                  # → public/projects/<id>/*.webp + manifest
```

To add a project: add it to `SITES` in `scripts/capture-screens.mjs`, capture, run `npm run assets`, then add an entry in `src/data/projects.ts`.

## QA

`node scripts/qa.mjs http://localhost:3500` — headless screenshots and functional checks at 1920/1440/1024/768/390/375 into `qa/`.
# newportfolio
