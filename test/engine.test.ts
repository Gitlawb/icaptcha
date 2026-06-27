import { expect, test, describe } from 'bun:test'
import { Engine, InvalidTokenError, ExpiredChallengeError } from '../src/engine.ts'
import { loadConfig, type ICaptchaConfig } from '../src/config.ts'
import { generateSigningKey } from '../src/proof.ts'
import { TokenSealer } from '../src/token.ts'
import type { SealedState } from '../src/types.ts'

// Deterministic config: fixed keys, no gateway (so no network / no LLM types).
function makeCfg(over: Partial<ICaptchaConfig> = {}): ICaptchaConfig {
  return {
    ...loadConfig(),
    secret: 'engine-test-secret',
    signingKey: generateSigningKey(),
    gatewayKey: '',
    enabledTypes: ['arithmetic', 'algebra', 'sequence', 'anagram', 'logic'],
    requiredLevel: 2,
    maxAttempts: 3,
    challengeTtlSeconds: 120,
    proofTtlSeconds: 300,
    ...over,
  }
}

describe('Engine', () => {
  test('a correct answer passes and yields a verifiable proof', async () => {
    const cfg = makeCfg()
    const engine = new Engine(cfg)
    const sealer = new TokenSealer(cfg.secret)

    const challenge = await engine.issueChallenge({ requesterId: 'agent-7', requiredLevel: 2 })
    expect(challenge.difficulty).toBe(2)
    expect(challenge.attemptsRemaining).toBe(3)

    // White-box: read the sealed answer to play the role of a perfect solver.
    const state = (await sealer.unseal(challenge.token)) as SealedState
    const result = await engine.submitAnswer(challenge.token, state.answer)

    expect(result.status).toBe('passed')
    if (result.status !== 'passed') throw new Error('unreachable')
    expect(result.level).toBe(2)
    const claims = engine.prover.verify(result.proof)
    expect(claims?.sub).toBe('agent-7')
    expect(claims?.level).toBe(2)
  })

  test('wrong answers escalate difficulty and exhaust the budget', async () => {
    const cfg = makeCfg({ requiredLevel: 2, maxAttempts: 3 })
    const engine = new Engine(cfg)

    let challenge = await engine.issueChallenge({ requiredLevel: 2 })
    const levels: number[] = [challenge.difficulty]
    let failed = false

    for (let i = 0; i < 5; i++) {
      const result = await engine.submitAnswer(challenge.token, '__wrong__')
      if (result.status === 'continue') {
        levels.push(result.challenge.difficulty)
        challenge = result.challenge
      } else if (result.status === 'failed') {
        failed = true
        break
      } else {
        throw new Error('wrong answer should never pass')
      }
    }

    expect(failed).toBe(true)
    // Difficulty strictly increased on each escalation: 2,3,4...
    expect(levels[0]).toBe(2)
    expect(levels[1]).toBe(3)
    expect(levels.every((l, i) => i === 0 || l > levels[i - 1]!)).toBe(true)
  })

  test('an invalid token is rejected', async () => {
    const engine = new Engine(makeCfg())
    await expect(engine.submitAnswer('not-a-real-token', 'x')).rejects.toBeInstanceOf(
      InvalidTokenError,
    )
  })

  test('an expired challenge is rejected', async () => {
    const cfg = makeCfg()
    const engine = new Engine(cfg)
    const sealer = new TokenSealer(cfg.secret)
    const past = Math.floor(Date.now() / 1000) - 10
    const expiredState: SealedState = {
      cid: 'c',
      type: 'arithmetic',
      difficulty: 2,
      answer: '5',
      attempts: 0,
      maxAttempts: 3,
      requiredLevel: 2,
      iat: past - 120,
      exp: past,
      jti: 'j',
    }
    const token = await sealer.seal(expiredState)
    await expect(engine.submitAnswer(token, '5')).rejects.toBeInstanceOf(ExpiredChallengeError)
  })

  test('respects an explicit attempt budget of 1 (one miss = fail)', async () => {
    const engine = new Engine(makeCfg())
    const challenge = await engine.issueChallenge({ requiredLevel: 2, maxAttempts: 1 })
    const result = await engine.submitAnswer(challenge.token, '__wrong__')
    expect(result.status).toBe('failed')
  })
})
