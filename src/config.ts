// iCaptcha — runtime configuration, all from env. Sensible defaults keep it
// working with zero config in dev (ephemeral keys are generated with a warning);
// production must set ICAPTCHA_SECRET and ICAPTCHA_SIGNING_KEY.

import type { ChallengeType } from './types.ts'

function num(name: string, fallback: number): number {
  const raw = process.env[name]
  if (raw === undefined || raw === '') return fallback
  const n = Number(raw)
  return Number.isFinite(n) ? n : fallback
}

function list(name: string): string[] {
  return (process.env[name] ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

const ALL_TYPES: ChallengeType[] = [
  'arithmetic',
  'algebra',
  'sequence',
  'anagram',
  'logic',
  'wordproblem',
  'riddle',
]

export interface ICaptchaConfig {
  port: number
  /** Bearer keys callers must present on /v1/challenge and /v1/answer. Empty = open. */
  apiKeys: string[]

  // --- token sealing (AES-GCM) ---
  /** Secret for sealing challenge state. Empty => ephemeral (dev only). */
  secret: string
  /** Ed25519 private key, base64 PKCS8 DER. Empty => ephemeral (dev only). */
  signingKey: string

  // --- LLM gateway (for wordproblem/riddle generation + reasoning grading) ---
  gatewayUrl: string
  gatewayKey: string
  model: string
  llmTimeoutMs: number

  // --- challenge policy ---
  challengeTtlSeconds: number
  proofTtlSeconds: number
  maxLevel: number
  /** Difficulty increase per failed attempt. */
  difficultyStep: number
  /** Default floor level a requester must solve at. */
  requiredLevel: number
  /** Default attempt budget before failing. */
  maxAttempts: number
  /** LLM-backed challenge types only appear at/above this level. */
  llmMinLevel: number
  /** Which challenge types are enabled. */
  enabledTypes: ChallengeType[]
}

export function loadConfig(): ICaptchaConfig {
  const enabled = list('ICAPTCHA_TYPES')
  return {
    port: num('PORT', 8080),
    apiKeys: list('ICAPTCHA_API_KEYS'),

    secret: process.env.ICAPTCHA_SECRET ?? '',
    signingKey: process.env.ICAPTCHA_SIGNING_KEY ?? '',

    gatewayUrl: process.env.OPENGATEWAY_URL ?? 'https://opengateway.gitlawb.com',
    gatewayKey: process.env.OPENGATEWAY_API_KEY ?? '',
    model: process.env.ICAPTCHA_MODEL ?? 'auto',
    llmTimeoutMs: num('ICAPTCHA_LLM_TIMEOUT_MS', 8000),

    challengeTtlSeconds: num('ICAPTCHA_CHALLENGE_TTL_SECONDS', 120),
    proofTtlSeconds: num('ICAPTCHA_PROOF_TTL_SECONDS', 300),
    maxLevel: num('ICAPTCHA_MAX_LEVEL', 10),
    difficultyStep: num('ICAPTCHA_DIFFICULTY_STEP', 1),
    requiredLevel: num('ICAPTCHA_REQUIRED_LEVEL', 3),
    maxAttempts: num('ICAPTCHA_MAX_ATTEMPTS', 4),
    llmMinLevel: num('ICAPTCHA_LLM_MIN_LEVEL', 5),
    enabledTypes: (enabled.length ? (enabled as ChallengeType[]) : ALL_TYPES).filter((t) =>
      ALL_TYPES.includes(t),
    ),
  }
}
