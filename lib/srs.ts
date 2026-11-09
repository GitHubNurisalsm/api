import type { CardProgress, CardStatus, SetProgress, StudySet, Term } from "./types"

export const MAX_BOX = 5

export function emptyCard(): CardProgress {
  return { box: 0, correct: 0, incorrect: 0, streak: 0, lastSeen: 0, status: "new" }
}

export function emptyProgress(): SetProgress {
  return { cards: {}, rounds: 0, lastStudied: 0, bestMatchTime: null, testHistory: [] }
}

export function statusForBox(box: number): CardStatus {
  if (box <= 0) return "new"
  if (box === 1) return "learning"
  if (box < MAX_BOX) return "familiar"
  return "mastered"
}

export function applyAnswer(card: CardProgress, correct: boolean): CardProgress {
  const next: CardProgress = { ...card }
  next.lastSeen = Date.now()
  if (correct) {
    next.correct += 1
    next.streak += 1
    next.box = Math.min(MAX_BOX, next.box + 1)
  } else {
    next.incorrect += 1
    next.streak = 0
    next.box = Math.max(0, next.box - 1)
  }
  next.status = statusForBox(next.box)
  return next
}

export function cardOf(progress: SetProgress | undefined, termId: string): CardProgress {
  return progress?.cards?.[termId] ?? emptyCard()
}

export type Mastery = {
  mastered: number
  familiar: number
  learning: number
  notStudied: number
  total: number
  percent: number
}

export function masteryFor(set: StudySet, progress?: SetProgress): Mastery {
  let mastered = 0
  let familiar = 0
  let learning = 0
  let notStudied = 0
  for (const term of set.terms) {
    const card = cardOf(progress, term.id)
    if (card.status === "mastered") mastered += 1
    else if (card.status === "familiar") familiar += 1
    else if (card.status === "learning") learning += 1
    else notStudied += 1
  }
  const total = set.terms.length
  const score = total === 0 ? 0 : (mastered * 1 + familiar * 0.6 + learning * 0.25) / total
  return { mastered, familiar, learning, notStudied, total, percent: Math.round(score * 100) }
}

/**
 * Builds the queue for a Learn round: weakest cards first, mastered cards
 * appear rarely. Mirrors Quizlet's "Learn" rounds of up to 7 cards.
 */
export function buildLearnRound(terms: Term[], progress: SetProgress | undefined, roundSize = 7): Term[] {
  const weighted = terms.map((term) => {
    const card = cardOf(progress, term.id)
    const base = card.status === "new" ? 0 : card.box * 10
    const penalty = card.incorrect * -3
    const recency = card.lastSeen ? Math.min(5, (Date.now() - card.lastSeen) / 3_600_000) * -1 : -5
    return { term, weight: base + penalty + recency + Math.random() * 2 }
  })
  weighted.sort((a, b) => a.weight - b.weight)
  return weighted.slice(0, Math.min(roundSize, terms.length)).map((entry) => entry.term)
}

export function isRoundMastered(terms: Term[], progress: SetProgress | undefined) {
  return terms.every((term) => cardOf(progress, term.id).box >= MAX_BOX)
}

export function dayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

export function streakFromDays(days: string[]) {
  if (!days.length) return 0
  const unique = Array.from(new Set(days)).sort().reverse()
  const today = dayKey()
  const yesterday = dayKey(new Date(Date.now() - 86_400_000))
  if (unique[0] !== today && unique[0] !== yesterday) return 0
  let streak = 0
  let cursor = new Date(unique[0] + "T00:00:00")
  for (const day of unique) {
    if (day === dayKey(cursor)) {
      streak += 1
      cursor = new Date(cursor.getTime() - 86_400_000)
    } else {
      break
    }
  }
  return streak
}
