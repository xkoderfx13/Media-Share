export class MediaQueue {
  constructor({ maxItems = 10 } = {}) {
    this.maxItems = maxItems;
    this.items = [];
    this.seen = new Set(); // ✅ إضافة الـ Set المفقود
  }

  add(item) {
    if (this.items.length >= this.maxItems) {
      throw new Error('Queue is full.');
    }

    // تجنب التكرار
    if (this.seen.has(item.id)) {
      throw new Error('This video is already queued.');
    }

    this.items.push(item);
    this.seen.add(item.id);
    return item;
  }

  getAll() {
    return [...this.items];
  }

  remove(itemId) {
    const index = this.items.findIndex(item => item.id === itemId);
    if (index !== -1) {
      const removed = this.items.splice(index, 1)[0];
      this.seen.delete(itemId);
      return removed;
    }
    return null;
  }

  clear() {
    this.items = [];
    this.seen.clear();
  }
}