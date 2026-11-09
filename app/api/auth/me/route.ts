import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { SESSION_COOKIE, readSessionToken } from "@/lib/server/auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const jar = await cookies()
  const session = readSessionToken(jar.get(SESSION_COOKIE)?.value)
  if (!session) return NextResponse.json({ user: null })
  return NextResponse.json({ user: { username: session.username, displayName: session.displayName } })
}
