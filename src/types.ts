// iCaptcha — proof-of-intelligence gate. Shared types / API contract.
//
// iCaptcha is service-agnostic: it issues a freshly-generated challenge, grades
// the answer, escalates difficulty on failure, and — on success — mints a
// signed proof any service can verify offline. It knows nothing about the
// caller's domain (no users, repos, or identities beyond an opaque requesterId).

/** Challenge families. Deterministic ones grade exactly; LLM ones may grade fuzzily. */
export type ChallengeType =
  | 'arithmetic'
  | 'algebra'
  | 'sequence'
  | 'anagram'
  | 'logic'
  | 'wordproblem'
  | 'riddle'

/** Public-facing challenge handed to the requester. */
export interface Challenge {
  /** Opaque id for this challenge instance. */
  challengeId: string
  type: ChallengeType
  /** Current difficulty level (1..maxLevel). */
  difficulty: number
  /** The question to answer. */
  prompt: string
  /** ISO timestamp after which the token is rejected. */
  expiresAt: string
  /** Attempts left before the session fails. */
  attemptsRemaining: number
  /** Sealed state — opaque to the client; returned on /v1/answer. */
  token: string
}

/** Internal sealed challenge state (AES-GCM encrypted into `Challenge.token`). */
export interface SealedState {
  cid: string
  type: ChallengeType
  difficulty: number
  /** Canonical answer (never sent to the client; lives only inside the seal). */
  answer: string
  requesterId?: string
  attempts: number
  maxAttempts: number
  /** Floor difficulty the requester must solve at to pass. */
  requiredLevel: number
  /** issued-at (unix seconds). */
  iat: number
  /** expires-at (unix seconds). */
  exp: number
  /** unique token id. */
  jti: string
}

/** Outcome of submitting an answer. */
export type AnswerResult =
  | { status: 'passed'; level: number; proof: string }
  | { status: 'continue'; challenge: Challenge; attemptsRemaining: number }
  | { status: 'failed'; reason: string }

/** Claims inside a signed proof token. */
export interface ProofClaims {
  /** requesterId, or 'anonymous'. */
  sub: string
  /** difficulty level solved. */
  level: number
  iss: string
  iat: number
  exp: number
  jti: string
}

/** What a generator produces for a given difficulty. */
export interface GeneratedChallenge {
  prompt: string
  /** Canonical answer used for grading. */
  answer: string
}

/** A pluggable challenge generator. */
export interface Generator {
  type: ChallengeType
  /** Minimum difficulty level at which this type may be selected. */
  minLevel: number
  /** Whether this generator needs the LLM gateway. */
  llm: boolean
  generate(difficulty: number): GeneratedChallenge | Promise<GeneratedChallenge>
  /**
   * Optional custom grading. Defaults to normalized exact match in grader.ts.
   * May be async (LLM-graded reasoning types).
   */
  grade?(response: string, answer: string): boolean | Promise<boolean>
}
