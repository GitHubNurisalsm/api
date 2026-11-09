/** Punctuation and placeholder marks that never change the meaning of an answer. */
const PUNCT = /[.,/#!$%^&*;:{}=\-_`~()[\]"'?¿¡«»„“”’‘‚…–—·|]/g

export function stripAccents(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "")
}

export function normalizeAnswer(value: string, accentInsensitive = true) {
  let out = value.toLowerCase().trim()
  out = out.replace(/\s+/g, " ")
  out = out.replace(PUNCT, "")
  out = out.replace(/\s+/g, " ").trim()
  out = out.replace(/^(a|an|the|el|la|los|las|le|la|les|der|die|das|to)\s+/i, "")
  if (accentInsensitive) out = stripAccents(out)
  return out
}

/**
 * Damerau-Levenshtein distance (optimal string alignment).
 * Swapping two neighbouring letters — the most common typing slip —
 * costs one edit, not two.
 */
export function editDistance(a: string, b: string) {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  let beforePrev = new Array<number>(b.length + 1).fill(0)
  let prev = new Array<number>(b.length + 1)
  let curr = new Array<number>(b.length + 1)
  for (let j = 0; j <= b.length; j++) prev[j] = j
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      let best = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        best = Math.min(best, beforePrev[j - 2] + 1)
      }
      curr[j] = best
    }
    const recycled = beforePrev
    beforePrev = prev
    prev = curr
    curr = recycled
  }
  return prev[b.length]
}

export type GradeResult = "correct" | "typo" | "wrong"

/** Splits an answer into the alternatives it offers: "a / b", "a, b", "a или b". */
const ALT_SPLIT = /[,;/]|\sили\s|\sor\s/gi

/** Text in brackets is an optional hint, never part of the answer. */
function stripHints(value: string) {
  return value.replace(/\([^)]*\)/g, " ")
}

/**
 * Every spelling that counts as the right answer:
 * the full text, the full text without bracketed hints,
 * and each alternative on its own.
 */
function expectedVariants(expected: string, accentInsensitive: boolean) {
  const variants = new Set<string>()
  const push = (raw: string) => {
    const normalized = normalizeAnswer(raw, accentInsensitive)
    if (normalized) variants.add(normalized)
  }
  push(expected)
  push(stripHints(expected))
  for (const part of expected.split(ALT_SPLIT)) {
    push(part)
    push(stripHints(part))
  }
  return Array.from(variants)
}

/** Canonical key of a multi-part answer, so the order of alternatives does not matter. */
function partsKey(value: string, accentInsensitive: boolean) {
  const parts = value
    .split(ALT_SPLIT)
    .map((part) => normalizeAnswer(stripHints(part), accentInsensitive))
    .filter(Boolean)
  return parts.length > 1 ? parts.slice().sort().join("|") : ""
}

/**
 * Grades a typed answer.
 *
 * Counts as correct: the whole answer as written, any single alternative,
 * the alternatives in any order, and the answer without bracketed hints.
 * Counts as a typo: one or two characters away from any of those.
 */
export function gradeAnswer(input: string, expected: string, accentInsensitive = true): GradeResult {
  const given = normalizeAnswer(input, accentInsensitive)
  if (!given) return "wrong"

  const variants = expectedVariants(expected, accentInsensitive)
  if (!variants.length) return "wrong"
  if (variants.includes(given)) return "correct"

  const expectedKey = partsKey(expected, accentInsensitive)
  if (expectedKey && partsKey(input, accentInsensitive) === expectedKey) return "correct"

  for (const variant of variants) {
    const tolerance = variant.length <= 4 ? 0 : variant.length <= 8 ? 1 : 2
    if (tolerance > 0 && editDistance(given, variant) <= tolerance) return "typo"
  }
  return "wrong"
}

/** Short note shown under the input so the expected format is never a guessing game. */
export function answerHint(expected: string): string | null {
  const alternatives = expected.split(ALT_SPLIT).filter((part) => part.trim()).length
  if (alternatives > 1) return "Достаточно одного варианта — писать все через « / » не обязательно"
  if (/\([^)]*\)/.test(expected)) return "Текст в скобках можно не писать"
  if (/[…]|\.\.\./.test(expected)) return "Многоточие в конце писать не нужно"
  return null
}

export type ParsedPair = { term: string; definition: string }

export function parseBulkImport(raw: string, rowSep: "newline" | "semicolon", colSep: "tab" | "comma" | "dash" | "custom", custom = ""): ParsedPair[] {
  const rowDelim = rowSep === "newline" ? /\r?\n/ : /;/
  const colDelim =
    colSep === "tab" ? /\t/ : colSep === "comma" ? /,/ : colSep === "dash" ? /\s[-–—]\s|\t/ : new RegExp(escapeRegExp(custom || "\t"))
  return raw
    .split(rowDelim)
    .map((row) => row.trim())
    .filter(Boolean)
    .map((row) => {
      const parts = row.split(colDelim)
      const term = (parts.shift() ?? "").trim()
      const definition = parts.join(" ").trim()
      return { term, definition }
    })
    .filter((pair) => pair.term || pair.definition)
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export function shuffle<T>(items: T[]): T[] {
  const out = items.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export function pickRandom<T>(items: T[], count: number, exclude?: (item: T) => boolean): T[] {
  const pool = exclude ? items.filter((item) => !exclude(item)) : items.slice()
  return shuffle(pool).slice(0, count)
}

export function plural(count: number, one: string, few: string, many: string) {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few
  return many
}

export function formatTime(ms: number) {
  const total = Math.max(0, Math.round(ms / 100) / 10)
  const minutes = Math.floor(total / 60)
  const seconds = (total % 60).toFixed(1)
  if (minutes > 0) return `${minutes}:${seconds.padStart(4, "0")}`
  return `${seconds} с`
}

export function relativeDate(timestamp: number) {
  const diff = Date.now() - timestamp
  const minute = 60_000
  const hour = 60 * minute
  const day = 24 * hour
  if (diff < minute) return "только что"
  if (diff < hour) {
    const value = Math.floor(diff / minute)
    return `${value} ${plural(value, "минуту", "минуты", "минут")} назад`
  }
  if (diff < day) {
    const value = Math.floor(diff / hour)
    return `${value} ${plural(value, "час", "часа", "часов")} назад`
  }
  if (diff < 30 * day) {
    const value = Math.floor(diff / day)
    return `${value} ${plural(value, "день", "дня", "дней")} назад`
  }
  return new Date(timestamp).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" })
}
