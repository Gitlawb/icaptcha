// Local end-to-end smoke test of the HTTP service.
// Run the server with ICAPTCHA_SECRET=localtest, then: bun scripts/smoke.ts
import { TokenSealer } from '../src/token.ts'

const BASE = process.env.SMOKE_BASE ?? 'http://localhost:8793'
const sealer = new TokenSealer('localtest') // same secret the server runs with

const post = async (path: string, body: unknown) => {
  const r = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  return { status: r.status, json: await r.json() }
}

console.log('health:', await (await fetch(BASE + '/health')).json())

// 1) Full pass: solve correctly by reading the sealed answer (perfect solver).
const ch = await post('/v1/challenge', { requesterId: 'agent-smoke', requiredLevel: 3 })
console.log('\nchallenge:', ch.json.type, `L${ch.json.difficulty}`, '-', ch.json.prompt)
const answer = (await sealer.unseal(ch.json.token)).answer
const ans = await post('/v1/answer', { token: ch.json.token, answer })
console.log('answer(correct):', ans.json.status, 'level=' + ans.json.level)
if (ans.json.status !== 'passed') throw new Error('expected pass')

const vp = await post('/v1/verify-proof', { proof: ans.json.proof })
console.log('verify-proof:', vp.json)
if (!vp.json.valid) throw new Error('proof should be valid')

// 2) Escalation: answer wrong, difficulty must rise.
const ch2 = await post('/v1/challenge', { requesterId: 'agent-dumb', requiredLevel: 2, maxAttempts: 3 })
const wrong = await post('/v1/answer', { token: ch2.json.token, answer: '__nope__' })
console.log(
  '\nanswer(wrong):',
  wrong.json.status,
  `L${ch2.json.difficulty} -> L${wrong.json.challenge?.difficulty}`,
  'attemptsRemaining=' + wrong.json.attemptsRemaining,
)
if (wrong.json.status !== 'continue' || wrong.json.challenge.difficulty <= ch2.json.difficulty) {
  throw new Error('expected escalation')
}

// 3) pubkey
const pk = await (await fetch(BASE + '/v1/pubkey')).json()
console.log('\npubkey kty/crv:', pk.keys[0].kty, pk.keys[0].crv)

console.log('\n✅ smoke passed')
