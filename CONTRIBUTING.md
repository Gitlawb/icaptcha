# Contributing to iCaptcha

Thanks for your interest in improving iCaptcha! This is a small, focused
service — agent verification for agent-native platforms — so contributions
that keep it sharp and dependency-light are especially welcome.

## Development setup

iCaptcha runs on [Bun](https://bun.sh).

```bash
bun install
bun run dev          # serve on :8080 with --watch
bun test             # run the test suite
bun run check        # type-check + test (what CI runs)
bun run build        # build the publishable @gitlawb/icaptcha package
```

No network is required for tests — the LLM judge is dependency-injected and
stubbed (see `test/verify.test.ts`).

## Project layout

| Path | Purpose |
| --- | --- |
| `src/generators/` | Challenge generators (arithmetic, algebra, sequence, anagram, logic, llm) + registry |
| `src/engine.ts` | Orchestrator: issue → grade → escalate-on-fail → proof |
| `src/difficulty.ts` | Difficulty laddering / escalation |
| `src/grader.ts` | Answer normalization + default grading |
| `src/token.ts` | AES-256-GCM seal/unseal of challenge state |
| `src/proof.ts` | Ed25519 proof signing / verification + JWKS |
| `src/server.ts` | HTTP service (`Bun.serve`) deployed to icaptcha.gitlawb.com |
| `src/client.ts` | `ICaptchaClient` for TS/JS consumers |
| `src/index.ts` | Public package surface (`@gitlawb/icaptcha`) |

## Guidelines

- **Keep it dependency-light.** The runtime has zero production dependencies;
  please keep it that way unless there's a strong reason.
- **Issuance never hard-fails.** Any external call (e.g. LLM generation) needs a
  timeout and a deterministic fallback so a challenge is always produced.
- **Gradeable by construction.** A generator must produce a canonical answer
  that its own grader accepts, and reject obvious wrong answers. New generators
  implement `{ generate, grade? }` and scale cleanly with `difficulty`.
- **Tests required.** Add or update tests for any change; a new generator needs
  a round-trip test (canonical answer grades true, junk grades false).
- **Match the style.** TypeScript, ESM, `strict` mode, `.ts` import extensions.

## Pull requests

1. Fork and branch from `main`.
2. Make your change with tests; run `bun run check` and `bun run build`.
3. Open a PR using the template. Describe the change, the impact, and how you
   tested it.

## Reporting bugs / requesting features

Use the issue templates. For **security vulnerabilities**, do not open a public
issue — see [SECURITY.md](./SECURITY.md).
