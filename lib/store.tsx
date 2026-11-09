"use client"

import * as React from "react"
import type { AppState, Folder, Settings, SetProgress, StudySet, TestResult, Term } from "./types"
import { DEFAULT_SETTINGS } from "./types"
import { createSeedState, emptyState, makeId } from "./seed"
import { mergeStates } from "./merge"
import { applyAnswer, cardOf, dayKey, emptyProgress } from "./srs"

const STORAGE_KEY = "quizmaster.state.v1"
const DEVICE_KEY = "quizmaster.device.v1"

/** A stable id for this browser, so each device syncs into its own file. */
function deviceId() {
  try {
    const existing = window.localStorage.getItem(DEVICE_KEY)
    if (existing) return existing
    const fresh = `d${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
    window.localStorage.setItem(DEVICE_KEY, fresh)
    return fresh
  } catch {
    return "default"
  }
}

export type Account = { username: string; displayName: string }
export type SyncStatus = "off" | "checking" | "synced" | "saving" | "error"

type Ctx = {
  state: AppState
  ready: boolean
  /* account */
  account: Account | null
  syncStatus: SyncStatus
  lastSyncedAt: number | null
  register: (username: string, password: string, displayName?: string) => Promise<{ ok: boolean; error?: string }>
  login: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>
  logout: () => Promise<void>
  syncNow: () => Promise<void>
  /* sets */
  createSet: (input: { title: string; description?: string; terms?: Term[]; folderId?: string | null; termLang?: string; defLang?: string }) => string
  updateSet: (id: string, patch: Partial<Omit<StudySet, "id">>) => void
  deleteSet: (id: string) => void
  duplicateSet: (id: string) => string | null
  addPacks: (
    packs: { title: string; description: string; pairs: [string, string][]; termLang?: string; defLang?: string }[],
    folderId: string | null,
  ) => { added: number; skipped: number; terms: number }
  getSet: (id: string) => StudySet | undefined
  toggleStar: (setId: string, termId: string) => void
  starAll: (setId: string, starred: boolean) => void
  /* folders */
  createFolder: (name: string, color?: string) => string
  renameFolder: (id: string, name: string) => void
  deleteFolder: (id: string) => void
  moveSetToFolder: (setId: string, folderId: string | null) => void
  /* progress */
  getProgress: (setId: string) => SetProgress
  recordAnswer: (setId: string, termId: string, correct: boolean) => void
  resetProgress: (setId: string) => void
  completeRound: (setId: string) => void
  recordTest: (setId: string, result: TestResult) => void
  recordMatch: (setId: string, ms: number) => boolean
  touchRecent: (setId: string) => void
  /* misc */
  updateSettings: (patch: Partial<Settings>) => void
  importState: (raw: string) => { ok: boolean; message: string }
  exportState: () => string
  resetAll: (withDemo: boolean) => void
}

const StoreContext = React.createContext<Ctx | null>(null)

function migrate(parsed: unknown): AppState | null {
  if (!parsed || typeof parsed !== "object") return null
  const candidate = parsed as Partial<AppState>
  if (!Array.isArray(candidate.sets)) return null
  return {
    version: 1,
    deleted: candidate.deleted ?? {},
    sets: candidate.sets.map((set) => ({
      ...set,
      folderId: set.folderId ?? null,
      description: set.description ?? "",
      termLang: set.termLang ?? "en-US",
      defLang: set.defLang ?? "ru-RU",
      author: set.author ?? "you",
      terms: (set.terms ?? []).map((term) => ({ ...term, starred: Boolean(term.starred) })),
    })),
    folders: candidate.folders ?? [],
    progress: candidate.progress ?? {},
    recent: candidate.recent ?? [],
    settings: { ...DEFAULT_SETTINGS, ...(candidate.settings ?? {}) },
    stats: candidate.stats ?? { studyDays: [], cardsStudied: 0, sessions: 0 },
    profile: candidate.profile ?? { name: "Моя библиотека", username: "me", plus: true },
  }
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<AppState>(() => emptyState())
  const [ready, setReady] = React.useState(false)
  const [account, setAccount] = React.useState<Account | null>(null)
  const [syncStatus, setSyncStatus] = React.useState<SyncStatus>("checking")
  const [lastSyncedAt, setLastSyncedAt] = React.useState<number | null>(null)
  /** Pushing is held back until the account's state has been pulled and merged. */
  const [syncArmed, setSyncArmed] = React.useState(false)
  const stateRef = React.useRef(state)
  stateRef.current = state
  const pushTimer = React.useRef<number | null>(null)

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const migrated = migrate(JSON.parse(raw))
        setState(migrated ?? createSeedState())
      } else {
        setState(createSeedState())
      }
    } catch {
      setState(createSeedState())
    }
    setReady(true)
  }, [])

  React.useEffect(() => {
    if (!ready) return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* quota exceeded — keep working in memory */
    }
  }, [state, ready])

  // keep multiple tabs in sync
  React.useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key !== STORAGE_KEY || !event.newValue) return
      const migrated = migrate(JSON.parse(event.newValue))
      if (migrated) setState(migrated)
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

  /**
   * True when this browser only holds the untouched demo content it was
   * seeded with. Such a device adopts the account's library outright, so
   * signing in does not leave duplicate demo modules behind.
   */
  const isPristineSeed = React.useCallback((candidate: AppState) => {
    return (
      candidate.sets.length > 0 &&
      candidate.sets.every((set) => set.author === "demo" && set.updatedAt === set.createdAt) &&
      Object.keys(candidate.progress).length === 0 &&
      candidate.stats.cardsStudied === 0
    )
  }, [])

  /** Pulls the account's state and merges it into whatever this device holds. */
  const pullAndMerge = React.useCallback(async () => {
    const response = await fetch("/api/state", { cache: "no-store" })
    if (!response.ok) throw new Error("pull failed")
    const payload = (await response.json()) as { state: AppState | null }
    if (payload.state && Array.isArray(payload.state.sets)) {
      const remote = migrate(payload.state) ?? payload.state
      const merged = isPristineSeed(stateRef.current) ? remote : mergeStates(stateRef.current, remote)
      stateRef.current = merged
      setState(merged)
    }
    setSyncArmed(true)
    setLastSyncedAt(Date.now())
  }, [isPristineSeed])

  const push = React.useCallback(async () => {
    setSyncStatus("saving")
    try {
      const response = await fetch("/api/state", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-device-id": deviceId() },
        body: JSON.stringify(stateRef.current),
      })
      if (!response.ok) throw new Error("push failed")
      setLastSyncedAt(Date.now())
      setSyncStatus("synced")
    } catch {
      setSyncStatus("error")
    }
  }, [])

  // Who is signed in on this device?
  React.useEffect(() => {
    if (!ready) return
    let cancelled = false
    ;(async () => {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" })
        const payload = (await response.json()) as { user: { username?: string; displayName?: string } | null }
        if (cancelled) return
        if (!payload.user) {
          setSyncStatus("off")
          return
        }
        setAccount({
          username: payload.user.username ?? "",
          displayName: payload.user.displayName ?? payload.user.username ?? "",
        })
        await pullAndMerge()
        if (!cancelled) setSyncStatus("synced")
      } catch {
        if (!cancelled) setSyncStatus(account ? "error" : "off")
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])

  // Save to the account shortly after any change settles.
  React.useEffect(() => {
    if (!ready || !account || !syncArmed) return
    if (pushTimer.current) window.clearTimeout(pushTimer.current)
    pushTimer.current = window.setTimeout(() => void push(), 1500)
    return () => {
      if (pushTimer.current) window.clearTimeout(pushTimer.current)
    }
  }, [state, ready, account, syncArmed, push])

  // Pull again when the tab regains focus, so another device's work shows up.
  React.useEffect(() => {
    if (!account || !syncArmed) return
    function onFocus() {
      void pullAndMerge().catch(() => setSyncStatus("error"))
    }
    window.addEventListener("focus", onFocus)
    return () => window.removeEventListener("focus", onFocus)
  }, [account, syncArmed, pullAndMerge])

  const value = React.useMemo<Ctx>(() => {
    const touchProgress = (draft: AppState, setId: string) => {
      if (!draft.progress[setId]) draft.progress[setId] = emptyProgress()
      return draft.progress[setId]
    }

    async function authenticate(path: string, payload: Record<string, unknown>) {
      try {
        const response = await fetch(path, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        const data = (await response.json().catch(() => ({}))) as { user?: Account; error?: string }
        if (!response.ok || !data.user) {
          return { ok: false, error: data.error ?? "Не удалось связаться с сервером" }
        }
        setAccount(data.user)
        setSyncStatus("saving")
        await pullAndMerge()
        await push()
        return { ok: true }
      } catch {
        return { ok: false, error: "Нет связи с сервером" }
      }
    }

    return {
      state,
      ready,
      account,
      syncStatus,
      lastSyncedAt,
      register: (username, password, displayName) => authenticate("/api/auth/register", { username, password, displayName }),
      login: (username, password) => authenticate("/api/auth/login", { username, password }),
      logout: async () => {
        try {
          await fetch("/api/auth/logout", { method: "POST" })
        } catch {
          /* clearing the local session is what matters */
        }
        setAccount(null)
        setSyncArmed(false)
        setSyncStatus("off")
        setLastSyncedAt(null)
      },
      syncNow: async () => {
        if (!account) return
        try {
          await pullAndMerge()
          await push()
        } catch {
          setSyncStatus("error")
        }
      },
      createSet: ({ title, description = "", terms = [], folderId = null, termLang = "en-US", defLang = "ru-RU" }) => {
        const id = makeId("set")
        const now = Date.now()
        const set: StudySet = {
          id,
          title: title.trim() || "Модуль без названия",
          description,
          terms: terms.length ? terms : [],
          folderId,
          createdAt: now,
          updatedAt: now,
          termLang,
          defLang,
          author: "you",
        }
        setState((prev) => ({ ...prev, sets: [set, ...prev.sets], recent: [id, ...prev.recent].slice(0, 12) }))
        return id
      },
      updateSet: (id, patch) => {
        setState((prev) => ({
          ...prev,
          sets: prev.sets.map((set) => (set.id === id ? { ...set, ...patch, updatedAt: Date.now() } : set)),
        }))
      },
      deleteSet: (id) => {
        setState((prev) => {
          const progress = { ...prev.progress }
          delete progress[id]
          return {
            ...prev,
            sets: prev.sets.filter((set) => set.id !== id),
            recent: prev.recent.filter((setId) => setId !== id),
            progress,
            deleted: { ...prev.deleted, [id]: Date.now() },
          }
        })
      },
      duplicateSet: (id) => {
        const source = state.sets.find((set) => set.id === id)
        if (!source) return null
        const newId = makeId("set")
        const copy: StudySet = {
          ...source,
          id: newId,
          title: `${source.title} (копия)`,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          terms: source.terms.map((term) => ({ ...term, id: makeId("t") })),
        }
        setState((prev) => ({ ...prev, sets: [copy, ...prev.sets] }))
        return newId
      },
      addPacks: (packs, folderId) => {
        const existingTitles = new Set(state.sets.map((set) => set.title.trim().toLowerCase()))
        const fresh: StudySet[] = []
        let skipped = 0
        let terms = 0
        const now = Date.now()
        packs.forEach((pack, index) => {
          if (existingTitles.has(pack.title.trim().toLowerCase())) {
            skipped += 1
            return
          }
          existingTitles.add(pack.title.trim().toLowerCase())
          terms += pack.pairs.length
          fresh.push({
            id: makeId("set"),
            title: pack.title,
            description: pack.description,
            folderId,
            createdAt: now + index,
            updatedAt: now + index,
            termLang: pack.termLang ?? "de-DE",
            defLang: pack.defLang ?? "ru-RU",
            author: "you",
            terms: pack.pairs.map(([term, definition]) => ({
              id: makeId("t"),
              term,
              definition,
              starred: false,
            })),
          })
        })
        if (fresh.length) setState((prev) => ({ ...prev, sets: [...fresh, ...prev.sets] }))
        return { added: fresh.length, skipped, terms }
      },
      getSet: (id) => state.sets.find((set) => set.id === id),
      toggleStar: (setId, termId) => {
        setState((prev) => ({
          ...prev,
          sets: prev.sets.map((set) =>
            set.id === setId
              ? { ...set, terms: set.terms.map((term) => (term.id === termId ? { ...term, starred: !term.starred } : term)) }
              : set,
          ),
        }))
      },
      starAll: (setId, starred) => {
        setState((prev) => ({
          ...prev,
          sets: prev.sets.map((set) => (set.id === setId ? { ...set, terms: set.terms.map((term) => ({ ...term, starred })) } : set)),
        }))
      },
      createFolder: (name, color = "#4255ff") => {
        const folder: Folder = { id: makeId("f"), name: name.trim() || "Новая папка", color, createdAt: Date.now() }
        setState((prev) => ({ ...prev, folders: [...prev.folders, folder] }))
        return folder.id
      },
      renameFolder: (id, name) => {
        setState((prev) => ({ ...prev, folders: prev.folders.map((folder) => (folder.id === id ? { ...folder, name } : folder)) }))
      },
      deleteFolder: (id) => {
        setState((prev) => ({
          ...prev,
          folders: prev.folders.filter((folder) => folder.id !== id),
          sets: prev.sets.map((set) => (set.folderId === id ? { ...set, folderId: null } : set)),
          deleted: { ...prev.deleted, [id]: Date.now() },
        }))
      },
      moveSetToFolder: (setId, folderId) => {
        setState((prev) => ({ ...prev, sets: prev.sets.map((set) => (set.id === setId ? { ...set, folderId } : set)) }))
      },
      getProgress: (setId) => state.progress[setId] ?? emptyProgress(),
      recordAnswer: (setId, termId, correct) => {
        setState((prev) => {
          const draft: AppState = { ...prev, progress: { ...prev.progress }, stats: { ...prev.stats } }
          const progress = { ...(draft.progress[setId] ?? emptyProgress()) }
          progress.cards = { ...progress.cards }
          progress.cards[termId] = applyAnswer(cardOf(progress, termId), correct)
          progress.lastStudied = Date.now()
          draft.progress[setId] = progress
          draft.stats.cardsStudied += 1
          const today = dayKey()
          if (!draft.stats.studyDays.includes(today)) draft.stats.studyDays = [...draft.stats.studyDays, today]
          draft.recent = [setId, ...prev.recent.filter((id) => id !== setId)].slice(0, 12)
          return draft
        })
      },
      resetProgress: (setId) => {
        setState((prev) => ({ ...prev, progress: { ...prev.progress, [setId]: emptyProgress() } }))
      },
      completeRound: (setId) => {
        setState((prev) => {
          const progress = { ...(prev.progress[setId] ?? emptyProgress()) }
          progress.rounds += 1
          progress.lastStudied = Date.now()
          return { ...prev, progress: { ...prev.progress, [setId]: progress }, stats: { ...prev.stats, sessions: prev.stats.sessions + 1 } }
        })
      },
      recordTest: (setId, result) => {
        setState((prev) => {
          const progress = { ...(prev.progress[setId] ?? emptyProgress()) }
          progress.testHistory = [result, ...progress.testHistory].slice(0, 25)
          progress.lastStudied = Date.now()
          return { ...prev, progress: { ...prev.progress, [setId]: progress } }
        })
      },
      recordMatch: (setId, ms) => {
        const previous = state.progress[setId]?.bestMatchTime ?? null
        const isRecord = previous === null || ms < previous
        setState((prev) => {
          const progress = { ...(prev.progress[setId] ?? emptyProgress()) }
          if (progress.bestMatchTime === null || ms < progress.bestMatchTime) progress.bestMatchTime = ms
          progress.lastStudied = Date.now()
          const today = dayKey()
          const studyDays = prev.stats.studyDays.includes(today) ? prev.stats.studyDays : [...prev.stats.studyDays, today]
          return { ...prev, progress: { ...prev.progress, [setId]: progress }, stats: { ...prev.stats, studyDays } }
        })
        return isRecord
      },
      touchRecent: (setId) => {
        setState((prev) => {
          if (prev.recent[0] === setId) return prev
          return { ...prev, recent: [setId, ...prev.recent.filter((id) => id !== setId)].slice(0, 12) }
        })
      },
      updateSettings: (patch) => {
        setState((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }))
      },
      exportState: () => JSON.stringify(state, null, 2),
      importState: (raw) => {
        try {
          const parsed = JSON.parse(raw)
          // Allow both a full backup and a bare array of sets
          if (Array.isArray(parsed)) {
            const sets = parsed as StudySet[]
            if (!sets.every((set) => set && typeof set.title === "string" && Array.isArray(set.terms))) {
              return { ok: false, message: "В файле нет корректных модулей." }
            }
            setState((prev) => ({
              ...prev,
              sets: [
                ...sets.map((set) => ({
                  ...set,
                  id: makeId("set"),
                  folderId: null,
                  author: "you",
                  createdAt: set.createdAt ?? Date.now(),
                  updatedAt: Date.now(),
                  description: set.description ?? "",
                  termLang: set.termLang ?? "en-US",
                  defLang: set.defLang ?? "ru-RU",
                  terms: (set.terms ?? []).map((term) => ({ ...term, id: makeId("t"), starred: Boolean(term.starred) })),
                })),
                ...prev.sets,
              ],
            }))
            return { ok: true, message: `Добавлено модулей: ${sets.length}` }
          }
          const migrated = migrate(parsed)
          if (!migrated) return { ok: false, message: "Формат файла не распознан." }
          setState(migrated)
          return { ok: true, message: `Загружено модулей: ${migrated.sets.length}` }
        } catch {
          return { ok: false, message: "Не удалось прочитать JSON." }
        }
      },
      resetAll: (withDemo) => {
        setState(withDemo ? createSeedState() : emptyState())
      },
    }
  }, [state, ready, account, syncStatus, lastSyncedAt, pullAndMerge, push])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = React.useContext(StoreContext)
  if (!ctx) throw new Error("useStore must be used inside StoreProvider")
  return ctx
}

export function useSet(id: string) {
  const { state } = useStore()
  return React.useMemo(() => state.sets.find((set) => set.id === id), [state.sets, id])
}

export { STORAGE_KEY }
