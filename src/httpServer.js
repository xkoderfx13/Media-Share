import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const parsed = body ? JSON.parse(body) : {};
        resolve(parsed);
      } catch (error) {
        reject(error);
      }
    });

    req.on('error', reject);
  });
}

export function createDonationServer({ logger, port, path: donationPath, onDonation, playerHtmlPath }) {
  let playerHtml = '';
  try {
    playerHtml = fs.readFileSync(playerHtmlPath, 'utf-8');
  } catch { }

  const server = http.createServer(async (req, res) => {
    const reqPath = req.url.split('?')[0];
    const reqQuery = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';

    // GET /player → serve the local player HTML
    if (req.method === 'GET' && reqPath === '/player' && playerHtml) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(playerHtml);
      return;
    }

    if (req.method !== 'POST' || reqPath !== donationPath) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'error', error: 'Not found' }));
      return;
    }

    try {
      const payload = await parseJsonBody(req);
      logger.info('Received local donation request.');
      const result = await onDonation(payload);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', ...result }));
    } catch (error) {
      logger.error('Failed to parse donation request.', error);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'error', error: error.message }));
    }
  });

  server.on('clientError', (err, socket) => {
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
  });

  server.listen(port, '127.0.0.1', () => {
    logger.info(`Local donation endpoint listening at http://127.0.0.1:${port}${donationPath}`);
  });

  return server;
}
