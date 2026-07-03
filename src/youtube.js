import https from 'node:https';

const YOUTUBE_SHORTS_PATTERN = /youtube\.com\/shorts\//i;
const YOUTUBE_DOMAINS = /youtube\.com|youtu\.be/i;

export function extractYouTubeUrl(message) {
  if (!message) {
    return null;
  }

  const match = message.match(/https?:\/\/[^\s]+/i);
  if (!match) {
    return null;
  }

  const url = match[0].replace(/[),.;]+$/, '');

  if (!YOUTUBE_DOMAINS.test(url)) {
    return null;
  }

  return url;
}

function isYouTubeUrl(url) {
  return /youtube\.com|youtu\.be/i.test(url);
}

export async function validateYouTubeUrl(url) {
  if (!url || !isYouTubeUrl(url)) {
    throw new Error('Only YouTube links are supported.');
  }

  if (YOUTUBE_SHORTS_PATTERN.test(url)) {
    throw new Error('YouTube Shorts videos are not allowed.');
  }

  return url;
}

export function toEmbedUrl(url, maxDuration) {
  const videoId = getYouTubeVideoId(url);
  if (!videoId) return url;
  let embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;
  if (maxDuration) {
    embedUrl += `&end=${maxDuration}`;
  }
  return embedUrl;
}

// استخراج video ID من الـ URL
function getYouTubeVideoId(url) {
  // معالجة روابط مختلفة:
  // https://www.youtube.com/watch?v=VIDEO_ID
  // https://youtu.be/VIDEO_ID
  // https://www.youtube.com/watch?v=VIDEO_ID&other=params
  
  let videoId = null;
  
  if (url.includes('youtu.be')) {
    videoId = url.split('youtu.be/')[1]?.split('?')[0] || null;
  } else if (url.includes('youtube.com')) {
    const match = url.match(/[?&]v=([^&]+)/);
    videoId = match ? match[1] : null;
  }
  
  return videoId;
}

export async function resolveYouTubeVideoMetadata(url) {
  const videoId = getYouTubeVideoId(url);
  
  if (!videoId) {
    throw new Error('Could not extract video ID from URL');
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (apiKey) {
    return fetchYouTubeMetadata(videoId, apiKey);
  }

  return {
    url,
    id: videoId,
    title: 'YouTube Video',
    durationSeconds: null,
  };
}

// اختياري: دالة للتواصل مع YouTube API (إذا أردت استخدام API key)
async function fetchYouTubeMetadata(videoId, apiKey) {
  return new Promise((resolve, reject) => {
    const queryParams = new URLSearchParams({
      id: videoId,
      key: apiKey,
      part: 'contentDetails,snippet',
      maxHeight: 720,
    });

    const url = `https://www.googleapis.com/youtube/v3/videos?${queryParams.toString()}`;

    https.get(url, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`YouTube API error: ${res.statusCode}`));
          return;
        }
        try {
          const data = JSON.parse(body);
          if (data.items && data.items.length > 0) {
            const item = data.items[0];
            const duration = parseDuration(item.contentDetails.duration);
            resolve({
              url: `https://www.youtube.com/watch?v=${videoId}`,
              id: videoId,
              title: item.snippet.title,
              durationSeconds: duration,
            });
          } else {
            reject(new Error('Video not found'));
          }
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', reject);
  });
}

// تحويل ISO 8601 duration إلى ثواني
function parseDuration(duration) {
  // مثال: PT1H2M30S = 1 hour, 2 minutes, 30 seconds = 3750 seconds
  const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
  const match = duration.match(regex);
  
  if (!match) return 0;
  
  const hours = parseInt(match[1]) || 0;
  const minutes = parseInt(match[2]) || 0;
  const seconds = parseInt(match[3]) || 0;
  
  return hours * 3600 + minutes * 60 + seconds;
}