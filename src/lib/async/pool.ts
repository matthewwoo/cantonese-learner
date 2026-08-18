// src/lib/async/pool.ts
// Bounded-concurrency map. The AI routes used to await one call at a time,
// which is fine for three items and fatal for four hundred — a long article
// translates one paragraph and one vocabulary word per round trip, and serially
// that runs past the 300s function ceiling in vercel.json. Running a handful at
// once keeps the same calls and the same outputs, just not one-at-a-time.

/**
 * Map `items` through `fn` with at most `limit` in flight at once.
 * Results come back in input order. A rejection propagates, so callers that
 * want per-item fallbacks should catch inside `fn`.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  if (items.length === 0) return []

  const results = new Array<R>(items.length)
  let next = 0

  const worker = async () => {
    while (true) {
      const index = next++
      if (index >= items.length) return
      results[index] = await fn(items[index], index)
    }
  }

  const workers = Array.from(
    { length: Math.min(Math.max(1, limit), items.length) },
    worker
  )
  await Promise.all(workers)

  return results
}
