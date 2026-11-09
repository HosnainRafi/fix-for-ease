#!/usr/bin/env node
/**
 * Media audit: loads every route, walks the page, and reports
 *   - failed network requests / non-2xx responses
 *   - images that never decoded
 *   - videos that cannot play
 *   - iframes (embed) sources
 *   - console errors
 *
 *   node scripts/audit.js [baseUrl]
 */
'use strict';

const puppeteer = require('puppeteer-core');
const fs = require('fs');

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].find((p) => fs.existsSync(p));

const BASE = process.argv[2] || 'http://localhost:4173';
const ROUTES = ['/', '/ourworks', '/ourteam', '/how-it-works', '/faq'];

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--autoplay-policy=no-user-gesture-required'],
  });

  let problems = 0;

  for (const route of ROUTES) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 1000 });

    const failed = new Set();
    const bad = new Set();
    const consoleErrors = [];

    page.on('requestfailed', (req) => failed.add(`${req.failure()?.errorText} ${req.url()}`));
    page.on('response', (res) => {
      if (res.status() >= 400) bad.add(`${res.status()} ${res.url()}`);
    });
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push('pageerror: ' + err.message));

    await page.goto(BASE + route, { waitUntil: 'networkidle2', timeout: 60000 });
    await page.evaluate(async () => {
      const step = window.innerHeight * 0.8;
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 90));
      }
      window.scrollTo(0, 0);
    });
    await new Promise((r) => setTimeout(r, 800));

    const report = await page.evaluate(() => {
      const imgs = [...document.images];
      const brokenImgs = imgs
        .filter((i) => i.getAttribute('src') && i.complete && i.naturalWidth === 0)
        .map((i) => i.currentSrc || i.getAttribute('src'));
      const lazyPending = imgs
        .filter((i) => i.dataset.src && !i.currentSrc.endsWith(i.dataset.src.split('/').pop()))
        .map((i) => i.dataset.src);
      const videos = [...document.querySelectorAll('video')].map((v) => ({
        src: v.currentSrc || v.querySelector('source')?.src,
        readyState: v.readyState,
        error: v.error ? v.error.code : null,
      }));
      const iframes = [...document.querySelectorAll('iframe')].map((f) => f.src);
      return { brokenImgs, lazyPending, videos, iframes, totalImgs: imgs.length };
    });

    const issues = [];
    if (report.brokenImgs.length) issues.push(...report.brokenImgs.map((u) => 'broken img: ' + u));
    if (report.videos.some((v) => v.error || v.readyState === 0))
      issues.push(...report.videos.filter((v) => v.error || v.readyState === 0).map((v) => `video: ${v.src} rs=${v.readyState} err=${v.error}`));
    // 403/404 on remote media only; fonts etc. are fine to report too
    for (const b of bad) if (!/googleapis|gstatic/.test(b)) issues.push('http: ' + b);
    for (const f of failed) if (!/googleapis|gstatic|favicon/.test(f)) issues.push('net: ' + f);

    problems += issues.length;
    console.log(`\n=== ${route} — ${report.totalImgs} images, ${report.videos.length} videos, ${report.iframes.length} iframes`);
    if (!issues.length) console.log('  OK');
    else issues.forEach((i) => console.log('  ! ' + i));
    if (consoleErrors.length) {
      console.log('  console errors:');
      [...new Set(consoleErrors)].forEach((e) => console.log('    - ' + e.slice(0, 220)));
    }
    await page.close();
  }

  await browser.close();
  console.log(`\n${problems} media/network problem(s) found`);
})();
