const PUNCT = /[.,/#!$%^&*;:{}=\-_`~()[\]"'?¿¡«»„“”’]/g

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

/** Levenshtein distance, capped for performance on long strings. */
export function levenshtein(a: string, b: string) {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  let prev = new Array(b.length + 1)
  let curr = new Array(b.length + 1)
  for (let j = 0; j <= b.length; j++) prev[j] = j
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
    }
    const tmp = prev
    prev = curr
    curr = tmp
  }
  return prev[b.length]
}

export type GradeResult = "correct" | "typo" | "wrong"

/**
 * Accepts multiple answers separated by "," "/" or ";".
 * Returns "typo" when the answer is one or two characters away.
 */
export function gradeAnswer(input: string, expected: string, accentInsensitive = true): GradeResult {
  const given = normalizeAnswer(input, accentInsensitive)
  if (!given) return "wrong"
  const variants = expected
    .split(/[,/;]|\sили\s|\sor\s/gi)
    .map((v) => normalizeAnswer(v, accentInsensitive))
    .filter(Boolean)
  if (!variants.length) variants.push(normalizeAnswer(expected, accentInsensitive))

  for (const variant of variants) {
    if (given === variant) return "correct"
  }
  for (const variant of variants) {
    const tolerance = variant.length <= 4 ? 0 : variant.length <= 8 ? 1 : 2
    if (tolerance > 0 && levenshtein(given, variant) <= tolerance) return "typo"
  }
  return "wrong"
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
