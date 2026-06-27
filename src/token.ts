// iCaptcha — stateless challenge state, sealed with AES-256-GCM.
//
// The challenge's answer and bookkeeping live inside an authenticated-encrypted
// token the client carries between /v1/challenge and /v1/answer. The client
// cannot read it (encrypted) or forge it (GCM auth tag), so iCaptcha needs no
// server-side session store and scales horizontally.

import { bytesToB64url, b64urlToBytes } from './encoding.ts'
import type { SealedState } from './types.ts'

const IV_BYTES = 12

/** Derive a stable 256-bit AES key from the configured secret. */
async function deriveKey(secret: string): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret))
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
}

/** A sealer bound to one secret. Build once and reuse. */
export class TokenSealer {
  private readonly keyPromise: Promise<CryptoKey>

  constructor(secret: string) {
    this.keyPromise = deriveKey(secret)
  }

  async seal(state: SealedState): Promise<string> {
    const key = await this.keyPromise
    const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES))
    const plaintext = new TextEncoder().encode(JSON.stringify(state))
    const ct = new Uint8Array(
      await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext as BufferSource),
    )
    const out = new Uint8Array(iv.length + ct.length)
    out.set(iv, 0)
    out.set(ct, iv.length)
    return bytesToB64url(out)
  }

  /** Decrypt + parse. Throws on tamper, wrong key, or malformed input. */
  async unseal(token: string): Promise<SealedState> {
    const key = await this.keyPromise
    const raw = b64urlToBytes(token)
    if (raw.length <= IV_BYTES) throw new Error('token too short')
    const iv = raw.subarray(0, IV_BYTES)
    const ct = raw.subarray(IV_BYTES)
    const pt = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      key,
      ct as BufferSource,
    )
    return JSON.parse(new TextDecoder().decode(pt)) as SealedState
  }
}
