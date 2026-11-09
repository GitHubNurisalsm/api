import { NextResponse } from "next/server"
import { blobPath, createSessionToken, normalizeUsername, sessionCookie, verifyPassword } from "@/lib/server/auth"
import { readJson, type UserRecord } from "@/lib/server/blob-store"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  let body: { username?: unknown; password?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 })
  }

  const username = normalizeUsername(body.username)
  const password = typeof body.password === "string" ? body.password : ""
  if (!username || !password) {
    return NextResponse.json({ error: "Введите имя и пароль" }, { status: 400 })
  }

  const user = await readJson<UserRecord>(blobPath("user", username))
  // Same message either way, so the form never reveals which names exist.
  if (!user || !verifyPassword(password, user.salt, user.hash)) {
    return NextResponse.json({ error: "Неверное имя или пароль" }, { status: 401 })
  }

  const response = NextResponse.json({ user: { username: user.username, displayName: user.displayName } })
  response.cookies.set(sessionCookie(createSessionToken({ id: user.id, username: user.username, displayName: user.displayName })))
  return response
}
