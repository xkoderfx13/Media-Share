import http from 'node:http';
import https from 'node:https';

export async function triggerStreamerBot({ logger, url, payload = {} }) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;

    const request = client.request(
      urlObj,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
      },
      (response) => {
        let body = '';
        response.on('data', (chunk) => {
          body += chunk;
        });
        response.on('end', () => {
          if (response.statusCode && response.statusCode >= 200 && response.statusCode < 300) {
            resolve({ statusCode: response.statusCode, body });
            return;
          }
          reject(new Error(`Streamer.bot request failed with status ${response.statusCode}: ${body}`));
        });
      }
    );

    request.on('error', (error) => {
      reject(error);
    });

    request.write(data);
    request.end();
  });
}
