// @gitlawb/icaptcha — public package surface.
//
// Two ways to consume:
//   1. Remote:   `new ICaptchaClient({ baseUrl }).solve(opts, solver)` — drive
//      the deployed service at icaptcha.gitlawb.com.
//   2. Embedded: `new Engine(loadConfig())` — run the challenge gate in-process.
//
// Proofs are Ed25519-signed; verify them offline against /v1/pubkey or with the
// exported `Prover`.

export { ICaptchaClient } from './client.ts'
export type { ICaptchaClientOptions, RequestChallengeOptions, Solver } from './client.ts'

export { Engine, InvalidTokenError, ExpiredChallengeError } from './engine.ts'
export type { IssueOptions, EngineDeps } from './engine.ts'

export { TokenSealer } from './token.ts'
export { Prover, generateSigningKey } from './proof.ts'
export { buildRegistry, DETERMINISTIC } from './generators/index.ts'
export type { Registry } from './generators/index.ts'
export { gradeDefault, normalize, isNumeric } from './grader.ts'
export { clampLevel, escalate } from './difficulty.ts'
export { loadConfig } from './config.ts'
export type { ICaptchaConfig } from './config.ts'

export type {
  ChallengeType,
  Challenge,
  SealedState,
  AnswerResult,
  ProofClaims,
  GeneratedChallenge,
  Generator,
} from './types.ts'
