import { expect, test, describe } from 'bun:test'
import { TokenSealer } from '../src/token.ts'
import { Prover, generateSigningKey } from '../src/proof.ts'
import type { SealedState, ProofClaims } from '../src/types.ts'

const sample: SealedState = {
  cid: 'c1',
  type: 'arithmetic',
  difficulty: 3,
  answer: '42',
  requesterId: 'agent-x',
  attempts: 0,
  maxAttempts: 4,
  requiredLevel: 3,
  iat: 1000,
  exp: 2000,
  jti: 'j1',
}

describe('TokenSealer (AES-GCM)', () => {
  test('seal then unseal round-trips', async () => {
    const s = new TokenSealer('top-secret')
    const token = await s.seal(sample)
    expect(typeof token).toBe('string')
    const back = await s.unseal(token)
    expect(back).toEqual(sample)
  })

  test('a tampered token fails to unseal', async () => {
    const s = new TokenSealer('top-secret')
    const token = await s.seal(sample)
    const tampered = token.slice(0, -2) + (token.endsWith('A') ? 'BB' : 'AA')
    await expect(s.unseal(tampered)).rejects.toBeDefined()
  })

  test('a different secret cannot unseal', async () => {
    const a = new TokenSealer('secret-a')
    const b = new TokenSealer('secret-b')
    const token = await a.seal(sample)
    await expect(b.unseal(token)).rejects.toBeDefined()
  })
})

describe('Prover (Ed25519)', () => {
  const claims: ProofClaims = {
    sub: 'agent-x',
    level: 5,
    iss: 'icaptcha',
    iat: 1000,
    exp: 9999999999,
    jti: 'p1',
  }

  test('issue then verify succeeds', () => {
    const p = new Prover('')
    const token = p.issue(claims)
    const out = p.verify(token, 1000)
    expect(out).toEqual(claims)
  })

  test('expired proof is rejected', () => {
    const p = new Prover('')
    const token = p.issue({ ...claims, exp: 1500 })
    expect(p.verify(token, 2000)).toBeNull()
  })

  test('tampered proof is rejected', () => {
    const p = new Prover('')
    const token = p.issue(claims)
    const [payload, sig] = token.split('.')
    const forged = payload!.replace(/.$/, (c) => (c === 'A' ? 'B' : 'A')) + '.' + sig
    expect(p.verify(forged, 1000)).toBeNull()
  })

  test('a configured signing key is stable across instances', () => {
    const key = generateSigningKey()
    const p1 = new Prover(key)
    const p2 = new Prover(key)
    const token = p1.issue(claims)
    // A second prover with the same key verifies the first's proof.
    expect(p2.verify(token, 1000)).toEqual(claims)
    expect(p1.ephemeral).toBe(false)
  })

  test('publicJwk exports an OKP/Ed25519 key', () => {
    const p = new Prover('')
    const jwk = p.publicJwk()
    expect(jwk.kty).toBe('OKP')
    expect(jwk.crv).toBe('Ed25519')
    expect(typeof jwk.x).toBe('string')
  })
})
