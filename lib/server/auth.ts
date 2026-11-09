import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto"

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 365
export const SESSION_COOKIE = "qm_session"

function secret() {
  const value = process.env.AUTH_SECRET
  if (!value) throw new Error("AUTH_SECRET is not configured")
  return value
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url")
}

/**
 * Blob paths are derived with a keyed hash, so a stored record cannot be
 * located by anyone who only knows the user name.
 */
export function blobPath(kind: "user" | "state", key: string) {
  const digest = createHmac("sha256", secret()).update(`${kind}:${key}`).digest("hex")
  return `${kind === "user" ? "u" : "s"}/${digest}.json`
}

/**
 * Each device writes its own file under the account's folder.
 *
 * Blob reads are eventually consistent — a write can take seconds to become
 * visible — so a single shared file would let one device overwrite another's
 * work after a stale read. With one writer per file that cannot happen:
 * a stale read only delays when the other device's work shows up, and the
 * server merges every file on the way out.
 */
export function statePrefix(userId: string) {
  return `s/${createHmac("sha256", secret()).update(`state:${userId}`).digest("hex")}/`
}

const DEVICE_RULE = /^[a-zA-Z0-9_-]{6,64}$/

export function safeDeviceId(value: unknown) {
  return typeof value === "string" && DEVICE_RULE.test(value) ? value : "default"
}

export function hashPassword(password: string, salt = randomBytes(16).toString("hex")) {
  return { salt, hash: scryptSync(password, salt, 64).toString("hex") }
}

export function verifyPassword(password: string, salt: string, hash: string) {
  const expected = Buffer.from(hash, "hex")
  const actual = scryptSync(password, salt, expected.length)
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

export type Session = { id: string; username: string; displayName: string }

export function createSessionToken(session: Session) {
  const body = Buffer.from(JSON.stringify(session)).toString("base64url")
  const payload = `${body}.${Date.now() + SESSION_TTL_MS}`
  return `${payload}.${sign(payload)}`
}

export function readSessionToken(token: string | undefined): Session | null {
  if (!token) return null
  const parts = token.split(".")
  if (parts.length !== 3) return null
  const [body, expiry, signature] = parts
  const expected = sign(`${body}.${expiry}`)
  if (expected.length !== signature.length) return null
  if (!timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return null
  if (!Number(expiry) || Number(expiry) < Date.now()) return null
  try {
    const session = JSON.parse(Buffer.from(body, "base64url").toString()) as Session
    return session?.id ? session : null
  } catch {
    return null
  }
}

export const sessionCookie = (token: string) => ({
  name: SESSION_COOKIE,
  value: token,
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: Math.floor(SESSION_TTL_MS / 1000),
})

export const clearedCookie = () => ({ ...sessionCookie(""), maxAge: 0 })

/* ---------- validation ---------- */

export const USERNAME_RULE = /^[a-zA-Z0-9._-]{3,32}$/

export function normalizeUsername(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : ""
}

export function validateCredentials(username: string, password: unknown): string | null {
  if (!USERNAME_RULE.test(username)) {
    return "Имя: 3–32 символа, латиница, цифры, точка, дефис или подчёркивание"
  }
  if (typeof password !== "string" || password.length < 6) {
    return "Пароль должен быть не короче 6 символов"
  }
  if (password.length > 200) return "Слишком длинный пароль"
  return null
}
