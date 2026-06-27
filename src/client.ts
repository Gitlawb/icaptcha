// iCaptcha — HTTP client for TS/JS consumers.
//
// The Rust gitlawb node (or any service) can call the JSON API directly; this
// is the ergonomic equivalent for TypeScript. `solve()` drives a full session:
// request → answer → (escalate on miss) → pass/fail, using a caller-supplied
// solver function (typically the caller's own LLM).

import type { AnswerResult, Challenge, ChallengeType, ProofClaims } from './types.ts'

export interface ICaptchaClientOptions {
  baseUrl: string
  apiKey?: string
  timeoutMs?: number
}

export interface RequestChallengeOptions {
  requesterId?: string
  requiredLevel?: number
  maxAttempts?: number
  types?: ChallengeType[]
}

/** Resolves a challenge prompt to an answer (e.g. wraps the caller's LLM). */
export type Solver = (challenge: Challenge) => string | Promise<string>

export class ICaptchaClient {
  private readonly baseUrl: string
  private readonly apiKey?: string
  private readonly timeoutMs: number

  constructor(opts: ICaptchaClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/+$/, '')
    this.apiKey = opts.apiKey
    this.timeoutMs = opts.timeoutMs ?? 10000
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeoutMs)
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {}),
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
      if (!res.ok) throw new Error(`icaptcha ${path} -> ${res.status}`)
      return (await res.json()) as T
    } finally {
      clearTimeout(timer)
    }
  }

  requestChallenge(opts: RequestChallengeOptions = {}): Promise<Challenge> {
    return this.post<Challenge>('/v1/challenge', opts)
  }

  submitAnswer(token: string, answer: string): Promise<AnswerResult> {
    return this.post<AnswerResult>('/v1/answer', { token, answer })
  }

  verifyProof(proof: string): Promise<{ valid: boolean; claims?: ProofClaims }> {
    return this.post('/v1/verify-proof', { proof })
  }

  /**
   * Run a full challenge session with a solver. Follows escalation until the
   * requester passes (returns the proof) or the attempt budget is exhausted.
   */
  async solve(
    opts: RequestChallengeOptions,
    solver: Solver,
  ): Promise<{ passed: boolean; proof?: string; level?: number }> {
    let challenge = await this.requestChallenge(opts)
    // Bound the loop by the attempt budget the server advertises.
    for (let guard = 0; guard < (opts.maxAttempts ?? 8) + 2; guard++) {
      const answer = await solver(challenge)
      const result = await this.submitAnswer(challenge.token, answer)
      if (result.status === 'passed') return { passed: true, proof: result.proof, level: result.level }
      if (result.status === 'failed') return { passed: false }
      challenge = result.challenge
    }
    return { passed: false }
  }
}
