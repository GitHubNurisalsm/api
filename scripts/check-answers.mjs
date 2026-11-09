/**
 * Checks the answer grader against the cases that matter and against every
 * card in the built-in course. Run with: npm run check
 */
import { answerHint, gradeAnswer } from "../lib/text.ts"
import { A1_PACKS } from "../lib/catalog/a1.ts"
import { A2_PACKS } from "../lib/catalog/a2.ts"
import { B1_PACKS } from "../lib/catalog/b1.ts"
import { B2_PACKS } from "../lib/catalog/b2.ts"
import { C1_PACKS } from "../lib/catalog/c1.ts"

const COURSE = [...A1_PACKS, ...A2_PACKS, ...B1_PACKS, ...B2_PACKS, ...C1_PACKS]

let passed = 0
const failures = []
const expect = (input, answer, want, note = "") => {
  const got = gradeAnswer(input, answer)
  if (got === want) passed += 1
  else failures.push(`"${input}" vs "${answer}" -> ${got}, expected ${want}${note ? ` (${note})` : ""}`)
}

/* The whole answer, written out as shown on the card. */
expect("женат замужем", "женат / замужем", "correct")
expect("разведён / разведена", "разведён / разведена", "correct")
expect("разведён разведена", "разведён / разведена", "correct")
expect("bin bist ist", "bin / bist / ist", "correct")
expect("ist / bin / bist", "bin / bist / ist", "correct", "order swapped")
expect("замужем / женат", "женат / замужем", "correct", "order swapped")

/* A single alternative is still enough. */
expect("женат", "женат / замужем", "correct")
expect("замужем", "женат / замужем", "correct")
expect("сказать", "говорить, сказать", "correct")

/* Bracketed hints and trailing ellipses are optional. */
expect("масло", "масло (сливочное)", "correct")
expect("знать", "знать (факт)", "correct")
expect("я из", "я из …", "correct")
expect("я живу в ...", "я живу в …", "correct")
expect("я бы хотел", "я бы хотел … (при заказе)", "correct")

/* Articles and plural markers are not required. */
expect("der Tisch", "der Tisch, -e", "correct")
expect("Tisch", "der Tisch, -e", "correct")

/* Near misses are typos, not failures. */
expect("резведён / разведена", "разведён / разведена", "typo")
expect("sprehcen", "sprechen", "typo", "swapped letters")
expect("замужим", "женат / замужем", "typo")
expect("удивленный", "удивлённый", "correct", "ё written as е")

/* Wrong answers stay wrong. */
expect("собака", "женат / замужем", "wrong")
expect("", "женат / замужем", "wrong")
expect("стол", "стул", "wrong", "short words get no tolerance")
expect("gehen", "kommen", "wrong")

/* Hints are offered exactly where the format could be guessed wrong. */
const hints = [
  ["женат / замужем", true],
  ["масло (сливочное)", true],
  ["я из …", true],
  ["способность", false],
]
for (const [answer, wanted] of hints) {
  const hint = answerHint(answer)
  if (Boolean(hint) === wanted) passed += 1
  else failures.push(`answerHint("${answer}") -> ${JSON.stringify(hint)}, expected ${wanted ? "a hint" : "none"}`)
}

/* Every card in the course must accept its own answer, in both directions. */
let cards = 0
for (const pack of COURSE) {
  for (const [term, definition] of pack.pairs) {
    cards += 1
    if (gradeAnswer(definition, definition) !== "correct") failures.push(`[${pack.id}] definition rejects itself: "${definition}"`)
    if (gradeAnswer(term, term) !== "correct") failures.push(`[${pack.id}] term rejects itself: "${term}"`)
    const first = definition.split(/[,;/]/)[0].trim()
    if (first && first !== definition && gradeAnswer(first, definition) !== "correct") {
      failures.push(`[${pack.id}] first alternative rejected: "${first}" of "${definition}"`)
    }
  }
}
passed += cards * 2

console.log(`${passed} checks passed across ${cards} course cards`)
if (failures.length) {
  console.error(`\n${failures.length} failed:`)
  failures.slice(0, 30).forEach((line) => console.error("  " + line))
  process.exit(1)
}
