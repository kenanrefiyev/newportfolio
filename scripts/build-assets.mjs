// Turns the raw browser captures in assets-src/captures/<slug>/ into optimised
// WebP assets in public/projects/<slug>/. Re-run after `node scripts/capture-screens.mjs`.
//
//   screen.webp      1440×900  — overlay hero, CSS fallback
//   texture.webp     1280×800  — computer display texture (WebGL)
//   thumb.webp        480×300  — ledger hover preview
//   full-page.webp   1200×≤7200 — overlay gallery (scrollable long capture)
//   scroll-tex.webp  1024×≤6144 — "look through the screen" texture (power-of-two friendly height cap)
//   mobile.webp       600×1300 — overlay gallery (phone capture)
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const SRC = 'assets-src/captures';
const OUT = 'public/projects';
const slugs = fs.readdirSync(SRC).filter((d) => fs.statSync(path.join(SRC, d)).isDirectory());
const manifest = {};

for (const slug of slugs) {
  const src = (f) => path.join(SRC, slug, f);
  const dir = path.join(OUT, slug);
  fs.mkdirSync(dir, { recursive: true });
  const out = (f) => path.join(dir, f);
  const entry = {};

  if (fs.existsSync(src('screen.png'))) {
    await sharp(src('screen.png')).resize(1440, 900, { fit: 'cover', position: 'top' }).webp({ quality: 82 }).toFile(out('screen.webp'));
    await sharp(src('screen.png')).resize(1280, 800, { fit: 'cover', position: 'top' }).webp({ quality: 80 }).toFile(out('texture.webp'));
    await sharp(src('screen.png')).resize(480, 300, { fit: 'cover', position: 'top' }).webp({ quality: 78 }).toFile(out('thumb.webp'));
    entry.screen = true;
  }
  if (fs.existsSync(src('full-page.png'))) {
    const meta = await sharp(src('full-page.png')).metadata();
    const h1200 = Math.min(Math.round((meta.height * 1200) / meta.width), 7200);
    await sharp(src('full-page.png'))
      .resize(1200, null)
      .extract({ left: 0, top: 0, width: 1200, height: Math.min(h1200, Math.round((meta.height * 1200) / meta.width)) })
      .webp({ quality: 76 })
      .toFile(out('full-page.webp'));
    const h1024 = Math.min(Math.round((meta.height * 1024) / meta.width), 6144);
    await sharp(src('full-page.png'))
      .resize(1024, null)
      .extract({ left: 0, top: 0, width: 1024, height: Math.min(h1024, Math.round((meta.height * 1024) / meta.width)) })
      .webp({ quality: 72 })
      .toFile(out('scroll-tex.webp'));
    entry.fullPage = { width: 1200, height: Math.min(h1200, Math.round((meta.height * 1200) / meta.width)) };
    entry.scrollTex = { width: 1024, height: Math.min(h1024, Math.round((meta.height * 1024) / meta.width)) };
  }
  if (fs.existsSync(src('mobile.png'))) {
    await sharp(src('mobile.png')).resize(600, 1299, { fit: 'cover', position: 'top' }).webp({ quality: 78 }).toFile(out('mobile.webp'));
    entry.mobile = true;
  }
  manifest[slug] = entry;
  console.log(slug, JSON.stringify(entry));
}
fs.writeFileSync(path.join('src/data/asset-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
