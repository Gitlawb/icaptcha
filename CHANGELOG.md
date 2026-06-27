# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0]

### Changed — BREAKING

iCaptcha is redesigned from a behavioral spam classifier into a **service-agnostic
proof-of-intelligence gate**. Instead of scoring a caller's behavior, it now
issues an active challenge the requester must solve, escalating difficulty on
failure. The `POST /v1/verify` behavioral endpoint and all domain-specific
(repo/DID) context are removed.

### Added

- **Challenge/answer flow:** `POST /v1/challenge` → `POST /v1/answer`
  (`passed` | `continue` at higher difficulty | `failed`).
- **Challenge generators:** `arithmetic`, `algebra`, `sequence`, `anagram`,
  `logic` (deterministic, exact-graded) + `wordproblem`, `riddle` (LLM-generated
  via opengateway, higher levels only).
- **Difficulty laddering:** every wrong answer raises the level and spends an
  attempt; exhausting the budget fails the session.
- **Stateless sealed tokens:** challenge state is AES-256-GCM sealed into the
  token the client carries — no server-side session store.
- **Ed25519 proofs:** passing mints a signed proof; `GET /v1/pubkey` publishes
  the public JWK for offline verification; `POST /v1/verify-proof` verifies.
- **Client SDK:** `ICaptchaClient.solve(opts, solver)` drives a full session.

### Removed

- Behavioral heuristics, the LLM "judge", and the `verify`/`VerdictCache` API.

## [0.1.0]

Initial release.

### Added

- Two-layer agent verification:
  - **Layer 1 heuristics** (synchronous, no network): sequential counter-name
    detection, repos-per-DID, creation burst, young-DID-bulk, and trust
    dampening.
  - **Layer 2 LLM judge** via [opengateway](https://opengateway.gitlawb.com),
    risk-gated to the uncertain band and fail-open on any error.
- `POST /v1/verify` returning `allow | throttle | deny` with an explainable
  `score`, `reason`, and `signals`; per-DID verdict cache.
- `GET /health` and `GET /metrics` (Prometheus).
- `@gitlawb/icaptcha` package: `ICaptchaClient` (remote), `verify()` (embedded),
  and the full type surface.
- HTTP service (`Bun.serve`) with optional bearer-key auth and a `Dockerfile` /
  `fly.toml` for deployment to icaptcha.gitlawb.com.

[Unreleased]: https://github.com/Gitlawb/icaptcha/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/Gitlawb/icaptcha/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Gitlawb/icaptcha/releases/tag/v0.1.0
