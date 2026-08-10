const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const API_BASE = 'https://secrets-api.appbrewery.com';
const ROOT_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function serveStatic(req, res) {
  const requestPath = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  const safePath = path.normalize(requestPath).replace(/^\/(?:\.\.(?:\/|$))+/g, '');
  const filePath = path.join(ROOT_DIR, safePath);

  if (!filePath.startsWith(ROOT_DIR)) {
    sendJson(res, 403, { error: 'Forbidden' });
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        sendJson(res, 404, { error: 'Not found' });
      } else {
        sendJson(res, 500, { error: 'Unable to read file' });
      }
      return;
    }

    const extension = path.extname(filePath);
    const contentType = MIME_TYPES[extension] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function proxyRequest(req, res) {
  const targetUrl = `${API_BASE}${req.url.replace(/^\/api/, '')}`;

  readBody(req)
    .then((body) => {
      const requestOptions = {
        method: req.method,
        headers: { ...req.headers },
      };

      delete requestOptions.headers.host;
      delete requestOptions.headers['content-length'];
      delete requestOptions.headers['content-encoding'];
      delete requestOptions.headers['transfer-encoding'];
      delete requestOptions.headers['accept-encoding'];
      delete requestOptions.headers.connection;

      const client = targetUrl.startsWith('https') ? https : http;
      const proxyReq = client.request(targetUrl, requestOptions, (proxyRes) => {
        const chunks = [];
        proxyRes.on('data', (chunk) => chunks.push(chunk));
        proxyRes.on('end', () => {
          const responseBody = Buffer.concat(chunks);
          const headers = { ...proxyRes.headers };
          delete headers['content-encoding'];
          delete headers['transfer-encoding'];
          delete headers['content-length'];
          headers['content-length'] = Buffer.byteLength(responseBody).toString();
          res.writeHead(proxyRes.statusCode || 200, headers);
          res.end(responseBody);
        });
      });

      proxyReq.on('error', (error) => {
        sendJson(res, 502, { error: 'Proxy request failed', message: error.message });
      });

      if (body) {
        proxyReq.write(body);
      }

      proxyReq.end();
    })
    .catch((error) => {
      sendJson(res, 500, { error: 'Failed to read request body', message: error.message });
    });
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api')) {
    proxyRequest(req, res);
    return;
  }

  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`Secrets Hub server listening on http://localhost:${PORT}`);
});
