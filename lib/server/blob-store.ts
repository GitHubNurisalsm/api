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

/** Every device file stored under one account, newest first. */
export async function listJson<T>(prefix: string, limit = 20): Promise<T[]> {
  const found = await list({ prefix, limit })
  const blobs = found.blobs.sort((a, b) => Number(new Date(b.uploadedAt)) - Number(new Date(a.uploadedAt)))
  const results = await Promise.all(
    blobs.map(async (blob): Promise<T | null> => {
      try {
        const response = await fetch(`${blob.url}?t=${Date.now()}`, { cache: "no-store" })
        if (!response.ok) return null
        return (await response.json()) as T
      } catch {
        return null
      }
    }),
  )
  return results.filter((item): item is Awaited<T> => item !== null) as T[]
}

export type UserRecord = {
  id: string
  username: string
  displayName: string
  salt: string
  hash: string
  createdAt: number
}
