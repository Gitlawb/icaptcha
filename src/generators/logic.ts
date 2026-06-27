// Logic: transitive syllogisms ("All A are B...") and ordering puzzles. Both
// require following a chain of relations — easy for a reasoner, awkward to fake.

import { randInt, choice, shuffle } from '../rng.ts'
import type { Generator, GeneratedChallenge } from '../types.ts'

const CREATURES = [
  'bloops', 'razzies', 'zonks', 'wibbles', 'glorps', 'frumbles',
  'snarks', 'quaxils', 'plonks', 'dribbles', 'morgs', 'flurns',
]
const NAMES = ['Ana', 'Ben', 'Cy', 'Dot', 'Evan', 'Finn', 'Gwen', 'Hugo']

function syllogism(d: number): GeneratedChallenge {
  const chainLen = Math.min(CREATURES.length - 1, 2 + Math.floor(d / 2))
  const chain = shuffle(CREATURES).slice(0, chainLen + 1)
  const premises = []
  for (let i = 0; i < chain.length - 1; i++) {
    premises.push(`All ${chain[i]} are ${chain[i + 1]}.`)
  }
  // Half the time ask a valid transitive question (yes); otherwise ask about an
  // unrelated creature not in the chain (no).
  const askValid = randInt(0, 1) === 0
  const first = chain[0]!
  let target = chain[chain.length - 1]!
  let answer = 'yes'
  if (!askValid) {
    const outside = CREATURES.filter((c) => !chain.includes(c))
    if (outside.length) {
      target = choice(outside)
      answer = 'no'
    }
  }
  return {
    prompt: `${shuffle(premises).join(' ')} Is every one of the ${first} also ${target}? Answer yes or no.`,
    answer,
  }
}

function ordering(d: number): GeneratedChallenge {
  const count = Math.min(NAMES.length, 3 + Math.floor(d / 3))
  const order = shuffle(NAMES).slice(0, count) // index 0 = tallest
  const rels: string[] = []
  for (let i = 0; i < order.length - 1; i++) {
    rels.push(`${order[i]} is taller than ${order[i + 1]}.`)
  }
  const askTallest = randInt(0, 1) === 0
  return {
    prompt: `${shuffle(rels).join(' ')} Who is the ${askTallest ? 'tallest' : 'shortest'}?`,
    answer: askTallest ? order[0]! : order[order.length - 1]!,
  }
}

export const logic: Generator = {
  type: 'logic',
  minLevel: 3,
  llm: false,
  generate(difficulty: number): GeneratedChallenge {
    const d = Math.max(3, difficulty)
    return randInt(0, 1) === 0 ? syllogism(d) : ordering(d)
  },
}
