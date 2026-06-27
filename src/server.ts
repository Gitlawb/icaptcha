// iCaptcha — HTTP service (Bun.serve), deployed at icaptcha.gitlawb.com.
//
//   POST /v1/challenge     -> issue a challenge
//   POST /v1/answer        -> grade an answer (pass | continue-harder | fail)
//   POST /v1/verify-proof  -> verify a proof token
//   GET  /v1/pubkey        -> Ed25519 public key (JWKS) for offline verification
//   GET  /health, /metrics

import { loadConfig } from './config.ts'
import { Engine, InvalidTokenError, ExpiredChallengeError } from './engine.ts'
import type { ChallengeType } from './types.ts'

const cfg = loadConfig()
const engine = new Engine(cfg)

if (!cfg.secret) console.warn('⚠ ICAPTCHA_SECRET unset — using an ephemeral seal key (dev only)')
if (engine.prover.ephemeral)
  console.warn('⚠ ICAPTCHA_SIGNING_KEY unset — proofs signed with an ephemeral key (dev only)')

const counters = {
  challenges: 0,
  passed: 0,
  failed: 0,
  continued: 0,
  proofs_verified: 0,
  errors: 0,
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function authorized(req: Request): boolean {
  if (cfg.apiKeys.length === 0) return true
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim()
  return cfg.apiKeys.includes(token)
}

function metrics(): string {
  const c = counters
  return (
    [
      '# HELP icaptcha_challenges_total Challenges issued.',
      '# TYPE icaptcha_challenges_total counter',
      `icaptcha_challenges_total ${c.challenges}`,
      '# HELP icaptcha_outcomes_total Answer outcomes.',
      '# TYPE icaptcha_outcomes_total counter',
      `icaptcha_outcomes_total{outcome="passed"} ${c.passed}`,
      `icaptcha_outcomes_total{outcome="failed"} ${c.failed}`,
      `icaptcha_outcomes_total{outcome="continued"} ${c.continued}`,
      '# HELP icaptcha_proofs_verified_total Proof verifications.',
      '# TYPE icaptcha_proofs_verified_total counter',
      `icaptcha_proofs_verified_total ${c.proofs_verified}`,
      '# HELP icaptcha_errors_total Request errors.',
      '# TYPE icaptcha_errors_total counter',
      `icaptcha_errors_total ${c.errors}`,
    ].join('\n') + '\n'
  )
}

const server = Bun.serve({
  port: cfg.port,
  async fetch(request) {
    const url = new URL(request.url)
    const { pathname } = url
    const method = request.method

    if (method === 'GET' && pathname === '/health') {
      return json({
        ok: true,
        service: 'icaptcha',
        version: 2,
        llm: cfg.gatewayKey ? 'on' : 'off',
        signing: engine.prover.ephemeral ? 'ephemeral' : 'configured',
      })
    }

    if (method === 'GET' && pathname === '/metrics') {
      return new Response(metrics(), { headers: { 'content-type': 'text/plain; version=0.0.4' } })
    }

    if (method === 'GET' && pathname === '/v1/pubkey') {
      return json({ keys: [{ ...engine.prover.publicJwk(), use: 'sig', alg: 'EdDSA' }] })
    }

    if (method === 'POST' && pathname === '/v1/challenge') {
      if (!authorized(request)) return json({ error: 'unauthorized' }, 401)
      let body: {
        requesterId?: string
        requiredLevel?: number
        maxAttempts?: number
        types?: ChallengeType[]
      }
      try {
        body = (await request.json()) as typeof body
      } catch {
        body = {}
      }
      try {
        const challenge = await engine.issueChallenge(body ?? {})
        counters.challenges++
        return json(challenge)
      } catch (err) {
        counters.errors++
        return json({ error: `challenge failed: ${(err as Error).message}` }, 500)
      }
    }

    if (method === 'POST' && pathname === '/v1/answer') {
      if (!authorized(request)) return json({ error: 'unauthorized' }, 401)
      let body: { token?: string; answer?: string }
      try {
        body = (await request.json()) as typeof body
      } catch {
        counters.errors++
        return json({ error: 'invalid JSON body' }, 400)
      }
      if (!body?.token || typeof body.token !== 'string') {
        counters.errors++
        return json({ error: 'missing required field: token' }, 400)
      }
      try {
        const result = await engine.submitAnswer(body.token, body.answer ?? '')
        if (result.status === 'passed') counters.passed++
        else if (result.status === 'failed') counters.failed++
        else counters.continued++
        return json(result)
      } catch (err) {
        if (err instanceof InvalidTokenError) return json({ error: err.message }, 400)
        if (err instanceof ExpiredChallengeError) return json({ error: err.message }, 410)
        counters.errors++
        return json({ error: `answer failed: ${(err as Error).message}` }, 500)
      }
    }

    if (method === 'POST' && pathname === '/v1/verify-proof') {
      let body: { proof?: string }
      try {
        body = (await request.json()) as typeof body
      } catch {
        return json({ error: 'invalid JSON body' }, 400)
      }
      if (!body?.proof) return json({ error: 'missing required field: proof' }, 400)
      const claims = engine.prover.verify(body.proof)
      counters.proofs_verified++
      return claims ? json({ valid: true, claims }) : json({ valid: false })
    }

    return json({ error: 'not found' }, 404)
  },
})

console.log(
  `iCaptcha v2 listening on :${server.port} ` +
    `(llm=${cfg.gatewayKey ? 'on' : 'off'}, model=${cfg.model}, ` +
    `levels=1..${cfg.maxLevel}, requiredLevel=${cfg.requiredLevel}, maxAttempts=${cfg.maxAttempts}, ` +
    `auth=${cfg.apiKeys.length > 0 ? 'required' : 'open'})`,
)
