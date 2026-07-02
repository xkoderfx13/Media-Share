import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env');

dotenv.config({ path: envPath });

function getEnv(name, fallback = '') {
  const value = process.env[name];
  return value ?? fallback;
}

export const config = {
  streamlabsSocketToken: getEnv('STREAMLABS_SOCKET_TOKEN'),
  logLevel: getEnv('LOG_LEVEL', 'info'),
  streamerBotUrl: getEnv('STREAMERBOT_URL', ''),
  localDonationPort: Number(getEnv('LOCAL_DONATION_PORT', '9000')),
  localDonationPath: getEnv('LOCAL_DONATION_PATH', '/donation'),
  obsWebSocketUrl: getEnv('OBS_WEBSOCKET_URL', ''),
  obsWebSocketPassword: getEnv('OBS_WEBSOCKET_PASSWORD', ''),
  obsBrowserSourceName: getEnv('OBS_BROWSER_SOURCE_NAME', ''),
  obsSceneName: getEnv('OBS_SCENE_NAME', ''),
};
