---
name: Bug report
about: Report incorrect behavior (wrong verdict, API issue, crash)
title: ''
labels: bug
assignees: ''
---

**Describe the bug**
A clear description of what's wrong.

**To reproduce**
The request and what you observed. A `POST /v1/verify` body is ideal:

```json
{ "did": "did:key:...", "action": "create_repo", "context": { } }
```

- Expected verdict:
- Actual verdict / response:

**Environment**

- iCaptcha version / commit:
- Running embedded (`verify()`) or via the service (`/v1/verify`)?
- LLM judge on or off (heuristics-only)?

**Additional context**
Anything else that helps — logs, signals returned, model used.

> Found a **security** issue (verdict evasion, auth bypass, prompt injection)?
> Do not file it here — see [SECURITY.md](../../SECURITY.md).
