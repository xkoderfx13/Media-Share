import test from 'node:test';
import assert from 'node:assert/strict';
import { extractYouTubeUrl, validateYouTubeUrl, resolveYouTubeVideoMetadata, toEmbedUrl } from '../src/youtube.js';

// اختبارات extractYouTubeUrl
test('extractYouTubeUrl detects standard YouTube links', () => {
  const message = 'Please play https://www.youtube.com/watch?v=dQw4w9WgXcQ thanks!';
  const result = extractYouTubeUrl(message);
  assert.equal(result, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
});

test('extractYouTubeUrl detects short links', () => {
  const message = 'Check this https://youtu.be/abc123xyz';
  const result = extractYouTubeUrl(message);
  assert.equal(result, 'https://youtu.be/abc123xyz');
});

test('extractYouTubeUrl removes trailing punctuation', () => {
  const message = 'Check https://www.youtube.com/watch?v=test123.';
  const result = extractYouTubeUrl(message);
  assert.equal(result, 'https://www.youtube.com/watch?v=test123');
});

test('extractYouTubeUrl returns null for no URL', () => {
  const message = 'No link here';
  const result = extractYouTubeUrl(message);
  assert.equal(result, null);
});

test('extractYouTubeUrl handles null/empty input', () => {
  assert.equal(extractYouTubeUrl(null), null);
  assert.equal(extractYouTubeUrl(''), null);
});

// اختبارات validateYouTubeUrl
test('validateYouTubeUrl accepts valid YouTube links', async () => {
  const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  const result = await validateYouTubeUrl(url);
  assert.equal(result, url);
});

test('validateYouTubeUrl rejects Shorts URLs', async () => {
  await assert.rejects(
    () => validateYouTubeUrl('https://www.youtube.com/shorts/abc123xyz'),
    /Shorts/
  );
});

test('validateYouTubeUrl rejects non-YouTube URLs', async () => {
  await assert.rejects(
    () => validateYouTubeUrl('https://www.google.com/watch?v=test'),
    /Only YouTube/
  );
});

test('validateYouTubeUrl rejects invalid URLs', async () => {
  await assert.rejects(
    () => validateYouTubeUrl(''),
    /Only YouTube/
  );
});

// اختبارات resolveYouTubeVideoMetadata
test('resolveYouTubeVideoMetadata extracts video ID from standard URL', async () => {
  const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  const metadata = await resolveYouTubeVideoMetadata(url);
  assert.equal(metadata.id, 'dQw4w9WgXcQ');
  assert.equal(metadata.url, url);
});

test('resolveYouTubeVideoMetadata extracts video ID from short URL', async () => {
  const url = 'https://youtu.be/dQw4w9WgXcQ';
  const metadata = await resolveYouTubeVideoMetadata(url);
  assert.equal(metadata.id, 'dQw4w9WgXcQ');
});

test('resolveYouTubeVideoMetadata extracts video ID with query params', async () => {
  const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10s&list=123';
  const metadata = await resolveYouTubeVideoMetadata(url);
  assert.equal(metadata.id, 'dQw4w9WgXcQ');
});

test('resolveYouTubeVideoMetadata rejects invalid URL', async () => {
  await assert.rejects(
    () => resolveYouTubeVideoMetadata('https://www.youtube.com/watch?v='),
    /Could not extract/
  );
});

// اختبارات toEmbedUrl
test('toEmbedUrl converts standard URL to embed URL', () => {
  const result = toEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  assert.ok(result.startsWith('https://www.youtube.com/embed/dQw4w9WgXcQ'));
  assert.ok(result.includes('autoplay=1'));
  assert.ok(result.includes('rel=0'));
});

test('toEmbedUrl converts short URL to embed URL', () => {
  const result = toEmbedUrl('https://youtu.be/dQw4w9WgXcQ');
  assert.ok(result.startsWith('https://www.youtube.com/embed/dQw4w9WgXcQ'));
});

test('toEmbedUrl returns original URL if video ID cannot be extracted', () => {
  const result = toEmbedUrl('https://example.com');
  assert.equal(result, 'https://example.com');
});

test('toEmbedUrl adds end parameter when maxDuration is provided', () => {
  const result = toEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ', 30);
  assert.ok(result.includes('end=30'));
});

test('toEmbedUrl does not add end parameter without maxDuration', () => {
  const result = toEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  assert.ok(!result.includes('end='));
});