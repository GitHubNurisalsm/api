export type Term = {
  id: string
  term: string
  definition: string
  starred: boolean
  image?: string
}

export type StudySet = {
  id: string
  title: string
  description: string
  terms: Term[]
  folderId: string | null
  createdAt: number
  updatedAt: number
  termLang: string
  defLang: string
  author: string
}

export type Folder = {
  id: string
  name: string
  color: string
  createdAt: number
}

export type CardStatus = "new" | "learning" | "familiar" | "mastered"

export type CardProgress = {
  box: number
  correct: number
  incorrect: number
  streak: number
  lastSeen: number
  status: CardStatus
}

export type TestResult = {
  date: number
  score: number
  total: number
  mode: string
}

export type SetProgress = {
  cards: Record<string, CardProgress>
  rounds: number
  lastStudied: number
  bestMatchTime: number | null
  testHistory: TestResult[]
}

export type Settings = {
  ttsEnabled: boolean
  frontIsTerm: boolean
  shuffleDefault: boolean
  soundEffects: boolean
  learnMode: "mixed" | "written" | "choice"
  accentInsensitive: boolean
  autoplayDelay: number
}

export type Stats = {
  studyDays: string[]
  cardsStudied: number
  sessions: number
}

export type Profile = {
  name: string
  username: string
  plus: boolean
}

export type AppState = {
  version: number
  /** id -> deletion time, so a delete on one device is not undone by a sync from another */
  deleted: Record<string, number>
  sets: StudySet[]
  folders: Folder[]
  progress: Record<string, SetProgress>
  recent: string[]
  settings: Settings
  stats: Stats
  profile: Profile
}

export const DEFAULT_SETTINGS: Settings = {
  ttsEnabled: true,
  frontIsTerm: true,
  shuffleDefault: false,
  soundEffects: true,
  learnMode: "mixed",
  accentInsensitive: true,
  autoplayDelay: 4,
}

export const FOLDER_COLORS = [
  "#4255ff",
  "#0ea5e9",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#a855f7",
  "#ec4899",
  "#14b8a6",
]
