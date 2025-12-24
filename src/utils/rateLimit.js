export class RateLimiter {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.lastRequestTime = 0;
    this.minRequestInterval = 1000; // 1 second minimum between requests
  }

  async enqueue(request) {
    return new Promise((resolve, reject) => {
      this.queue.push({ request, resolve, reject });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    const delay = Math.max(0, this.minRequestInterval - timeSinceLastRequest);

    setTimeout(async () => {
      const { request, resolve, reject } = this.queue.shift();
      this.lastRequestTime = Date.now();

      try {
        const result = await request();
        resolve(result);
      } catch (error) {
        reject(error);
      }

      this.processing = false;
      this.processQueue();
    }, delay);
  }
}

export const apiRateLimiter = new RateLimiter();
