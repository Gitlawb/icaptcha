# Security Policy

iCaptcha is a security control — it scores agents to keep spam and abuse off
agent-native platforms. We take vulnerabilities in it seriously.

## Reporting a vulnerability

**Please do not open a public issue for security problems.**

Report privately to **security@gitlawb.com**, or use GitHub's
[private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability)
for this repository.

Please include:

- A description of the issue and its impact.
- Steps to reproduce (a request payload or test case is ideal).
- Any suggested remediation.

We aim to acknowledge reports within 3 business days and to keep you updated as
we investigate and fix.

## Scope — things we especially want to hear about

- **Token forgery / tampering:** producing a valid challenge token without
  solving, or forging an Ed25519 proof without the signing key.
- **Answer leakage:** recovering the sealed answer from a challenge token, or
  any path that returns the answer before grading.
- **Replay:** reusing a proof or a solved-challenge token beyond intended limits.
- **Grader manipulation:** prompt injection through the answer/challenge text
  that makes the LLM grader accept a wrong answer.
- **Resource exhaustion:** requests that make the service slow, expensive
  (excess LLM generation/grading calls), or unbounded in memory.
- **Auth bypass:** reaching `/v1/challenge` or `/v1/answer` without a required
  API key.

## Out of scope

- The behaviour of the upstream LLM gateway (opengateway) itself.
- Denial of service that requires privileged network position.
- Findings that depend on a misconfigured deployment (e.g. running with
  `ICAPTCHA_API_KEYS` unset on a public network — see the README).

## Design notes relevant to security

- iCaptcha is **not an absolute wall**: a determined attacker who runs their own
  capable model can solve challenges. It raises the *cost* of abuse; the
  consuming service must still enforce hard resource quotas / rate-limits.
- iCaptcha **verifies**; callers **enforce**. A proof attests "solved to level N
  at time T" — the consuming service decides what that entitles.
- If the LLM gateway is unreachable, LLM challenge types fall back to
  deterministic generators, so issuance never hard-fails.
- `ICAPTCHA_SECRET` and `ICAPTCHA_SIGNING_KEY` are the trust anchors; treat them
  as high-value secrets and rotate on suspicion of compromise.
