import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { SESSION_COOKIE, blobPath, readSessionToken } from "@/lib/server/auth"
import { readJson, writeJson } from "@/lib/server/blob-store"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MAX_BYTES = 4 * 1024 * 1024

async function currentUserId() {
  const jar = await cookies()
  return readSessionToken(jar.get(SESSION_COOKIE)?.value)?.id ?? null
}

export async function GET() {
  const userId = await currentUserId()
  if (!userId) return NextResponse.json({ error: "Не выполнен вход" }, { status: 401 })
  const state = await readJson(blobPath("state", userId))
  return NextResponse.json({ state })
}

export async function PUT(request: Request) {
  const userId = await currentUserId()
  if (!userId) return NextResponse.json({ error: "Не выполнен вход" }, { status: 401 })

  const raw = await request.text()
  if (raw.length > MAX_BYTES) {
    return NextResponse.json({ error: "Библиотека слишком велика для синхронизации" }, { status: 413 })
  }

  let state: unknown
  try {
    state = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 })
  }
  if (!state || typeof state !== "object" || !Array.isArray((state as { sets?: unknown }).sets)) {
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 })
  }

  await writeJson(blobPath("state", userId), state)
  return NextResponse.json({ ok: true, savedAt: Date.now() })
}
