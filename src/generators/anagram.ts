// Anagram / spelling: unscramble letters into a word. Word length grows with
// difficulty. Graded against the source word (normalized, case-insensitive).

import { choice, shuffle } from '../rng.ts'
import type { Generator, GeneratedChallenge } from '../types.ts'

// Curated, lower-cased, grouped by length so difficulty maps to length.
const WORDS: Record<number, string[]> = {
  3: ['cat', 'dog', 'sun', 'map', 'key', 'red', 'box', 'fox', 'cup', 'pen'],
  4: ['tree', 'book', 'fish', 'lamp', 'gold', 'rain', 'wind', 'star', 'door', 'leaf'],
  5: ['apple', 'house', 'water', 'plant', 'cloud', 'music', 'light', 'river', 'stone', 'bread'],
  6: ['garden', 'planet', 'silver', 'bridge', 'castle', 'forest', 'rocket', 'flower', 'orange', 'pencil'],
  7: ['journey', 'diamond', 'gravity', 'kitchen', 'machine', 'picture', 'rainbow', 'thunder', 'village', 'crystal'],
  8: ['mountain', 'elephant', 'sunshine', 'computer', 'hospital', 'language', 'treasure', 'umbrella', 'dinosaur', 'sandwich'],
  9: ['adventure', 'chocolate', 'telephone', 'butterfly', 'orchestra', 'discovery', 'wonderful', 'breakfast', 'invention', 'pineapple'],
}

function lengthFor(d: number): number {
  return Math.min(9, 3 + Math.floor((d - 1) / 1.5))
}

export const anagram: Generator = {
  type: 'anagram',
  minLevel: 1,
  llm: false,
  generate(difficulty: number): GeneratedChallenge {
    const len = lengthFor(Math.max(1, difficulty))
    const word = choice(WORDS[len] ?? WORDS[5]!)
    let scrambled = word
    // Re-shuffle until it differs from the source.
    for (let i = 0; i < 8 && scrambled === word; i++) {
      scrambled = shuffle(word.split('')).join('')
    }
    return {
      prompt: `Unscramble these letters into a single English word: ${scrambled
        .split('')
        .join(' ')}`,
      answer: word,
    }
  },
  // Accept the source word (normalized, letters only).
  grade(response: string, answer: string): boolean {
    return response.trim().toLowerCase().replace(/[^a-z]/g, '') === answer.toLowerCase()
  },
}
