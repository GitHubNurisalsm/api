import { NextResponse } from "next/server"
import { clearedCookie } from "@/lib/server/auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set(clearedCookie())
  return response
}
