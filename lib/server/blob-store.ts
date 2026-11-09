import { list, put } from "@vercel/blob"

/**
 * Blob is served through a CDN, so every write disables caching and every
 * read busts it. Sync still merges rather than overwrites, so a stale read
 * can never destroy newer progress.
 */
export async function writeJson(pathname: string, data: unknown) {
  await put(pathname, JSON.stringify(data), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: 0,
  })
}

export async function readJson<T>(pathname: string): Promise<T | null> {
  const found = await list({ prefix: pathname, limit: 1 })
  const blob = found.blobs.find((item) => item.pathname === pathname)
  if (!blob) return null
  const response = await fetch(`${blob.url}?t=${Date.now()}`, { cache: "no-store" })
  if (!response.ok) return null
  try {
    return (await response.json()) as T
  } catch {
    return null
  }
}

export type UserRecord = {
  id: string
  username: string
  displayName: string
  salt: string
  hash: string
  createdAt: number
}
