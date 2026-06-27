// iCaptcha — difficulty laddering.

import type { ICaptchaConfig } from './config.ts'

export function clampLevel(level: number, cfg: ICaptchaConfig): number {
  return Math.max(1, Math.min(cfg.maxLevel, Math.round(level)))
}

/** Raise difficulty after a failed attempt (capped at maxLevel). */
export function escalate(level: number, cfg: ICaptchaConfig): number {
  return clampLevel(level + cfg.difficultyStep, cfg)
}
