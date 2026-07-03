import test from 'node:test';
import assert from 'node:assert/strict';
import { MediaQueue } from '../src/queue.js';

test('MediaQueue constructor initializes with default maxItems', () => {
  const queue = new MediaQueue();
  assert.equal(queue.maxItems, 10);
  assert.deepEqual(queue.items, []);
});

test('MediaQueue constructor accepts custom maxItems', () => {
  const queue = new MediaQueue({ maxItems: 5 });
  assert.equal(queue.maxItems, 5);
});

test('MediaQueue.add() adds item to queue', () => {
  const queue = new MediaQueue();
  const item = { id: '1', url: 'https://youtube.com/watch?v=test1', title: 'Test Video 1' };
  const result = queue.add(item);
  
  assert.equal(result, item);
  assert.equal(queue.items.length, 1);
  assert.equal(queue.items[0], item);
});

test('MediaQueue.add() prevents duplicates', () => {
  const queue = new MediaQueue();
  const item = { id: 'test1', url: 'https://youtube.com/watch?v=test1', title: 'Test' };
  
  queue.add(item);
  assert.throws(
    () => queue.add(item),
    /already queued/
  );
});

test('MediaQueue.add() throws when queue is full', () => {
  const queue = new MediaQueue({ maxItems: 2 });
  queue.add({ id: '1', url: 'url1', title: 'title1' });
  queue.add({ id: '2', url: 'url2', title: 'title2' });
  
  assert.throws(
    () => queue.add({ id: '3', url: 'url3', title: 'title3' }),
    /Queue is full/
  );
});

test('MediaQueue.getAll() returns copy of items', () => {
  const queue = new MediaQueue();
  const item = { id: '1', url: 'url1', title: 'title1' };
  queue.add(item);
  
  const all = queue.getAll();
  assert.deepEqual(all, [item]);
  
  // تعديل النسخة المرجعة قد يؤثر على الـ queue (لأن getAll ترجع نسخة سطحية)
  // هذا متوقع في الكود الحالي
  // إذا أردت عمق أعمق، يجب استخدام JSON.parse(JSON.stringify(...))
  all[0].title = 'Modified';
  // النسخة الحالية من getAll تعيد [...this.items] وهي نسخة سطحية
  // فالتعديل على الخصائص يؤثر على الأصلي
  assert.equal(queue.items[0].title, 'Modified');
});

test('MediaQueue.remove() removes item by ID', () => {
  const queue = new MediaQueue();
  const item1 = { id: '1', url: 'url1', title: 'title1' };
  const item2 = { id: '2', url: 'url2', title: 'title2' };
  
  queue.add(item1);
  queue.add(item2);
  
  const removed = queue.remove('1');
  assert.equal(removed.id, '1');
  assert.equal(queue.items.length, 1);
  assert.equal(queue.items[0].id, '2');
});

test('MediaQueue.remove() cleans up seen set', () => {
  const queue = new MediaQueue();
  const item = { id: '1', url: 'url1', title: 'title1' };
  
  queue.add(item);
  queue.remove('1');
  
  // يجب أن نتمكن من إضافة نفس الـ ID مرة أخرى
  queue.add(item);
  assert.equal(queue.items.length, 1);
});

test('MediaQueue.remove() returns null for non-existent item', () => {
  const queue = new MediaQueue();
  const result = queue.remove('non-existent');
  assert.equal(result, null);
});

test('MediaQueue.clear() empties the queue and seen set', () => {
  const queue = new MediaQueue();
  queue.add({ id: '1', url: 'url1', title: 'title1' });
  queue.add({ id: '2', url: 'url2', title: 'title2' });
  
  queue.clear();
  
  assert.equal(queue.items.length, 0);
  // يجب أن نتمكن من إضافة نفس الـ IDs مرة أخرى
  queue.add({ id: '1', url: 'url1', title: 'title1' });
  assert.equal(queue.items.length, 1);
});

test('MediaQueue handles multiple items correctly', () => {
  const queue = new MediaQueue({ maxItems: 5 });
  
  for (let i = 1; i <= 5; i++) {
    queue.add({ id: `${i}`, url: `url${i}`, title: `title${i}` });
  }
  
  assert.equal(queue.items.length, 5);
  assert.throws(
    () => queue.add({ id: '6', url: 'url6', title: 'title6' }),
    /Queue is full/
  );
});