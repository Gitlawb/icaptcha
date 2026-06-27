// iCaptcha — crypto-backed randomness. Challenges must be unpredictable, so we
// never use Math.random; all entropy comes from the platform CSPRNG.

/** Uniform random integer in [min, max] inclusive. */
export function randInt(min: number, max: number): number {
  if (max < min) [min, max] = [max, min]
  const range = max - min + 1
  // Rejection sampling over 32-bit words to avoid modulo bias.
  const maxUnbiased = Math.floor(0xffffffff / range) * range
  const buf = new Uint32Array(1)
  let x = 0
  do {
    crypto.getRandomValues(buf)
    x = buf[0]!
  } while (x >= maxUnbiased)
  return min + (x % range)
}

/** Random element of a non-empty array. */
export function choice<T>(arr: readonly T[]): T {
  return arr[randInt(0, arr.length - 1)]!
}

/** In-place-free Fisher-Yates shuffle returning a new array. */
export function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(0, i)
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

/** A random url-safe id of `bytes` bytes (hex-encoded). */
export function randId(bytes = 12): string {
  const buf = new Uint8Array(bytes)
  crypto.getRandomValues(buf)
  return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('')
}
