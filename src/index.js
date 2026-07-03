import { config } from './config.js';
import { createLogger } from './logger.js';
import { createStreamlabsClient } from './streamlabsClient.js';
import { createDonationServer } from './httpServer.js';
import { extractYouTubeUrl, validateYouTubeUrl, resolveYouTubeVideoMetadata } from './youtube.js';
import { triggerStreamerBot } from './streamerbot.js';
import { createOBSClient } from './obsClient.js';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { execFile } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PLAYER_HTML_PATH = path.join(__dirname, 'player.html');

function getYtDlpPath() {
  const candidate = path.join(os.homedir(), 'AppData', 'Local', 'Packages', 'PythonSoftwareFoundation.Python.3.13_qbz5n2kfra8p0', 'LocalCache', 'local-packages', 'Python313', 'Scripts', 'yt-dlp.exe');
  try { fs.accessSync(candidate); return candidate; } catch { return 'yt-dlp'; }
}
const YT_DLP = getYtDlpPath();

function getDirectVideoUrl(youtubeUrl) {
  return new Promise((resolve, reject) => {
    execFile(YT_DLP, ['-g', '-f', 'best[height<=720]', youtubeUrl], { timeout: 30000 }, (err, stdout) => {
      if (err) return reject(new Error(`yt-dlp failed: ${err.message}`));
      const url = stdout.trim().split('\n')[0];
      if (!url) return reject(new Error('No video URL from yt-dlp'));
      resolve(url);
    });
  });
}

const logger = createLogger(config.logLevel);
const obsClient = createOBSClient({
  logger,
  url: config.obsWebSocketUrl,
  password: config.obsWebSocketPassword,
  browserSourceName: config.obsBrowserSourceName,
  sceneName: config.obsSceneName,
});

let streamlabsClient = null;
let httpServer = null;

// نظام الطابور
const videoQueue = [];
let isPlaying = false;
let playTimer = null;
async function clearObsUrl() {
  if (!config.obsWebSocketUrl || !config.obsBrowserSourceName || !obsClient) return;
  try {
    await obsClient.updateBrowserSourceUrl('about:blank');
    logger.info('🧹 OBS browser source cleared');
  } catch { }
}

async function playNext() {
  if (isPlaying || videoQueue.length === 0) return;

  const item = videoQueue.shift();
  isPlaying = true;

  try {
    logger.info(`▶️ Playing: "${item.title}" (${item.duration}s)`);

    if (config.streamerBotUrl) {
      try {
        await triggerStreamerBot({
          logger,
          url: config.streamerBotUrl,
          payload: {
            event: 'media-share.play',
            url: item.playerUrl,
            title: item.title,
            donorName: item.donorName,
            amount: item.amount,
            message: item.message,
          },
        });
      } catch { }
    }

    if (config.obsWebSocketUrl && config.obsBrowserSourceName && obsClient) {
      await obsClient.updateBrowserSourceUrl(item.playerUrl);
      logger.info('✅ OBS updated');
    }
  } catch (error) {
    logger.warn(`⚠️  Playback error: ${error.message}`);
  }

  // بعد انتهاء المدة → clear + شغل التالي
  const durationMs = (item.duration || 30) * 1000;
  playTimer = setTimeout(async () => {
    await clearObsUrl();
    isPlaying = false;
    playNext();
  }, durationMs);
}

async function handleDonation(donation) {
  try {
    let payload = donation?.data ? donation.data : donation;

    const donorName = payload?.from || payload?.name || payload?.donor || 'Unknown';
    const amount = payload?.formatted_amount || payload?.formattedAmount || payload?.amount || 'Unknown';
    const message = typeof payload?.message === 'string' ? payload.message : (payload?.text || '');
    const candidateLink = payload?.url || payload?.link || payload?.youtubeUrl || payload?.videoUrl || message;

    logger.info('━'.repeat(50));
    logger.info('📦 Donation received:');
    logger.info(`  Donor: ${donorName}`);
    logger.info(`  Amount: ${amount}`);
    logger.info(`  Message: ${message || '(no message)'}`);
    if (candidateLink && candidateLink !== message) {
      logger.info(`  Link: ${candidateLink}`);
    }

    const youtubeUrl = extractYouTubeUrl(candidateLink);
    if (!youtubeUrl) {
      logger.info('⚠️  No YouTube link detected in donation message or payload.');
      logger.info('━'.repeat(50));
      return { success: false, reason: 'no_youtube_url' };
    }

    logger.info(`\n🔍 YouTube URL detected: ${youtubeUrl}`);

    // جلب بيانات الفيديو + رابط مباشر
    const [metadata, directUrl] = await Promise.all([
      resolveYouTubeVideoMetadata(youtubeUrl),
      getDirectVideoUrl(youtubeUrl),
    ]);
    logger.info(`✅ Metadata resolved: "${metadata.title}"`);

    await validateYouTubeUrl(youtubeUrl);
    logger.info('✅ URL validation passed');

    const MAX_DURATION = 30;
    const duration = (metadata.durationSeconds !== null && metadata.durationSeconds > MAX_DURATION) ? MAX_DURATION : (metadata.durationSeconds || MAX_DURATION);
    if (metadata.durationSeconds !== null && metadata.durationSeconds > MAX_DURATION) {
      logger.info(`⚠️  Video is ${metadata.durationSeconds}s, limiting to ${duration}s`);
    }

    const playerUrl = `http://127.0.0.1:${config.localDonationPort}/player?u=${encodeURIComponent(directUrl)}&e=${duration}`;

    const result = isPlaying ? 'added_to_queue' : 'playing_now';
    const queueItem = { playerUrl, youtubeUrl, title: metadata.title, donorName, amount, message, duration };
    videoQueue.push(queueItem);
    logger.info(`📍 Added to queue (${videoQueue.length} waiting) — ${result}`);

    playNext();

    logger.info('🎉 Donation processed successfully!');
    logger.info('━'.repeat(50));
    return { success: true, result, title: metadata.title, queueLength: videoQueue.length };
  } catch (error) {
    logger.error('❌ Unexpected error in donation handler:', error);
    logger.info('━'.repeat(50));
    return { success: false, reason: 'error', error: error.message };
  }
}

async function gracefulShutdown() {
  logger.info('\n\n🛑 Shutting down gracefully...');

  try {
    if (streamlabsClient) {
      streamlabsClient.disconnect();
    }

    if (httpServer) {
      httpServer.close(() => {
        logger.info('HTTP server closed');
      });
    }

    if (obsClient) {
      await obsClient.disconnect();
    }

    logger.info('✅ All connections closed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
}

// معالجة الإشارات
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

async function main() {
  logger.info('\n📺 Media Share Application Starting...\n');

  // التحقق من الـ Token
  if (!config.streamlabsSocketToken) {
    logger.error('❌ STREAMLABS_SOCKET_TOKEN is missing in .env file');
    process.exit(1);
  }

  // إنشء HTTP Server للـ Local Donations
  try {
    httpServer = createDonationServer({
      logger,
      port: config.localDonationPort,
      path: config.localDonationPath,
      onDonation: handleDonation,
      playerHtmlPath: PLAYER_HTML_PATH,
    });
  } catch (error) {
    logger.error('Failed to create HTTP server:', error);
    process.exit(1);
  }

  // إنشاء Streamlabs Client
  try {
    streamlabsClient = createStreamlabsClient({
      logger,
      socketToken: config.streamlabsSocketToken,
      onDonation: handleDonation,
    });
    streamlabsClient.connect();
  } catch (error) {
    logger.error('Failed to create Streamlabs client:', error);
    process.exit(1);
  }

  // الاتصال بـ OBS (اختياري)
  if (config.obsWebSocketUrl && config.obsBrowserSourceName) {
    try {
      await obsClient.connect();
    } catch (error) {
      logger.warn('⚠️  OBS WebSocket connection failed. Continuing without OBS integration.');
      logger.warn(`   Error: ${error.message}`);
    }
  }

  logger.info('✅ Application ready!\n');
  logger.info(`📡 Listening for Streamlabs donations...`);
  logger.info(`📝 Local donation endpoint: http://127.0.0.1:${config.localDonationPort}${config.localDonationPath}\n`);
}

main().catch((error) => {
  logger.error('Fatal error:', error);
  process.exit(1);
});