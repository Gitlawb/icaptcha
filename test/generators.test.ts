import { expect, test, describe } from 'bun:test'
import { DETERMINISTIC } from '../src/generators/index.ts'
import { arithmetic } from '../src/generators/arithmetic.ts'
import { gradeDefault } from '../src/grader.ts'
import type { Generator } from '../src/types.ts'

function gradeWith(gen: Generator, response: string, answer: string): boolean | Promise<boolean> {
  return gen.grade ? gen.grade(response, answer) : gradeDefault(response, answer)
}

describe('deterministic generators', () => {
  for (const gen of DETERMINISTIC) {
    test(`${gen.type}: produces a gradeable challenge across levels`, async () => {
      for (const level of [gen.minLevel, 5, 10]) {
        const c = await gen.generate(level)
        expect(typeof c.prompt).toBe('string')
        expect(c.prompt.length).toBeGreaterThan(0)
        expect(String(c.answer).length).toBeGreaterThan(0)
        // The canonical answer grades correct...
        expect(await gradeWith(gen, c.answer, c.answer)).toBe(true)
        // ...and an obviously-wrong answer does not.
        expect(await gradeWith(gen, '__definitely_wrong__', c.answer)).toBe(false)
      }
    })
  }
})

describe('arithmetic correctness', () => {
  test('the stated expression actually evaluates to the answer', async () => {
    for (let i = 0; i < 50; i++) {
      const c = await arithmetic.generate(1 + (i % 10))
      // prompt is "What is A + B - C ...?"
      const expr = c.prompt.replace(/^What is /, '').replace(/\?$/, '')
      const tokens = expr.split(' ')
      let total = Number(tokens[0])
      for (let t = 1; t < tokens.length; t += 2) {
        const op = tokens[t]
        const n = Number(tokens[t + 1])
        total = op === '+' ? total + n : total - n
      }
      expect(String(total)).toBe(c.answer)
    }
  })
})

describe('anagram grading', () => {
  test('accepts the source word case/space-insensitively', async () => {
    const c = await arithmetic.generate(1) // sanity that import graph is fine
    expect(c).toBeDefined()
    const an = DETERMINISTIC.find((g) => g.type === 'anagram')!
    const gen = await an.generate(1)
    expect(await gradeWith(an, `  ${gen.answer.toUpperCase()} `, gen.answer)).toBe(true)
  })
})
