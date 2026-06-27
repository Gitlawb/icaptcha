// Generator registry. Deterministic generators are static; LLM generators are
// config-bound. `buildRegistry` returns only the enabled, usable generators.

import type { ICaptchaConfig } from '../config.ts'
import type { ChallengeType, Generator } from '../types.ts'
import { arithmetic } from './arithmetic.ts'
import { algebra } from './algebra.ts'
import { sequence } from './sequence.ts'
import { anagram } from './anagram.ts'
import { logic } from './logic.ts'
import { makeLlmGenerators } from './llm.ts'

export const DETERMINISTIC: Generator[] = [arithmetic, algebra, sequence, anagram, logic]

export interface Registry {
  /** All enabled generators by type. */
  byType: Map<ChallengeType, Generator>
  /** Generators eligible at a given difficulty (respects minLevel + LLM gating). */
  eligible(difficulty: number): Generator[]
  /** Deterministic generators eligible at a difficulty (for fallback). */
  eligibleDeterministic(difficulty: number): Generator[]
}

export function buildRegistry(cfg: ICaptchaConfig): Registry {
  const all: Generator[] = [...DETERMINISTIC]
  // LLM generators only matter when a gateway key is configured.
  if (cfg.gatewayKey) all.push(...makeLlmGenerators(cfg))

  const enabled = all.filter((g) => cfg.enabledTypes.includes(g.type))
  const byType = new Map<ChallengeType, Generator>(enabled.map((g) => [g.type, g]))

  const eligible = (difficulty: number): Generator[] =>
    enabled.filter((g) => difficulty >= g.minLevel && (!g.llm || difficulty >= cfg.llmMinLevel))

  const eligibleDeterministic = (difficulty: number): Generator[] =>
    eligible(difficulty).filter((g) => !g.llm)

  return { byType, eligible, eligibleDeterministic }
}
