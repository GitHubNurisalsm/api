import type { AppState, StudySet, Term } from "./types"
import { cardOf, emptyProgress } from "./srs"

/**
 * Leitner intervals in days. A card answered correctly moves up a box and is
 * not shown again until its interval has passed — the spacing effect is what
 * moves words into long-term memory.
 */
export const BOX_INTERVAL_DAYS = [0, 1, 2, 4, 8, 21]

/**
 * Minutes to wait before a card comes back. A card you just got wrong drops to
 * box 0 and returns after a short relearning gap rather than instantly, so the
 * review queue can actually reach zero.
 */
const BOX_INTERVAL_MINUTES = [10, 1440, 2880, 5760, 11520, 30240]

const DAY = 86_400_000
const MINUTE = 60_000

export type DueCard = { set: StudySet; term: Term; box: number; dueAt: number }

export function dueAtFor(lastSeen: number, box: number) {
  if (!lastSeen) return 0
  const minutes = BOX_INTERVAL_MINUTES[Math.min(Math.max(0, box), BOX_INTERVAL_MINUTES.length - 1)]
  return lastSeen + minutes * MINUTE
}

/** Cards that have been studied before and whose interval has elapsed. */
export function collectDue(state: AppState, now = Date.now()): DueCard[] {
  const out: DueCard[] = []
  for (const set of state.sets) {
    const progress = state.progress[set.id] ?? emptyProgress()
    for (const term of set.terms) {
      const card = cardOf(progress, term.id)
      if (!card.lastSeen) continue
      const dueAt = dueAtFor(card.lastSeen, card.box)
      if (dueAt <= now) out.push({ set, term, box: card.box, dueAt })
    }
  }
  // The most overdue first: those are closest to being forgotten.
  return out.sort((a, b) => a.dueAt - b.dueAt)
}

/** Cards never answered yet, oldest set first. */
export function collectFresh(state: AppState): DueCard[] {
  const out: DueCard[] = []
  for (const set of state.sets) {
    const progress = state.progress[set.id] ?? emptyProgress()
    for (const term of set.terms) {
      const card = cardOf(progress, term.id)
      if (card.lastSeen) continue
      out.push({ set, term, box: 0, dueAt: 0 })
    }
  }
  return out
}

/** When the next card becomes due, or null when nothing is scheduled. */
export function nextDueAt(state: AppState, now = Date.now()): number | null {
  let soonest: number | null = null
  for (const set of state.sets) {
    const progress = state.progress[set.id] ?? emptyProgress()
    for (const term of set.terms) {
      const card = cardOf(progress, term.id)
      if (!card.lastSeen) continue
      const dueAt = dueAtFor(card.lastSeen, card.box)
      if (dueAt > now && (soonest === null || dueAt < soonest)) soonest = dueAt
    }
  }
  return soonest
}

export function formatDueIn(timestamp: number, now = Date.now()) {
  const diff = Math.max(0, timestamp - now)
  const minutes = Math.round(diff / MINUTE)
  if (minutes < 60) return `${Math.max(1, minutes)} мин`
  const hours = Math.round(diff / 3_600_000)
  if (hours < 24) return `${hours} ч`
  const days = Math.round(diff / DAY)
  return `${days} дн.`
}

/* ---------- German article drill ---------- */

export type ArticleCard = { setId: string; term: Term; article: "der" | "die" | "das"; noun: string }

const ARTICLE_RULE = /^(der|die|das)\s+(.+)$/i

/** Every noun in the library that carries a definite article. */
export function collectArticleCards(state: AppState): ArticleCard[] {
  const out: ArticleCard[] = []
  const seen = new Set<string>()
  for (const set of state.sets) {
    for (const term of set.terms) {
      const match = ARTICLE_RULE.exec(term.term.trim())
      if (!match) continue
      const article = match[1].toLowerCase() as "der" | "die" | "das"
      const noun = match[2].trim()
      const key = `${article}|${noun.toLowerCase()}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push({ setId: set.id, term, article, noun })
    }
  }
  return out
}

export const ARTICLE_COLORS: Record<"der" | "die" | "das", string> = {
  der: "#2563eb",
  die: "#e11d48",
  das: "#16a34a",
}
