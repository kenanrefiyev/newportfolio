// Visual + functional QA in headless Chrome.
//   node scripts/qa.mjs [baseUrl] [widths]      e.g. node scripts/qa.mjs http://localhost:3500 1440,390
// Writes screenshots to qa/<width>/ and a report to qa/report.json.
import { chromium } from 'playwright-core';
import fs from 'node:fs/promises';

const BASE = process.argv[2] || 'http://localhost:3500';
const only = process.argv[3]?.split(',').map(Number);
const VIEWPORTS = [
  { w: 1920, h: 1080, touch: false },
  { w: 1440, h: 900, touch: false },
  { w: 1024, h: 768, touch: false },
  { w: 768, h: 1024, touch: true },
  { w: 390, h: 844, touch: true },
  { w: 375, h: 812, touch: true },
].filter((v) => !only || only.includes(v.w));

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--hide-scrollbars'],
});
const report = [];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

for (const vp of VIEWPORTS) {
  const dir = `qa/${vp.w}`;
  await fs.mkdir(dir, { recursive: true });
  const ctx = await browser.newContext({
    viewport: { width: vp.w, height: vp.h },
    deviceScaleFactor: vp.touch ? 2 : 1,
    isMobile: vp.touch && vp.w < 900,
    hasTouch: vp.touch,
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  const failed = [];
  page.on('requestfailed', (r) => failed.push(r.url()));
  const r = { viewport: `${vp.w}x${vp.h}`, checks: {} };
  const shot = (name) => page.screenshot({ path: `${dir}/${name}.png` });
  const label = () => page.$eval('.label__title', (e) => e.textContent).catch(() => null);
  const check = (k, v) => (r.checks[k] = v);

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await wait(3500);
  await shot('01-initial');
  if (!vp.touch) {
    await page.evaluate((y) => window.scrollTo(0, y), vp.h * 1.2);
    await wait(1800);
    await shot('01b-shelf-start');
  }
  const mode = await page.$eval('.collection', (e) => e.dataset.mode);
  check('mode', mode);
  check('webgl', await page.$('.collection__canvas').then((c) => !!c));
  check('horizontalOverflow', await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1));
  check('firstLabel', await label());

  // --- move through the collection
  if (mode === 'shelf') {
    const step = await page.evaluate(() => {
      const s = document.querySelector('.collection');
      return (s.offsetHeight - innerHeight * 2.2) / 10;
    });
    await page.evaluate((y) => window.scrollTo(0, y), vp.h * 1.2 + step * 5);
    await wait(2200);
    check('middleLabel', await label());
    await shot('03-middle');
    await page.evaluate((y) => window.scrollTo(0, y), vp.h * 1.2 + step * 10);
    await wait(2200);
    check('lastLabel', await label());
    await shot('04-last');
    await page.evaluate((y) => window.scrollTo(0, y), vp.h * 1.2);
    await wait(1800);
  } else {
    await page.focus('.collection__objects');
    for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight');
    await wait(1600);
    check('middleLabel', await label());
    await shot('03-middle');
    for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowRight');
    await wait(1600);
    check('lastLabel', await label());
    await shot('04-last');
    await page.keyboard.press('Home');
    await wait(1600);
  }

  // --- keyboard
  await page.focus('.collection__objects');
  await page.keyboard.press('ArrowRight');
  await wait(1700);
  check('keyboardArrowRight', await label());
  await page.keyboard.press('ArrowLeft');
  await wait(1700);

  // --- drag / swipe
  const box = await page.$eval('.collection__objects', (e) => {
    const b = e.getBoundingClientRect();
    return { x: b.x, y: b.y, w: b.width, h: b.height };
  });
  const cy = box.y + box.h * 0.4;
  if (vp.touch) {
    // synthesize a horizontal swipe with pointer events
    await page.evaluate(
      async ({ x0, y }) => {
        const el = document.querySelector('.collection__objects');
        const ev = (type, x) =>
          el.dispatchEvent(new PointerEvent(type, { pointerId: 7, pointerType: 'touch', clientX: x, clientY: y, bubbles: true, isPrimary: true, button: 0 }));
        ev('pointerdown', x0);
        for (let i = 1; i <= 10; i++) {
          ev('pointermove', x0 - i * 26);
          await new Promise((r) => setTimeout(r, 16));
        }
        ev('pointerup', x0 - 260);
      },
      { x0: box.x + box.w * 0.7, y: cy },
    );
  } else {
    await page.mouse.move(box.x + box.w * 0.62, cy);
    await page.mouse.down();
    for (let i = 1; i <= 12; i++) await page.mouse.move(box.x + box.w * 0.62 - i * 30, cy, { steps: 2 });
    await page.mouse.up();
  }
  await wait(1900);
  check('afterDrag', await label());
  if (!vp.touch) await page.mouse.move(5, 5);

  // back to the first computer
  if (mode === 'shelf') await page.evaluate((y) => window.scrollTo(0, y), vp.h * 1.2);
  else {
    await page.focus('.collection__objects');
    await page.keyboard.press('Home');
  }
  await wait(2000);

  // --- signature move: point at the screen and move down
  if (!vp.touch) {
    const sx = vp.w / 2;
    await page.mouse.move(sx, vp.h * 0.25);
    await wait(500);
    await page.mouse.move(sx, vp.h * 0.5, { steps: 12 });
    await wait(1600);
    await shot('05-selected-look');
    check('hintWhileHover', await page.$eval('.controls__hint', (e) => e.textContent));
    await page.mouse.move(5, vp.h - 5);
    await wait(1200);
  } else {
    await shot('05-selected');
  }

  // --- open the project (click the computer in front)
  await page.click('.controls .btn--primary');
  await wait(380);
  await shot('06a-opening');
  await wait(1500);
  await shot('06-overlay');
  check('overlayOpen', !!(await page.$('.overlay')));
  check('urlAfterOpen', page.url().replace(BASE, ''));
  check('focusInDialog', await page.evaluate(() => !!document.activeElement?.closest('.overlay')));
  await page.$eval('.overlay__scroll', (e) => (e.scrollTop = e.querySelector('.overlay__info').offsetTop - 80));
  await wait(400);
  await shot('07a-overlay-info');
  await page.$eval('.overlay__scroll', (e) => (e.scrollTop = e.querySelector('.gallery').offsetTop - 80));
  await wait(900);
  await shot('07-gallery');

  // next project inside the overlay
  await page.click('.overlay__step--next');
  await wait(1100);
  check('overlayNext', await page.$eval('.overlay__title', (e) => e.textContent));
  check('urlAfterNext', page.url().replace(BASE, ''));

  // --- Escape closes, scroll restored to that computer
  await page.keyboard.press('Escape');
  await wait(400);
  await shot('08a-closing');
  await wait(1500);
  await shot('08-closed');
  check('overlayClosedByEscape', !(await page.$('.overlay')));
  check('urlAfterClose', page.url().replace(BASE, ''));
  check('labelAfterClose', await label());

  // --- browser back closes the overlay
  await page.click('.controls .btn--primary');
  await wait(1700);
  await page.goBack();
  await wait(1800);
  check('overlayClosedByBack', !(await page.$('.overlay')));

  // --- deep link
  await page.goto(`${BASE}/?project=chaidash`, { waitUntil: 'networkidle' });
  await wait(2500);
  check('deepLinkTitle', await page.$eval('.overlay__title', (e) => e.textContent).catch(() => null));
  await shot('06b-deeplink');
  await page.keyboard.press('Escape');
  await wait(1800);

  // --- supporting sections
  for (const [id, name] of [
    ['index', '02-index'],
    ['about', '09-about'],
    ['contact', '10-contact'],
  ]) {
    await page.evaluate((id) => {
      const el = document.getElementById(id);
      window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY);
    }, id);
    await wait(1200);
    await shot(name);
  }
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await wait(1000);
  await shot('11-footer');

  // ledger hover preview (desktop)
  if (!vp.touch && vp.w >= 992) {
    await page.evaluate(() => {
      const el = document.getElementById('index');
      window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY);
    });
    await wait(900);
    const row = await page.$$('.ledger__row');
    await row[3].hover();
    await wait(700);
    await shot('02b-index-hover');
  }

  // --- live links
  check(
    'liveLinks',
    await page.evaluate(async () => {
      return null;
    }),
  );
  r.consoleErrors = errors.filter((e) => !e.includes('Download the React DevTools'));
  r.failedRequests = failed.filter((u) => !u.includes('_next/webpack-hmr'));
  report.push(r);
  console.log(JSON.stringify(r, null, 1));
  await ctx.close();
}

// reduced motion pass (desktop)
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await wait(2500);
  await page.evaluate(() => window.scrollTo(0, innerHeight * 1.2));
  await wait(1200);
  await page.click('.controls .btn--primary');
  await wait(600);
  await fs.mkdir('qa/reduced', { recursive: true });
  await page.screenshot({ path: 'qa/reduced/overlay.png' });
  report.push({ viewport: 'reduced-motion', overlayOpen: !!(await page.$('.overlay')), lenis: await page.evaluate(() => document.documentElement.classList.contains('lenis')) });
  await ctx.close();
}

await browser.close();
await fs.writeFile('qa/report.json', JSON.stringify(report, null, 2));
