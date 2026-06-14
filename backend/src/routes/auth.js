import { Router } from 'express'
import bcrypt from 'bcrypt'
import { v4 as uuidv4 } from 'uuid'
import db from '../db/index.js'
import { issueSession, lookupSession } from '../lib/session.js'
import { hashToken } from '../lib/crypto.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
const BCRYPT_ROUNDS = 12

router.post('/signup', async (req, res) => {
  const { email, password } = req.body || {}
  if (!email || !password) return res.status(400).json({ error: 'email and password required' })
  if (password.length < 8) return res.status(400).json({ error: 'password must be at least 8 characters' })
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase())
  if (existing) return res.status(409).json({ error: 'email already registered' })
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)
  const userId = uuidv4()
  db.prepare('INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)').run(userId, email.toLowerCase(), passwordHash)
  const token = issueSession(userId)
  res.status(201).json({ token, user: { id: userId, email: email.toLowerCase(), hasAnthropicKey: false, hasElevenLabsKey: false } })
})

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {}
  if (!email || !password) return res.status(400).json({ error: 'email and password required' })
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase())
  if (!user) return res.status(401).json({ error: 'invalid email or password' })
  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) return res.status(401).json({ error: 'invalid email or password' })
  const token = issueSession(user.id)
  res.json({ token, user: { id: user.id, email: user.email, hasAnthropicKey: !!user.anthropic_key_enc, hasElevenLabsKey: !!user.elevenlabs_key_enc } })
})

router.post('/logout', requireAuth, (req, res) => {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token))
  res.json({ ok: true })
})

router.get('/me', requireAuth, (req, res) => {
  res.json({ id: req.user.id, email: req.user.email, hasAnthropicKey: req.user.hasAnthropicKey, hasElevenLabsKey: req.user.hasElevenLabsKey, keysVerifiedAt: req.user.keysVerifiedAt })
})

export default router
