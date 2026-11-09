// Captures real screenshots + verifiable metadata for each portfolio site.
import { chromium } from 'playwright-core';
import fs from 'node:fs/promises';
import path from 'node:path';

const OUT = process.argv[2];
const only = process.argv[3]; // optional slug filter
const SITES = [
  ['galaxy-technology', 'https://galaxytechnology.az/'],
  ['rum-rentacar', 'https://rumrentacar.az/'],
  ['taxwise', 'https://www.taxwisesolution.az/'],
  ['vintage', 'https://vintage.az/'],
  ['direct', 'https://direct-iota-self.vercel.app/'],
  ['yuva', 'https://emlak-sigma-eight.vercel.app/az'],
  ['chaidash', 'https://chaidash.vercel.app/'],
  ['xaxaxa', 'https://xaxaxa-info.vercel.app/'],
  ['finline', 'https://finlinee.vercel.app/'],
  ['yasemin', 'https://www.yaseminintakidunyasi.com/'],
  ['instrument-az', 'https://instrument-az.vercel.app/'],
];

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  args: ['--hide-scrollbars'],
});
const results = [];
for (const [slug, url] of SITES) {
  if (only && !only.split(',').includes(slug)) continue;
  const dir = path.join(OUT, slug);
  await fs.mkdir(dir, { recursive: true });
  const rec = { slug, url };
  try {
    // ---------- desktop ----------
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, locale: 'az-AZ' });
    const page = await ctx.newPage();
    const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 }).catch(async (e) => {
      rec.gotoWarn = String(e).slice(0, 160);
      return null;
    });
    rec.status = resp?.status();
    rec.finalUrl = page.url();
    rec.headers = resp ? Object.fromEntries(Object.entries(resp.headers()).filter(([k]) => ['server', 'x-powered-by', 'x-vercel-id', 'x-nextjs-cache', 'x-nextjs-prerender'].includes(k))) : {};
    await page.waitForTimeout(5000);
    { const b = page.getByText('İndi keç'); if (await b.count()) { await b.first().click(); await page.waitForTimeout(1200); } }
    // dismiss obvious cookie banners by pressing Escape only (no clicking consent)
    await page.screenshot({ path: path.join(dir, 'screen.png') });
    rec.meta = await page.evaluate(() => {
      const q = (s) => document.querySelector(s);
      const txt = (el) => (el?.textContent || '').replace(/\s+/g, ' ').trim();
      const scripts = [...document.scripts].map((s) => s.src).filter(Boolean);
      const links = [...document.querySelectorAll('link[rel=stylesheet],link[rel=modulepreload]')].map((l) => l.href);
      return {
        title: document.title,
        lang: document.documentElement.lang,
        description: q('meta[name=description]')?.content || q('meta[property="og:description"]')?.content || '',
        generator: q('meta[name=generator]')?.content || '',
        h1: [...document.querySelectorAll('h1')].map(txt).slice(0, 3),
        h2: [...document.querySelectorAll('h2')].map(txt).slice(0, 10),
        nav: [...document.querySelectorAll('header a, nav a')].map(txt).filter(Boolean).slice(0, 20),
        next: !!window.__NEXT_DATA__ || scripts.some((s) => s.includes('/_next/')),
        nextApp: scripts.some((s) => s.includes('/_next/static/chunks/app') ) || !!document.querySelector('script[src*="/_next/"]') && !!self.__next_f,
        vite: scripts.some((s) => /\/assets\/index-[\w-]+\.js/.test(s)) || links.some((s) => /\/assets\/index-[\w-]+\.(js|css)/.test(s)),
        meteor: !!window.Meteor || !!window.__meteor_runtime_config__,
        react: !!document.querySelector('[data-reactroot]') || !!window.__REACT_DEVTOOLS_GLOBAL_HOOK__ || [...document.querySelectorAll('body *')].slice(0, 50).some((e) => Object.keys(e).some((k) => k.startsWith('__react'))),
        tailwind: [...document.styleSheets].some((ss) => { try { return [...ss.cssRules].some((r) => r.cssText.includes('--tw-')); } catch { return false; } }),
        gsap: !!window.gsap,
        lenis: document.documentElement.classList.contains('lenis') || !!window.lenis,
        framer: !!document.querySelector('[style*="will-change"], [data-framer-appear-id]'),
        fullHeight: document.documentElement.scrollHeight,
        scripts: scripts.slice(0, 8),
      };
    });
    // scroll through for lazy content, then full page
    const h = rec.meta.fullHeight;
    for (let y = 0; y < Math.min(h, 14000); y += 700) {
      await page.evaluate((yy) => window.scrollTo(0, yy), y);
      await page.waitForTimeout(250);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(1500);
    const fullH = await page.evaluate(() => document.documentElement.scrollHeight);
    rec.fullHeightAfter = fullH;
    await page.screenshot({ path: path.join(dir, 'full-page.png'), fullPage: true, clip: { x: 0, y: 0, width: 1440, height: Math.min(fullH, 9000) } }).catch(async (e) => {
      rec.fullWarn = String(e).slice(0, 160);
    });
    await ctx.close();

    // ---------- mobile ----------
    const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'az-AZ',
      userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36' });
    const mp = await mctx.newPage();
    await mp.goto(url, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => null);
    await mp.waitForTimeout(4500);
    { const b = mp.getByText('İndi keç'); if (await b.count()) { await b.first().click(); await mp.waitForTimeout(1200); } }
    await mp.screenshot({ path: path.join(dir, 'mobile.png') });
    rec.mobileOverflow = await mp.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    await mctx.close();
  } catch (e) {
    rec.error = String(e).slice(0, 300);
  }
  results.push(rec);
  console.log(slug, rec.status, rec.error || rec.gotoWarn || '', rec.meta?.title);
}
await browser.close();
await fs.writeFile(path.join(OUT, only ? 'audit-'+only+'.json' : 'audit.json'), JSON.stringify(results, null, 2));
