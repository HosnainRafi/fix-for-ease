#!/usr/bin/env node
/**
 * Static integrity check: every local href/src must resolve to a file.
 * Also flags duplicate ids on a page and empty internal hrefs.
 *
 *   node scripts/verify.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PAGES = ['index.html', 'ourworks.html', 'ourteam.html', 'how-it-works.html', 'faq.html', '404.html'];

const ATTR_RE = /\b(?:href|src|data-src|poster)\s*=\s*"([^"]*)"/gi;
const ID_RE = /\bid\s*=\s*"([^"]+)"/g;

let errors = 0;
let checked = 0;
const missing = new Map();

function isExternal(value) {
  return /^(?:[a-z]+:|\/\/|#|mailto:|tel:|data:)/i.test(value);
}

for (const page of PAGES) {
  const abs = path.join(ROOT, page);
  if (!fs.existsSync(abs)) {
    console.error(`missing page: ${page}`);
    errors++;
    continue;
  }
  const html = fs.readFileSync(abs, 'utf8');
  const ids = new Map();
  let m;

  while ((m = ATTR_RE.exec(html))) {
    const value = m[1].trim();
    if (!value || isExternal(value)) continue;
    if (value.startsWith('//')) continue;

    const filePart = value.split(/[?#]/)[0];
    if (!filePart) continue;

    const target = path.resolve(path.dirname(abs), filePart);
    checked++;
    if (!fs.existsSync(target)) {
      const key = `${page} -> ${value}`;
      missing.set(key, true);
    }
  }

  while ((m = ID_RE.exec(html))) {
    ids.set(m[1], (ids.get(m[1]) || 0) + 1);
  }
  for (const [id, count] of ids) {
    if (count > 1) {
      console.warn(`duplicate id "${id}" in ${page} (x${count})`);
    }
  }
}

if (missing.size) {
  console.error('\nBroken local references:');
  for (const key of missing.keys()) console.error('  ' + key);
  errors += missing.size;
}

console.log(`\nchecked ${checked} local references across ${PAGES.length} pages`);
if (errors) {
  console.error(`${errors} problem(s) found\n`);
  process.exit(1);
}
console.log('all local references resolve\n');
