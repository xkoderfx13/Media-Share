export class MediaQueue {
  constructor({ maxItems = 10 } = {}) {
    this.maxItems = maxItems;
    this.items = [];
  }

  add(item) {
    if (this.items.length >= this.maxItems) {
      throw new Error('Queue is full.');
    }

    this.items.push(item);
    return item;
  }

  getAll() {
    return [...this.items];
  }

  clear() {
    this.items = [];
    this.seen.clear();
  }
}
