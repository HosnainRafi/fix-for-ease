#!/usr/bin/env node
/**
 * Visual QA capture.
 *
 *   node scripts/screenshot.js <url> <outfile> [width] [height] [fullPage]
 *
 * Keeps the hero in its "awake" state (the reference hides hero copy after
 * 1.9s of pointer inactivity) and waits for webfonts + the hero video.
 */
'use strict';

const puppeteer = require('puppeteer-core');
const fs = require('fs');

const CHROME_CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
];

(async () => {
  const [url, out, widthArg, heightArg, fullArg] = process.argv.slice(2);
  if (!url || !out) {
    console.error('usage: node scripts/screenshot.js <url> <outfile> [width] [height] [fullPage]');
    process.exit(1);
  }
  const executablePath = CHROME_CANDIDATES.find((p) => fs.existsSync(p));
  if (!executablePath) throw new Error('No Chrome/Edge binary found');

  const width = Number(widthArg || 1440);
  const height = Number(heightArg || 1000);

  const browser = await puppeteer.launch({
    executablePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--autoplay-policy=no-user-gesture-required'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

  await page.evaluate(async () => {
    document.fonts && (await document.fonts.ready);
    const hero = document.querySelector('.hero');
    if (hero) {
      hero.classList.remove('hero-resting');
      hero.classList.add('hero-awake');
    }
    // The reference fades hero copy after 1.9s idle; pin it awake for capture.
    const style = document.createElement('style');
    style.textContent = '.hero-resting .hero-content{opacity:1!important;transform:none!important}';
    document.head.appendChild(style);
    // nudge carousels to their centred state without scrolling the page
    window.dispatchEvent(new Event('load'));
  });
  await new Promise((r) => setTimeout(r, 800));

  if (fullArg === 'full') {
    // Walk the page so IntersectionObserver reveals fire and lazy images decode.
    await page.evaluate(async () => {
      const step = window.innerHeight * 0.75;
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 120));
      }
      window.scrollTo(0, document.body.scrollHeight);
      await new Promise((r) => setTimeout(r, 600));
      window.scrollTo(0, 0);
      await new Promise((r) => setTimeout(r, 400));
    });
    await new Promise((r) => setTimeout(r, 800));
  }

  await new Promise((r) => setTimeout(r, 1200));

  await page.screenshot({ path: out, fullPage: fullArg === 'full' });
  await browser.close();
  console.log('wrote ' + out);
})();
