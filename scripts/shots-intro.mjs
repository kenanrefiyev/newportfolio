// Frames of the opening camera move and the shelf, for visual review.
//   node scripts/shots-intro.mjs [baseUrl]
import { chromium } from 'playwright-core';
import fs from 'node:fs/promises';

const BASE = process.argv[2] || 'http://localhost:3500';
await fs.mkdir('qa/intro', { recursive: true });
const b = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});

for (const [w, h] of [
  [1440, 900],
  [1920, 1080],
]) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(BASE, { waitUntil: 'networkidle' });
  await p.waitForTimeout(3500);
  for (const f of [0, 0.35, 0.7, 1]) {
    await p.evaluate((y) => window.scrollTo(0, y), Math.round(h * 1.2 * f));
    await p.waitForTimeout(1600);
    await p.screenshot({ path: `qa/intro/${w}-intro-${Math.round(f * 100)}.png` });
  }
  await p.evaluate((y) => window.scrollTo(0, y), Math.round(h * 1.2 + h * 0.58 * 4));
  await p.waitForTimeout(1800);
  await p.screenshot({ path: `qa/intro/${w}-shelf-5.png` });
  console.log(w, 'errors', errs);
  await p.close();
}

for (const [w, h] of [
  [390, 844],
  [768, 1024],
]) {
  const p = await b.newPage({ viewport: { width: w, height: h }, isMobile: w < 700, hasTouch: true, deviceScaleFactor: 2 });
  await p.goto(BASE, { waitUntil: 'networkidle' });
  await p.waitForTimeout(600);
  await p.screenshot({ path: `qa/intro/${w}-autoplay-early.png` });
  await p.waitForTimeout(3500);
  await p.screenshot({ path: `qa/intro/${w}-autoplay-end.png` });
  await p.close();
}
await b.close();
