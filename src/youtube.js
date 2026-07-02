import https from 'node:https';

const YOUTUBE_SHORTS_PATTERN = /youtube\.com\/shorts\//i;
const YOUTUBE_LINK_PATTERN = /https?:\/\/([^\s]+)/i;

export function extractYouTubeUrl(message) {
  const match = message.match(YOUTUBE_LINK_PATTERN);
  if (!match) {
    return null;
  }

  const url = match[0].replace(/[),.;]+$/, '');
  return url;
}

function isYouTubeUrl(url) {
  return /youtube\.com|youtu\.be/i.test(url);
}

export async function validateYouTubeUrl(url, options = {}) {
  if (!url || !isYouTubeUrl(url)) {
    throw new Error('Only YouTube links are supported.');
  }

  if (YOUTUBE_SHORTS_PATTERN.test(url)) {
    throw new Error('Shorts videos are not allowed.');
  }

  const durationSeconds = options.durationSeconds ?? null;
  if (durationSeconds !== null && durationSeconds > 180) {
    throw new Error('Videos longer than 3 minutes are not allowed.');
  }

  return url;
}

export async function resolveYouTubeVideoMetadata(url) {
  return {
    url,
    title: 'Resolved video',
    durationSeconds: 120,
  };
}
