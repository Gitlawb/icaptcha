// Sequence: give the next number. Pattern family widens with difficulty.

import { randInt, choice } from '../rng.ts'
import type { Generator, GeneratedChallenge } from '../types.ts'

type Kind = 'arithmetic' | 'geometric' | 'squares' | 'fibonacci' | 'alternating'

function kindsFor(d: number): Kind[] {
  if (d <= 3) return ['arithmetic']
  if (d <= 6) return ['arithmetic', 'geometric', 'squares']
  return ['geometric', 'squares', 'fibonacci', 'alternating']
}

export const sequence: Generator = {
  type: 'sequence',
  minLevel: 1,
  llm: false,
  generate(difficulty: number): GeneratedChallenge {
    const d = Math.max(1, difficulty)
    const kind = choice(kindsFor(d))
    const n = 5
    const seq: number[] = []
    let next = 0

    if (kind === 'arithmetic') {
      const start = randInt(1, 5 * d)
      const step = randInt(2, 3 + d)
      for (let i = 0; i < n; i++) seq.push(start + i * step)
      next = start + n * step
    } else if (kind === 'geometric') {
      const start = randInt(1, 1 + d)
      const ratio = randInt(2, 3)
      for (let i = 0; i < n; i++) seq.push(start * ratio ** i)
      next = start * ratio ** n
    } else if (kind === 'squares') {
      const off = randInt(0, d)
      for (let i = 0; i < n; i++) seq.push((i + 1 + off) ** 2)
      next = (n + 1 + off) ** 2
    } else if (kind === 'fibonacci') {
      let a = randInt(1, 1 + d)
      let b = randInt(a, a + d)
      for (let i = 0; i < n; i++) {
        seq.push(a)
        ;[a, b] = [b, a + b]
      }
      next = a
    } else {
      // alternating sign over an arithmetic magnitude
      const start = randInt(2, 4 + d)
      const step = randInt(2, 3 + d)
      for (let i = 0; i < n; i++) seq.push((start + i * step) * (i % 2 === 0 ? 1 : -1))
      next = (start + n * step) * (n % 2 === 0 ? 1 : -1)
    }

    return {
      prompt: `What is the next number in this sequence? ${seq.join(', ')}, ?`,
      answer: String(next),
    }
  },
}
