// Arithmetic: an additive/subtractive chain. Term count and magnitude grow
// with difficulty. Unambiguous and trivial to grade (numeric).

import { randInt, choice } from '../rng.ts'
import type { Generator, GeneratedChallenge } from '../types.ts'

export const arithmetic: Generator = {
  type: 'arithmetic',
  minLevel: 1,
  llm: false,
  generate(difficulty: number): GeneratedChallenge {
    const d = Math.max(1, difficulty)
    const terms = 2 + Math.floor(d / 2) // d1 -> 2 terms ... d10 -> 7 terms
    const magnitude = 10 * d

    let total = randInt(1, magnitude)
    let expr = String(total)
    for (let i = 1; i < terms; i++) {
      const op = choice(['+', '-'] as const)
      const n = randInt(1, magnitude)
      total = op === '+' ? total + n : total - n
      expr += ` ${op} ${n}`
    }
    return { prompt: `What is ${expr}?`, answer: String(total) }
  },
}
