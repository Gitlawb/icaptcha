// LLM-backed generators (wordproblem, riddle) via opengateway. These add
// novelty the deterministic generators can't — fresh, reasoning-heavy prompts
// that are awkward to pre-script. They are config-bound (need a gateway key),
// generate at higher levels only, and grade leniently with the model.
//
// Failure policy: generate() throws on gateway error so the engine can fall back
// to a deterministic generator; grade() falls back to exact match.

import type { ICaptchaConfig } from '../config.ts'
import { gradeDefault } from '../grader.ts'
import type { ChallengeType, Generator, GeneratedChallenge } from '../types.ts'

async function chat(cfg: ICaptchaConfig, system: string, user: string): Promise<string | null> {
  if (!cfg.gatewayKey) return null
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), cfg.llmTimeoutMs)
  try {
    const res = await fetch(`${cfg.gatewayUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${cfg.gatewayKey}`,
      },
      body: JSON.stringify({
        model: cfg.model,
        temperature: 0.7,
        max_tokens: 250,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
      signal: controller.signal,
    })
    if (!res.ok) return null
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
    return data.choices?.[0]?.message?.content ?? null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

function extractJson(text: string): { prompt: string; answer: string } | null {
  const m = text.match(/\{[\s\S]*\}/)
  if (!m) return null
  try {
    const o = JSON.parse(m[0]) as Record<string, unknown>
    if (typeof o.prompt === 'string' && (typeof o.answer === 'string' || typeof o.answer === 'number')) {
      return { prompt: o.prompt, answer: String(o.answer) }
    }
  } catch {
    /* fall through */
  }
  return null
}

const GEN_SYSTEM: Record<'wordproblem' | 'riddle', string> = {
  wordproblem: `You generate a single self-contained math/logic WORD PROBLEM with one unambiguous short answer (a number or a single word). Output ONLY JSON: {"prompt": string, "answer": string}. No solution steps in the prompt.`,
  riddle: `You generate a single classic RIDDLE with one unambiguous short answer (a single word or short phrase). Output ONLY JSON: {"prompt": string, "answer": string}.`,
}

function makeGenerator(type: 'wordproblem' | 'riddle', cfg: ICaptchaConfig): Generator {
  return {
    type,
    minLevel: cfg.llmMinLevel,
    llm: true,
    async generate(difficulty: number): Promise<GeneratedChallenge> {
      const content = await chat(
        cfg,
        GEN_SYSTEM[type],
        `Difficulty ${difficulty} of 10 (higher = harder). Generate one now.`,
      )
      const parsed = content && extractJson(content)
      if (!parsed) throw new Error(`llm ${type} generation failed`)
      return parsed
    },
    async grade(response: string, answer: string): Promise<boolean> {
      if (gradeDefault(response, answer)) return true // fast path / exact
      const verdict = await chat(
        cfg,
        `You grade answers. Reply with ONLY "yes" or "no".`,
        `Question's correct answer: "${answer}". The user answered: "${response}". Is the user's answer correct (accept synonyms, equivalent phrasing, and formatting differences)?`,
      )
      if (verdict == null) return false // gateway down -> exact match already failed
      return /^\s*yes\b/i.test(verdict)
    },
  }
}

export function makeLlmGenerators(cfg: ICaptchaConfig): Generator[] {
  return [makeGenerator('wordproblem', cfg), makeGenerator('riddle', cfg)]
}
