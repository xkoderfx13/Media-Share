import http from 'node:http';

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

export function createDonationServer({ logger, port, path, onDonation }) {
  const server = http.createServer(async (req, res) => {
    if (req.method !== 'POST' || req.url !== path) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'error', error: 'Not found' }));
      return;
    }

    try {
      const payload = await parseJsonBody(req);
      logger.info('Received local donation request.');
      await onDonation(payload);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
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
    logger.info(`Local donation endpoint listening at http://127.0.0.1:${port}${path}`);
  });

  return server;
}
