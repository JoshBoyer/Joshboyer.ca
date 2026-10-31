'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { createContactService, CONTACT_LIMITS } = require('./lib/contact-service.cjs');

// Load local .env if present (zero external dependencies)
const envFile = path.join(__dirname, '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
    }
  }
}

const root = path.join(__dirname, 'dist');
const contactService = createContactService({ env: process.env });

const types = {
  '.html': 'text/html;charset=utf-8',
  '.css': 'text/css;charset=utf-8',
  '.js': 'text/javascript;charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm'
};

function readRawBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    const chunks = []; let total = 0, settled = false, timer;
    const finish = (error, bytes) => {
      if (settled) return;
      settled = true; clearTimeout(timer);
      if (error) { chunks.length = 0; req.pause(); reject(error); }
      else resolve(bytes);
    };
    timer = setTimeout(() => finish(Object.assign(new Error('Request timed out'), {statusCode:408})), CONTACT_LIMITS.requestReadTimeoutMs);
    req.on('data', chunk => {
      if (settled) return;
      total += chunk.length;
      if (total > maxBytes) { finish(Object.assign(new Error('Request payload exceeds limit.'), {statusCode:413})); return; }
      chunks.push(chunk);
    });
    req.on('end', () => finish(null, Buffer.concat(chunks)));
    req.on('error', error => finish(error));
  });
}

function sendJson(res, status, payload, setCookieHeader) {
  const body = Buffer.from(JSON.stringify(payload), 'utf8');
  const headers = {
    'Content-Type': 'application/json;charset=utf-8',
    'Content-Length': body.length,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer'
  };
  if (setCookieHeader) headers['Set-Cookie'] = setCookieHeader;
  res.writeHead(status, headers);
  res.end(body);
}

async function handleContactApi(req, res) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { ok: false, code: 'METHOD_NOT_ALLOWED', error: 'Method not allowed' });
    return;
  }

  const origin = req.headers.origin;
  if (origin && !['https://joshboyer.ca', 'https://www.joshboyer.ca', 'http://localhost:4183', 'http://127.0.0.1:4183'].includes(origin)) {
    sendJson(res, 403, { ok: false, code: 'ORIGIN_NOT_ALLOWED', error: 'Please use the contact form on joshboyer.ca.' });
    return;
  }
  if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) {
    sendJson(res, 415, { ok: false, code: 'JSON_REQUIRED', error: 'JSON content is required.' });
    return;
  }
  let bodyObj;
  try {
    const raw = await readRawBody(req, CONTACT_LIMITS.maxRequestBodyBytes);
    bodyObj = raw.length ? JSON.parse(raw.toString('utf8')) : {};
  } catch (err) {
    const status = [408,413].includes(err?.statusCode) ? err.statusCode : 400;
    const code = status === 408 ? 'REQUEST_TIMEOUT' : status === 413 ? 'PAYLOAD_TOO_LARGE' : 'INVALID_JSON';
    const message = status === 408 ? 'Contact request timed out. Please try again.' : status === 413 ? 'Request payload exceeds limit.' : 'Invalid JSON request body.';
    if (status === 408 || status === 413) res.setHeader('Connection', 'close');
    sendJson(res, status, { ok: false, code, error: message });
    return;
  }

  const clientIp = req.socket?.remoteAddress || '127.0.0.1';
  const out = await contactService.handleSubmission({ body: bodyObj, clientIp });
  sendJson(res, out.status, out.body);
}

const server = http.createServer((req, res) => {
  if (typeof req.url !== 'string' || /(?:^|\/)(?:\.\.?|%2e%2e?)(?:\/|[?#]|$)/i.test(req.url)) {
    res.writeHead(403, { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' });
    res.end('Forbidden');
    return;
  }
  let parsedUrl, pathname;
  try {
    parsedUrl = new URL(req.url, 'http://localhost');
    pathname = decodeURIComponent(parsedUrl.pathname);
  } catch {
    res.writeHead(400, { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' });
    res.end('Invalid request');
    return;
  }

  // Match production containment before static routing, for every HTTP method.
  // eslint-disable-next-line no-control-regex -- Intentional rejection or removal of control characters.
  if (/[\\\u0000-\u001f\u007f%:]/.test(pathname) || pathname.split('/').some(p => p.startsWith('.') || p === '__proto__')) {
    res.writeHead(403, { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' });
    res.end('Forbidden');
    return;
  }
  if (/^\/api\/(?:twin(?:\/|$)|explore(?:\/|$)|config\/?$)/i.test(pathname) || /^\/(?:twin-(?:drawer|voice)\.(?:js|css)|josh-3d-avatar\.(?:js|css)|twin-context\.json|career-guide-ui\.js)$/i.test(pathname)) {
    sendJson(res, 410, { ok: false, enabled: false, available: false, error: { code: 'TWIN_REMOVED', message: 'The digital twin and its AI access have been removed.' } });
    return;
  }
  if (/^\/api\/chat(?:\/|$)/i.test(pathname)) {
    sendJson(res, 404, { schemaVersion: '1.0.0', error: { code: 'unavailable', retryable: false } });
    return;
  }
  if (/^\/chat-preview(?:\.html)?\/?$/i.test(pathname)) {
    res.writeHead(404, { 'Content-Type': 'text/plain;charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' });
    res.end('Not found');
    return;
  }
  if (pathname === '/api/contact' || pathname === '/api/contact/') {
    handleContactApi(req, res).catch(() => {
      if (!res.headersSent) sendJson(res, 500, { ok: false, code: 'INTERNAL_ERROR', error: 'Internal server error' });
    });
    return;
  }
  if (/^\/api(?:\/|$)/i.test(pathname)) {
    sendJson(res, 404, { schemaVersion: '1.0.0', error: { code: 'unavailable', retryable: false } });
    return;
  }

  if (!['GET', 'HEAD'].includes(req.method)) {
    res.writeHead(405);
    res.end();
    return;
  }

  if (pathname === '/') pathname = '/index.html';
  else if (['/resume', '/career-guide'].includes(pathname)) pathname += '.html';

  const filename = path.resolve(root, '.' + pathname);
  if (!filename.startsWith(root + path.sep)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filename, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(filename).toLowerCase();
    const contentType = types[ext] || 'application/octet-stream';
    const baseHeaders = {
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
      'Cache-Control': (ext === '.mp4' || ext === '.webm') ? 'public, max-age=3600' : 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer'
    };
    const range = req.headers.range;
    if (range) {
      const m = /bytes=(\d*)-(\d*)/.exec(range);
      if (!m) {
        res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` });
        res.end();
        return;
      }
      const start = m[1] ? parseInt(m[1], 10) : 0;
      const end = m[2] ? parseInt(m[2], 10) : stat.size - 1;
      if (isNaN(start) || isNaN(end) || start > end || end >= stat.size) {
        res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` });
        res.end();
        return;
      }
      res.writeHead(206, {
        ...baseHeaders,
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Content-Length': end - start + 1
      });
      if (req.method === 'HEAD') {
        res.end();
        return;
      }
      fs.createReadStream(filename, { start, end }).pipe(res);
      return;
    }
    res.writeHead(200, { ...baseHeaders, 'Content-Length': stat.size });
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    fs.createReadStream(filename).pipe(res);
  });
});

if (require.main === module) {
  server.listen(4183, '127.0.0.1', () =>
    process.stdout.write('Local integrated portfolio candidate http://127.0.0.1:4183/\n')
  );
}

module.exports = { server, contactService, createContactService };
