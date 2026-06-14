import { randomBytes } from 'crypto'
import { v4 as uuidv4 } from 'uuid'
import db from '../db/index.js'
import { hashToken } from './crypto.js'

const SESSION_DAYS = 30

export function issueSession(userId) {
  const token = randomBytes(32).toString('hex')
  const tokenHash = hashToken(token)
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400 * 1000).toISOString()
  db.prepare(`INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)`)
    .run(uuidv4(), userId, tokenHash, expiresAt)
  return token
}

export function lookupSession(token) {
  if (!token) return null
  const tokenHash = hashToken(token)
  const session = db.prepare(`
    SELECT s.*, u.id as uid, u.email, u.anthropic_key_enc, u.elevenlabs_key_enc, u.keys_verified_at
    FROM sessions s JOIN users u ON s.user_id = u.id
    WHERE s.token_hash = ? AND s.expires_at > datetime('now')
  `).get(tokenHash)
  if (!session) return null
  // slide expiry
  const newExpiry = new Date(Date.now() + SESSION_DAYS * 86400 * 1000).toISOString()
  db.prepare(`UPDATE sessions SET expires_at = ? WHERE token_hash = ?`).run(newExpiry, tokenHash)
  return session
}
