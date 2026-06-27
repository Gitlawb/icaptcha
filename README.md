# iCaptcha

[![CI](https://github.com/Gitlawb/icaptcha/actions/workflows/ci.yml/badge.svg)](https://github.com/Gitlawb/icaptcha/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@gitlawb/icaptcha.svg)](https://www.npmjs.com/package/@gitlawb/icaptcha)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

**A proof-of-intelligence gate. Service-agnostic.**

A classic CAPTCHA proves "I'm a human, not a bot." iCaptcha proves the opposite:
**"I'm an intelligent agent, not a dumb script."** It issues a freshly-generated
challenge — algebra, a sequence, an anagram, a logic puzzle, a riddle — grades
the answer, and **escalates difficulty on every miss** until the requester
either solves it (→ a signed proof) or burns its attempt budget (→ rejected).

It knows nothing about your domain: no users, repos, or identities beyond an
opaque `requesterId`. Any service can put it in front of any endpoint.

## How it works

```
POST /v1/challenge  (requiredLevel R, maxAttempts M)
      → difficulty D = R; issue a challenge; seal state into a token
POST /v1/answer  (token, answer)
      ├─ correct → PASSED → signed Ed25519 proof(level = D)
      └─ wrong   → D += 1, attempts++          ← failure escalates difficulty
                   ├─ attempts ≥ M → FAILED (deny + cooldown)
                   └─ else → harder challenge at D
```

A reasoning agent converges quickly; naive automation diverges into impossibility
and hits the cap. Difficulty rising on failure is deliberate — it defeats
guess-farming and forces *demonstrated* capability.

### Stateless by design

Challenge state (the answer, difficulty, attempt count, expiry) is sealed into an
**AES-256-GCM token** the client carries between calls — the client can't read or
forge it, and iCaptcha needs no session store, so it scales horizontally.

Passing mints an **Ed25519-signed proof**. The public key is published at
`/v1/pubkey`, so *any* service verifies a proof **offline** without a shared
secret — that's what makes iCaptcha service-agnostic.

### What it does and doesn't stop

This blocks scripted floods absolutely and **imposes real per-identity cost on
LLM-armed abusers** (they must run genuine intelligence per request). It is not
an absolute wall against an attacker who wires up their own model — so keep hard
**resource quotas / rate-limits in the consuming service**. iCaptcha is the
intelligence gate; your service keeps the ceiling.

## HTTP API

Deployed at **`https://icaptcha.gitlawb.com`**.

### `POST /v1/challenge`
```jsonc
// request (all optional)
{ "requesterId": "agent-7", "requiredLevel": 3, "maxAttempts": 4, "types": ["algebra","logic"] }
// response
{ "challengeId": "…", "type": "algebra", "difficulty": 3,
  "prompt": "Solve for x: 3x + 4 = 19", "expiresAt": "…",
  "attemptsRemaining": 4, "token": "…" }
```

### `POST /v1/answer`
```jsonc
{ "token": "…", "answer": "5" }
// → passed:   { "status": "passed", "level": 3, "proof": "…" }
// → continue: { "status": "continue", "challenge": { … harder … }, "attemptsRemaining": 3 }
// → failed:   { "status": "failed", "reason": "attempt budget exhausted" }
```

### `POST /v1/verify-proof` · `GET /v1/pubkey`
Verify a proof (`{ valid, claims }`), or fetch the Ed25519 public JWK to verify
offline. Plus `GET /health` and `GET /metrics`.

## Challenge types

| Type | Grading | Notes |
| --- | --- | --- |
| `arithmetic` | exact | additive chains; magnitude grows with level |
| `algebra` | exact | linear → systems → factored; always integer x |
| `sequence` | exact | arithmetic/geometric/squares/fibonacci/alternating |
| `anagram` | exact | unscramble a word; length grows with level |
| `logic` | exact | transitive syllogisms + ordering puzzles |
| `wordproblem`, `riddle` | LLM-graded | generated via opengateway at higher levels |

Deterministic types grade exactly and need no network. The LLM types add fresh,
reasoning-heavy variety and only appear at/above `ICAPTCHA_LLM_MIN_LEVEL`.

## Use it from TypeScript — `@gitlawb/icaptcha`

```ts
import { ICaptchaClient } from '@gitlawb/icaptcha'

const icaptcha = new ICaptchaClient({ baseUrl: 'https://icaptcha.gitlawb.com' })

// Drive a whole session with your own solver (e.g. your LLM):
const { passed, proof } = await icaptcha.solve(
  { requesterId: agentId, requiredLevel: 4 },
  async (challenge) => myAgentSolves(challenge.prompt),
)
if (passed) accept(proof)
```

Or run the gate in-process:

```ts
import { Engine, loadConfig } from '@gitlawb/icaptcha'
const engine = new Engine(loadConfig())
const challenge = await engine.issueChallenge({ requiredLevel: 3 })
const result = await engine.submitAnswer(challenge.token, answer)
```

## Use it from the gitlawb node (Rust / any language)

Plain HTTP: `POST /v1/challenge`, `POST /v1/answer`, then attach the returned
proof to the protected request and verify it (signature + level + freshness)
using the key from `/v1/pubkey`.

## Configuration

| Env | Default | Purpose |
| --- | --- | --- |
| `PORT` | `8080` | Listen port |
| `ICAPTCHA_SECRET` | — | **Required in prod.** Key for sealing challenge tokens (shared across instances) |
| `ICAPTCHA_SIGNING_KEY` | — | **Required in prod.** Ed25519 private key (base64 PKCS8) for signing proofs |
| `ICAPTCHA_API_KEYS` | — | Comma-separated caller keys. Unset ⇒ open |
| `ICAPTCHA_REQUIRED_LEVEL` | `3` | Default floor level to pass |
| `ICAPTCHA_MAX_ATTEMPTS` | `4` | Default attempt budget |
| `ICAPTCHA_MAX_LEVEL` | `10` | Difficulty ceiling |
| `ICAPTCHA_DIFFICULTY_STEP` | `1` | Level increase per failed attempt |
| `ICAPTCHA_CHALLENGE_TTL_SECONDS` | `120` | Challenge token lifetime |
| `ICAPTCHA_PROOF_TTL_SECONDS` | `300` | Proof token lifetime |
| `ICAPTCHA_TYPES` | all | Comma-separated enabled challenge types |
| `ICAPTCHA_LLM_MIN_LEVEL` | `5` | Min level for LLM-backed types |
| `OPENGATEWAY_URL` / `OPENGATEWAY_API_KEY` | gateway / — | LLM gateway for `wordproblem`/`riddle`. Unset ⇒ deterministic only |
| `ICAPTCHA_MODEL` | `auto` | Gateway model (`auto` = smart routing) |

Generate keys:

```bash
# sealing secret
openssl rand -base64 32
# Ed25519 signing key (base64 PKCS8 DER)
bun -e 'import {generateSigningKey} from "@gitlawb/icaptcha"; console.log(generateSigningKey())'
```

## Develop

```bash
bun install
bun test
bun run check          # type-check + tests
bun run dev            # serve on :8080
bun scripts/smoke.ts   # end-to-end loop against a local server
```

## Deploy

```bash
fly secrets set --stage ICAPTCHA_SECRET="$(openssl rand -base64 32)"
fly secrets set --stage ICAPTCHA_SIGNING_KEY="$(bun -e 'import {generateSigningKey} from "./src/proof.ts"; console.log(generateSigningKey())')"
fly deploy
fly secrets set OPENGATEWAY_API_KEY=…   # optional: enable LLM challenge types
```

> Both `ICAPTCHA_SECRET` and `ICAPTCHA_SIGNING_KEY` **must** be set (and shared
> across instances) in any multi-machine deployment, or a token sealed by one
> machine won't open on another.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) and the [Code of Conduct](./CODE_OF_CONDUCT.md).

## Security

iCaptcha is a security control — report vulnerabilities privately per
[SECURITY.md](./SECURITY.md). Do not open a public issue.

## License

[MIT](./LICENSE) © Gitlawb
