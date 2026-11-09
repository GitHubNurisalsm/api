import type { AppState, CardProgress, SetProgress, StudySet } from "./types"
import { DEFAULT_SETTINGS } from "./types"
import { emptyProgress } from "./srs"

const TOMBSTONE_TTL = 1000 * 60 * 60 * 24 * 180

function newerSet(a: StudySet, b: StudySet) {
  return (a.updatedAt ?? 0) >= (b.updatedAt ?? 0) ? a : b
}

function newerCard(a: CardProgress, b: CardProgress) {
  if (a.lastSeen !== b.lastSeen) return a.lastSeen > b.lastSeen ? a : b
  return a.box >= b.box ? a : b
}

function mergeSetProgress(a: SetProgress | undefined, b: SetProgress | undefined): SetProgress {
  if (!a) return b ?? emptyProgress()
  if (!b) return a
  const cards: Record<string, CardProgress> = { ...a.cards }
  for (const [id, card] of Object.entries(b.cards ?? {})) {
    cards[id] = cards[id] ? newerCard(cards[id], card) : card
  }
  const history = [...(a.testHistory ?? []), ...(b.testHistory ?? [])]
  const seen = new Set<string>()
  const testHistory = history
    .filter((entry) => {
      const key = `${entry.date}:${entry.score}:${entry.total}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((x, y) => y.date - x.date)
    .slice(0, 25)

  const bestTimes = [a.bestMatchTime, b.bestMatchTime].filter((value): value is number => typeof value === "number")
  return {
    cards,
    rounds: Math.max(a.rounds ?? 0, b.rounds ?? 0),
    lastStudied: Math.max(a.lastStudied ?? 0, b.lastStudied ?? 0),
    bestMatchTime: bestTimes.length ? Math.min(...bestTimes) : null,
    testHistory,
  }
}

/**
 * Combines this device's state with the one stored for the account.
 *
 * Nothing is thrown away: sets and folders are unioned, the newer copy wins
 * per item, progress keeps the more advanced card, and deletions are honoured
 * through tombstones so a removed set does not come back from another device.
 */
export function mergeStates(local: AppState, remote: AppState): AppState {
  const cutoff = Date.now() - TOMBSTONE_TTL
  const deleted: Record<string, number> = {}
  for (const source of [local.deleted ?? {}, remote.deleted ?? {}]) {
    for (const [id, at] of Object.entries(source)) {
      if (at >= cutoff) deleted[id] = Math.max(deleted[id] ?? 0, at)
    }
  }

  const sets = new Map<string, StudySet>()
  for (const set of local.sets ?? []) sets.set(set.id, set)
  for (const set of remote.sets ?? []) {
    const mine = sets.get(set.id)
    sets.set(set.id, mine ? newerSet(mine, set) : set)
  }
  for (const [id, at] of Object.entries(deleted)) {
    const set = sets.get(id)
    if (set && (set.updatedAt ?? 0) <= at) sets.delete(id)
  }

  const folders = new Map((local.folders ?? []).map((folder) => [folder.id, folder]))
  for (const folder of remote.folders ?? []) if (!folders.has(folder.id)) folders.set(folder.id, folder)
  for (const id of Object.keys(deleted)) folders.delete(id)

  const progress: Record<string, SetProgress> = {}
  const setIds = new Set([...Object.keys(local.progress ?? {}), ...Object.keys(remote.progress ?? {})])
  for (const id of setIds) {
    if (!sets.has(id)) continue
    progress[id] = mergeSetProgress(local.progress?.[id], remote.progress?.[id])
  }

  const studyDays = Array.from(new Set([...(local.stats?.studyDays ?? []), ...(remote.stats?.studyDays ?? [])])).sort()
  const recent = [...(local.recent ?? []), ...(remote.recent ?? [])]
    .filter((id, index, all) => sets.has(id) && all.indexOf(id) === index)
    .slice(0, 12)

  return {
    version: 1,
    deleted,
    sets: Array.from(sets.values()).sort((a, b) => b.updatedAt - a.updatedAt),
    folders: Array.from(folders.values()),
    progress,
    recent,
    // Settings stay a per-device preference; the local ones win.
    settings: { ...DEFAULT_SETTINGS, ...(remote.settings ?? {}), ...(local.settings ?? {}) },
    stats: {
      studyDays,
      cardsStudied: Math.max(local.stats?.cardsStudied ?? 0, remote.stats?.cardsStudied ?? 0),
      sessions: Math.max(local.stats?.sessions ?? 0, remote.stats?.sessions ?? 0),
    },
    profile: local.profile ?? remote.profile,
  }
}
