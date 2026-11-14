// src/lib/byok/pipelines/concurrency.js
/**
 * Executes async worker factories with an upper concurrency cap (mirrors Semaphore(3) in Android)
 * so multi-section/multi-week BYOK requests never flood browser sockets or OpenAI rate limits.
 *
 * @template T, R
 * @param {Array<T>} items
 * @param {number} limit
 * @param {(item: T, index: number) => Promise<R>} worker
 * @returns {Promise<Array<R>>}
 */
export async function mapWithConcurrency(items, limit, worker) {
  if (!Array.isArray(items) || items.length === 0) return [];
  const cap = Math.max(1, Math.min(limit || 3, items.length));
  const results = new Array(items.length);
  let cursor = 0;

  async function next() {
    while (cursor < items.length) {
      const idx = cursor;
      cursor += 1;
      results[idx] = await worker(items[idx], idx);
    }
  }

  await Promise.all(Array.from({ length: cap }, () => next()));
  return results;
}
