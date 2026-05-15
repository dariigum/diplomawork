export function createSlidingWindowRateLimiter(options: { windowMs: number; max: number }) {
  const buckets = new Map<string, number[]>();

  return (id: string): boolean => {
    const now = Date.now();
    const { windowMs, max } = options;
    let arr = buckets.get(id) ?? [];
    arr = arr.filter((t) => now - t < windowMs);
    if (arr.length >= max) {
      buckets.set(id, arr);
      return false;
    }
    arr.push(now);
    buckets.set(id, arr);
    return true;
  };
}
