import test from 'node:test';
import assert from 'node:assert/strict';
import { extractYouTubeUrl, validateYouTubeUrl } from '../src/youtube.js';

test('extractYouTubeUrl detects standard YouTube links', () => {
  const message = 'Please play https://www.youtube.com/watch?v=dQw4w9WgXcQ thanks!';
  assert.equal(extractYouTubeUrl(message), 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
});

test('extractYouTubeUrl detects short links', () => {
  const message = 'Check this https://youtu.be/abc123xyz';
  assert.equal(extractYouTubeUrl(message), 'https://youtu.be/abc123xyz');
});

test('validateYouTubeUrl rejects Shorts URLs', async () => {
  await assert.rejects(
    () => validateYouTubeUrl('https://www.youtube.com/shorts/abc123xyz'),
    /Shorts/
  );
});

test('validateYouTubeUrl rejects URLs longer than three minutes', async () => {
  await assert.rejects(
    () => validateYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ', { durationSeconds: 181 }),
    /3 minutes/
  );
});
