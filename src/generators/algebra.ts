// Algebra: solve for x. The solution x is chosen first as an integer, then the
// equation is built around it, so the answer is always a clean integer.

import { randInt } from '../rng.ts'
import type { Generator, GeneratedChallenge } from '../types.ts'

export const algebra: Generator = {
  type: 'algebra',
  minLevel: 2,
  llm: false,
  generate(difficulty: number): GeneratedChallenge {
    const d = Math.max(2, difficulty)
    const x = randInt(-6 - d, 6 + d)

    if (d <= 4) {
      // a*x + b = c
      const a = randInt(2, 3 + d)
      const b = randInt(-8 * d, 8 * d)
      const c = a * x + b
      const sign = b < 0 ? `- ${-b}` : `+ ${b}`
      return { prompt: `Solve for x: ${a}x ${sign} = ${c}`, answer: String(x) }
    }

    if (d <= 7) {
      // a*x + b = e*x + f
      let a = randInt(2, 4 + d)
      let e = randInt(2, 4 + d)
      if (a === e) e += 1
      const b = randInt(-8 * d, 8 * d)
      const f = (a - e) * x + b
      const bs = b < 0 ? `- ${-b}` : `+ ${b}`
      const fs = f < 0 ? `- ${-f}` : `+ ${f}`
      return { prompt: `Solve for x: ${a}x ${bs} = ${e}x ${fs}`, answer: String(x) }
    }

    // a*(x + b) = c
    const a = randInt(2, 5 + d)
    const b = randInt(-9, 9)
    const c = a * (x + b)
    const bs = b < 0 ? `- ${-b}` : `+ ${b}`
    return { prompt: `Solve for x: ${a}(x ${bs}) = ${c}`, answer: String(x) }
  },
}
