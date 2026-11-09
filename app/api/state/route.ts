import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { SESSION_COOKIE, readSessionToken, safeDeviceId, statePrefix } from "@/lib/server/auth"
import { listJson, writeJson } from "@/lib/server/blob-store"
import { mergeStates } from "@/lib/merge"
import type { AppState } from "@/lib/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MAX_BYTES = 4 * 1024 * 1024
const MAX_DEVICES = 20

async function currentUserId() {
  const jar = await cookies()
  return readSessionToken(jar.get(SESSION_COOKIE)?.value)?.id ?? null
}

function looksLikeState(value: unknown): value is AppState {
  return Boolean(value) && typeof value === "object" && Array.isArray((value as { sets?: unknown }).sets)
}

export async function GET() {
  const userId = await currentUserId()
  if (!userId) return NextResponse.json({ error: "Не выполнен вход" }, { status: 401 })

  const files = await listJson<AppState>(statePrefix(userId), MAX_DEVICES)
  const states = files.filter(looksLikeState)
  if (!states.length) return NextResponse.json({ state: null })

  const state = states.reduce((merged, next) => mergeStates(merged, next))
  return NextResponse.json({ state, devices: states.length })
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
  if (!looksLikeState(state)) {
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 })
  }

  const device = safeDeviceId(request.headers.get("x-device-id"))
  await writeJson(`${statePrefix(userId)}${device}.json`, state)
  return NextResponse.json({ ok: true, savedAt: Date.now() })
}
