import { config } from './config.js';
import { createLogger } from './logger.js';
import { createStreamlabsClient } from './streamlabsClient.js';
import { createDonationServer } from './httpServer.js';
import { MediaQueue } from './queue.js';
import { extractYouTubeUrl, validateYouTubeUrl, resolveYouTubeVideoMetadata } from './youtube.js';
import { triggerStreamerBot } from './streamerbot.js';
import { createOBSClient } from './obsClient.js';

const logger = createLogger(config.logLevel);
const queue = new MediaQueue();
const obsClient = createOBSClient({
  logger,
  url: config.obsWebSocketUrl,
  password: config.obsWebSocketPassword,
  browserSourceName: config.obsBrowserSourceName,
  sceneName: config.obsSceneName,
});

async function handleDonation(donation) {
  const payload = donation?.message || donation?.data || donation;
  const donorName = payload?.from || payload?.name || payload?.donor || 'Unknown';
  const amount = payload?.amount || payload?.currency_amount || payload?.formatted_amount || 'Unknown';
  const message = payload?.message || payload?.text || '';
  const candidateLink = payload?.url || payload?.link || payload?.youtubeUrl || payload?.videoUrl || message;

  logger.info('Donation received:');
  logger.info(`- Donor: ${donorName}`);
  logger.info(`- Amount: ${amount}`);
  logger.info(`- Message: ${message}`);
  if (candidateLink && candidateLink !== message) {
    logger.info(`- Link: ${candidateLink}`);
  }

  const youtubeUrl = extractYouTubeUrl(candidateLink);
  if (!youtubeUrl) {
    logger.info('No YouTube link detected in donation message or payload.');
    return;
  }

  try {
    await validateYouTubeUrl(youtubeUrl);
    const metadata = await resolveYouTubeVideoMetadata(youtubeUrl);
    const queueItem = { id: metadata.url, url: metadata.url, donorName, amount, message };
    queue.add(queueItem);
    logger.info(`Queued video: ${metadata.url}`);

    if (config.streamerBotUrl) {
      await triggerStreamerBot({
        logger,
        url: config.streamerBotUrl,
        payload: {
          event: 'media-share.play',
          url: metadata.url,
          donorName,
          amount,
          message,
        },
      });
      logger.info('Notified Streamer.bot about the queued item.');
    }

    if (config.obsWebSocketUrl && config.obsBrowserSourceName) {
      await obsClient.updateBrowserSourceUrl(metadata.url);
      logger.info('Updated OBS browser source with the queued video URL.');
    }
  } catch (error) {
    logger.warn(`Donation skipped: ${error.message}`);
  }
}

async function main() {
  logger.info('Media Share is starting...');

  if (!config.streamlabsSocketToken) {
    logger.error('STREAMLABS_SOCKET_TOKEN is missing. Please set it in your .env file.');
    process.exit(1);
  }

  createDonationServer({
    logger,
    port: config.localDonationPort,
    path: config.localDonationPath,
    onDonation: handleDonation,
  });

  const client = createStreamlabsClient({
    logger,
    socketToken: config.streamlabsSocketToken,
    onDonation: handleDonation,
  });

  if (config.obsWebSocketUrl && config.obsBrowserSourceName) {
    try {
      await obsClient.connect();
    } catch (error) {
      logger.warn('OBS WebSocket connection failed. Continuing without OBS integration.', error);
    }
  }

  client.connect();
}

main().catch((error) => {
  logger.error('Application failed to start.', error);
  process.exit(1);
});
