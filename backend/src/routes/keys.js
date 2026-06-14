import { Router } from 'express'
import db from '../db/index.js'
import { encryptKey } from '../lib/crypto.js'
import { requireAuth } from '../middleware/auth.js'
import Anthropic from '@anthropic-ai/sdk'

const router = Router()
router.use(requireAuth)

router.post('/', (req, res) => {
  const { anthropicKey, elevenlabsKey } = req.body || {}
  if (anthropicKey !== undefined) {
    const enc = anthropicKey ? encryptKey(anthropicKey) : null
    db.prepare('UPDATE users SET anthropic_key_enc = ?, keys_verified_at = NULL WHERE id = ?').run(enc, req.user.id)
  }
  if (elevenlabsKey !== undefined) {
    const enc = elevenlabsKey ? encryptKey(elevenlabsKey) : null
    db.prepare('UPDATE users SET elevenlabs_key_enc = ?, keys_verified_at = NULL WHERE id = ?').run(enc, req.user.id)
  }
  res.json({ ok: true })
})

router.get('/status', (req, res) => {
  res.json({ anthropic: req.user.hasAnthropicKey, elevenlabs: req.user.hasElevenlabsKey, verifiedAt: req.user.keysVerifiedAt })
})

router.post('/verify', async (req, res) => {
  const result = { anthropic: 'unknown', elevenlabs: 'unknown' }
  // Test Anthropic
  if (req.user.anthropicKey) {
    try {
      const client = new Anthropic({ apiKey: req.user.anthropicKey })
      await client.messages.create({ model: 'claude-haiku-4-5-20251001', max_tokens: 1, messages: [{ role: 'user', content: 'hi' }] })
      result.anthropic = 'valid'
    } catch (e) {
      result.anthropic = e.status === 401 ? 'invalid' : 'error'
    }
  } else {
    result.anthropic = 'not_set'
  }
  // Test ElevenLabs
  if (req.user.elevenlabsKey) {
    try {
      const r = await fetch('https://api.elevenlabs.io/v1/voices', { headers: { 'xi-api-key': req.user.elevenlabsKey } })
      result.elevenlabs = r.ok ? 'valid' : 'invalid'
    } catch {
      result.elevenlabs = 'error'
    }
  } else {
    result.elevenlabs = 'not_set'
  }
  if (result.anthropic === 'valid' || result.elevenlabs === 'valid') {
    db.prepare('UPDATE users SET keys_verified_at = datetime("now") WHERE id = ?').run(req.user.id)
  }
  res.json(result)
})

export default router
