import type { AppState, StudySet, Term } from "./types"
import { DEFAULT_SETTINGS } from "./types"

let counter = 0
export function makeId(prefix = "id") {
  counter += 1
  const random = Math.random().toString(36).slice(2, 8)
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${random}`
}

function toTerms(pairs: [string, string][]): Term[] {
  return pairs.map(([term, definition]) => ({ id: makeId("t"), term, definition, starred: false }))
}

function buildSet(
  title: string,
  description: string,
  termLang: string,
  defLang: string,
  pairs: [string, string][],
  folderId: string | null,
  daysAgo: number,
): StudySet {
  const createdAt = Date.now() - daysAgo * 86_400_000
  return {
    id: makeId("set"),
    title,
    description,
    terms: toTerms(pairs),
    folderId,
    createdAt,
    updatedAt: createdAt,
    termLang,
    defLang,
    author: "demo",
  }
}

export function createSeedState(): AppState {
  const languages = { id: makeId("f"), name: "Языки", color: "#4255ff", createdAt: Date.now() }
  const science = { id: makeId("f"), name: "Наука", color: "#22c55e", createdAt: Date.now() }

  const sets: StudySet[] = [
    buildSet(
      "Английский — 1000 частых слов (1-20)",
      "Базовая лексика для старта. Учите по 20 слов в день.",
      "en-US",
      "ru-RU",
      [
        ["ability", "способность"],
        ["achieve", "достигать"],
        ["available", "доступный"],
        ["behaviour", "поведение"],
        ["benefit", "польза, выгода"],
        ["challenge", "вызов, сложная задача"],
        ["community", "сообщество"],
        ["confidence", "уверенность"],
        ["decision", "решение"],
        ["develop", "развивать"],
        ["environment", "окружающая среда"],
        ["experience", "опыт"],
        ["improve", "улучшать"],
        ["knowledge", "знание"],
        ["opportunity", "возможность"],
        ["particular", "особенный, конкретный"],
        ["require", "требовать"],
        ["research", "исследование"],
        ["sufficient", "достаточный"],
        ["suggest", "предлагать"],
      ],
      languages.id,
      2,
    ),
    buildSet(
      "Irregular verbs — три формы",
      "Неправильные глаголы английского языка.",
      "en-US",
      "ru-RU",
      [
        ["be — was/were — been", "быть"],
        ["begin — began — begun", "начинать"],
        ["break — broke — broken", "ломать"],
        ["bring — brought — brought", "приносить"],
        ["buy — bought — bought", "покупать"],
        ["choose — chose — chosen", "выбирать"],
        ["come — came — come", "приходить"],
        ["do — did — done", "делать"],
        ["drink — drank — drunk", "пить"],
        ["drive — drove — driven", "водить"],
        ["eat — ate — eaten", "есть"],
        ["find — found — found", "находить"],
        ["give — gave — given", "давать"],
        ["go — went — gone", "идти"],
        ["know — knew — known", "знать"],
        ["see — saw — seen", "видеть"],
        ["take — took — taken", "брать"],
        ["write — wrote — written", "писать"],
      ],
      languages.id,
      5,
    ),
    buildSet(
      "Биология: строение клетки",
      "Органоиды клетки и их функции.",
      "ru-RU",
      "ru-RU",
      [
        ["Рибосома", "Органоид, синтезирующий белок из аминокислот"],
        ["Митохондрия", "Станция клеточного дыхания, производит АТФ"],
        ["Лизосома", "Пузырёк с ферментами, расщепляет вещества"],
        ["Ядро", "Хранит ДНК и управляет работой клетки"],
        ["Хлоропласт", "Проводит фотосинтез в растительных клетках"],
        ["Аппарат Гольджи", "Сортирует, упаковывает и транспортирует белки"],
        ["Цитоплазма", "Внутренняя полужидкая среда клетки"],
        ["Клеточная мембрана", "Избирательно пропускает вещества внутрь и наружу"],
        ["Вакуоль", "Запасает воду, соли и питательные вещества"],
        ["Цитоскелет", "Белковый каркас, поддерживающий форму клетки"],
      ],
      science.id,
      9,
    ),
    buildSet(
      "Deutsch A1 — der, die, das",
      "Существительные с артиклями и переводом.",
      "de-DE",
      "ru-RU",
      [
        ["der Tisch", "стол"],
        ["die Lampe", "лампа"],
        ["das Fenster", "окно"],
        ["der Schlüssel", "ключ"],
        ["die Tür", "дверь"],
        ["das Buch", "книга"],
        ["der Löffel", "ложка"],
        ["die Straße", "улица"],
        ["das Mädchen", "девочка"],
        ["der Bahnhof", "вокзал"],
        ["die Arbeit", "работа"],
        ["das Wasser", "вода"],
      ],
      languages.id,
      16,
    ),
  ]

  return {
    version: 1,
    deleted: {},
    sets,
    folders: [languages, science],
    progress: {},
    recent: [sets[0].id],
    settings: { ...DEFAULT_SETTINGS },
    stats: { studyDays: [], cardsStudied: 0, sessions: 0 },
    profile: { name: "Моя библиотека", username: "me", plus: true },
  }
}

export function emptyState(): AppState {
  return {
    version: 1,
    deleted: {},
    sets: [],
    folders: [],
    progress: {},
    recent: [],
    settings: { ...DEFAULT_SETTINGS },
    stats: { studyDays: [], cardsStudied: 0, sessions: 0 },
    profile: { name: "Моя библиотека", username: "me", plus: true },
  }
}
