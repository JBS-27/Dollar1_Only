type Stamp = number[];

const buckets = new Map<string, Stamp>();

/** Sliding-window limiter. Serverless instances are isolated — pair with an edge limiter at scale. */
export function allow(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const prior = buckets.get(key) ?? [];
  const fresh = prior.filter((stamp) => now - stamp < windowMs);
  if (fresh.length >= limit) {
    buckets.set(key, fresh);
    return false;
  }
  fresh.push(now);
  buckets.set(key, fresh);
  return true;
}

export function rejectIfLimited(res: { status: (code: number) => { json: (body: unknown) => void } }, key: string, limit: number, windowMs: number): boolean {
  if (allow(key, limit, windowMs)) return false;
  res.status(429).json({ error: "Slow down. $1 Only is patient." });
  return true;
}

setInterval(() => {
  const now = Date.now();
  for (const [key, stamps] of buckets) {
    const fresh = stamps.filter((stamp) => now - stamp < 60 * 60 * 1000);
    if (fresh.length === 0) buckets.delete(key);
    else buckets.set(key, fresh);
  }
}, 5 * 60 * 1000).unref?.();
