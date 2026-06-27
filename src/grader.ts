// iCaptcha — answer normalization + default grading.
//
// Deterministic generators carry a canonical `answer` and rely on this default
// (numeric-aware, case/space-insensitive) grader. Generators with fuzzier
// answers (the LLM types) override `grade` themselves.

export function normalize(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.!?]+$/, '')
}

export function isNumeric(s: string): boolean {
  return /^-?\d+(\.\d+)?$/.test(s.trim())
}

/** Numeric-aware exact match: "5" == "5.0", "  Cat " == "cat". */
export function gradeDefault(response: string, answer: string): boolean {
  if (response == null) return false
  if (isNumeric(answer) && isNumeric(response)) {
    return Number(response.trim()) === Number(answer.trim())
  }
  return normalize(response) === normalize(answer)
}
