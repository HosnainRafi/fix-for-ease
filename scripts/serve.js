#!/usr/bin/env node
/**
 * Zero-dependency static server for local preview.
 *
 *   node scripts/serve.js            -> http://localhost:3000
 *   node scripts/serve.js 8080       -> http://localhost:8080
 *
 * Serves the repository root, maps extensionless routes ("/ourworks") to
 * "<route>.html" so the local URLs match the production routes, and sends
 * directory requests to index.html.
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.argv[2] || process.env.PORT || 3000);
const DATA_DIR = path.join(ROOT, 'data');
const ENQUIRIES = path.join(DATA_DIR, 'enquiries.ndjson');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
};

function resolveTarget(pathname) {
  const clean = decodeURIComponent(pathname.split('?')[0]);
  const candidates = [];

  const base = path.join(ROOT, clean);
  if (!base.startsWith(ROOT)) return null; // path traversal guard

  candidates.push(base);
  if (!path.extname(base)) {
    candidates.push(base + '.html');
    candidates.push(path.join(base, 'index.html'));
  }

  for (const candidate of candidates) {
    try {
      const stat = fs.statSync(candidate);
      if (stat.isFile()) return candidate;
    } catch (err) {
      /* try next candidate */
    }
  }
  return null;
}

const server = http.createServer((req, res) => {
  // Contact form endpoint — the reference POSTs the same payload to /submit.
  if (req.method === 'POST' && req.url.split('?')[0] === '/submit') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1e6) req.destroy();
    });
    req.on('end', () => {
      let payload = {};
      try {
        payload = JSON.parse(body || '{}');
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'invalid json' }));
        return;
      }
      if (!payload.name || !payload.email) {
        res.writeHead(422, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'name and email required' }));
        return;
      }
      fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.appendFileSync(
        ENQUIRIES,
        JSON.stringify({ ...payload, received_at: new Date().toISOString() }) + '\n',
      );
      console.log(`  enquiry from ${payload.name} <${payload.email}>`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    });
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD, POST' });
    res.end('Method not allowed');
    return;
  }

  const target = resolveTarget(url.parse(req.url).pathname);

  if (!target) {
    const notFound = path.join(ROOT, '404.html');
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(fs.existsSync(notFound) ? fs.readFileSync(notFound) : 'Not found');
    return;
  }

  const ext = path.extname(target).toLowerCase();
  const headers = {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Cache-Control': 'no-cache',
  };

  // Range support keeps the hero video seekable in local testing.
  if (req.headers.range && (ext === '.mp4' || ext === '.webm')) {
    const size = fs.statSync(target).size;
    const [startRaw, endRaw] = req.headers.range.replace(/bytes=/, '').split('-');
    const start = parseInt(startRaw, 10) || 0;
    const end = endRaw ? parseInt(endRaw, 10) : size - 1;
    res.writeHead(206, {
      ...headers,
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': end - start + 1,
    });
    fs.createReadStream(target, { start, end }).pipe(res);
    return;
  }

  res.writeHead(200, headers);
  fs.createReadStream(target).pipe(res);
});

server.listen(PORT, () => {
  console.log(`\n  Fix For Ease clone running at http://localhost:${PORT}\n`);
  console.log('  Routes: /  /ourworks  /ourteam  /how-it-works  /faq\n');
});
