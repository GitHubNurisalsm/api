import { NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { blobPath, createSessionToken, hashPassword, normalizeUsername, sessionCookie, validateCredentials } from "@/lib/server/auth"
import { readJson, writeJson, type UserRecord } from "@/lib/server/blob-store"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  let body: { username?: unknown; password?: unknown; displayName?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 })
  }

  const username = normalizeUsername(body.username)
  const problem = validateCredentials(username, body.password)
  if (problem) return NextResponse.json({ error: problem }, { status: 400 })

  const path = blobPath("user", username)
  const existing = await readJson<UserRecord>(path)
  if (existing) {
    return NextResponse.json({ error: "Это имя уже занято" }, { status: 409 })
  }

  const { salt, hash } = hashPassword(body.password as string)
  const user: UserRecord = {
    id: randomUUID(),
    username,
    displayName: typeof body.displayName === "string" && body.displayName.trim() ? body.displayName.trim().slice(0, 60) : username,
    salt,
    hash,
    createdAt: Date.now(),
  }
  await writeJson(path, user)

  const response = NextResponse.json({ user: { username: user.username, displayName: user.displayName } })
  response.cookies.set(sessionCookie(createSessionToken({ id: user.id, username: user.username, displayName: user.displayName })))
  return response
}
