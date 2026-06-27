// iCaptcha — proof tokens (Ed25519).
//
// On a pass, iCaptcha mints a compact signed token attesting "this requester
// solved to level N". It is signed with an Ed25519 private key; the public key
// is published at /v1/pubkey so ANY service can verify a proof offline without
// sharing a secret — the property that makes iCaptcha service-agnostic.

import {
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  sign as nodeSign,
  verify as nodeVerify,
  type KeyObject,
} from 'node:crypto'
import { bytesToB64url, b64urlToBytes, strToB64url, b64urlToStr } from './encoding.ts'
import type { ProofClaims } from './types.ts'

export interface JsonWebKey {
  kty: string
  crv: string
  x: string
}

/** Mint a fresh Ed25519 private key as base64 PKCS8 DER (for ICAPTCHA_SIGNING_KEY). */
export function generateSigningKey(): string {
  const { privateKey } = generateKeyPairSync('ed25519')
  return privateKey.export({ format: 'der', type: 'pkcs8' }).toString('base64')
}

/** Signs and verifies proof tokens with one Ed25519 keypair. */
export class Prover {
  private readonly privateKey: KeyObject
  private readonly publicKey: KeyObject
  /** True when the key was generated on boot (dev) rather than configured. */
  readonly ephemeral: boolean

  constructor(signingKeyB64: string) {
    if (signingKeyB64) {
      this.privateKey = createPrivateKey({
        key: Buffer.from(signingKeyB64, 'base64'),
        format: 'der',
        type: 'pkcs8',
      })
      // node derives a public KeyObject from a private one here; bun-types omits
      // the KeyObject overload of createPublicKey. Remove cast once typings include it.
      // @ts-expect-error -- upstream typings gap, KeyObject is valid here
      this.publicKey = createPublicKey(this.privateKey)
      this.ephemeral = false
    } else {
      // Use the keypair's own public key directly — avoids createPublicKey, which
      // is broken for Ed25519 on Bun 1.1.x.
      const kp = generateKeyPairSync('ed25519')
      this.privateKey = kp.privateKey
      this.publicKey = kp.publicKey
      this.ephemeral = true
    }
  }

  /** Compact token: base64url(JSON claims) + "." + base64url(signature). */
  issue(claims: ProofClaims): string {
    const payload = strToB64url(JSON.stringify(claims))
    const sig = nodeSign(null, Buffer.from(payload), this.privateKey)
    return `${payload}.${bytesToB64url(new Uint8Array(sig))}`
  }

  /** Verify signature + expiry. Returns claims on success, null otherwise. */
  verify(token: string, nowSec: number = Math.floor(Date.now() / 1000)): ProofClaims | null {
    const dot = token.indexOf('.')
    if (dot < 0) return null
    const payload = token.slice(0, dot)
    const sig = token.slice(dot + 1)
    let ok = false
    try {
      ok = nodeVerify(null, Buffer.from(payload), this.publicKey, Buffer.from(b64urlToBytes(sig)))
    } catch {
      return null
    }
    if (!ok) return null
    let claims: ProofClaims
    try {
      claims = JSON.parse(b64urlToStr(payload)) as ProofClaims
    } catch {
      return null
    }
    if (typeof claims.exp !== 'number' || claims.exp < nowSec) return null
    return claims
  }

  /** Public key as a JWK, for /v1/pubkey and offline consumers. */
  publicJwk(): JsonWebKey {
    return this.publicKey.export({ format: 'jwk' }) as unknown as JsonWebKey
  }
}
