// /lib/ai/retry.js
// Minimal retry helper for transient server errors (e.g., 5xx).
// We NEVER retry on timeouts; we DO retry once on 5xx with small backoff.

export async function retryOnce(fn, { shouldRetry, backoffMs = 300 } = {}) {
  // First try
  const res1 = await fn();
  if (!shouldRetry) return res1;

  if (!shouldRetry(res1)) return res1;

  // Backoff then retry once
  await new Promise(r => setTimeout(r, backoffMs));
  return fn();
}
