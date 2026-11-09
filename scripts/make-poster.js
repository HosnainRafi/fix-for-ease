#!/usr/bin/env node
/**
 * Extract a poster frame from the hero video with Chrome's canvas.
 *
 *   node scripts/make-poster.js
 *
 * The reference used a remote Unsplash photo as the poster; this produces a
 * local frame from the actual hero loop so the first paint matches the video.
 */
'use strict';

const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].find((p) => fs.existsSync(p));

const OUT = path.resolve(__dirname, '..', 'assets', 'img', 'hero-poster.jpg');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 900 });
  await page.goto('http://localhost:4173/', { waitUntil: 'networkidle2', timeout: 60000 });

  const dataUrl = await page.evaluate(async () => {
    const video = document.querySelector('.hero-media video');
    if (!video) throw new Error('hero video not found');
    if (video.readyState < 2) {
      await new Promise((resolve) => video.addEventListener('loadeddata', resolve, { once: true }));
    }
    video.pause();
    video.currentTime = 2.5;
    await new Promise((resolve) => video.addEventListener('seeked', resolve, { once: true }));
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.82);
  });

  const base64 = dataUrl.split(',')[1];
  fs.writeFileSync(OUT, Buffer.from(base64, 'base64'));
  console.log(`wrote ${path.relative(process.cwd(), OUT)} (${fs.statSync(OUT).size.toLocaleString()} bytes)`);
  await browser.close();
})();
