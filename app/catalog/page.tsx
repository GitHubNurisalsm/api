"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { BookOpen, Check, FolderPlus, GraduationCap, Languages, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { DEUTSCH_COURSE, LEVEL_INFO, LEVEL_ORDER, packsByLevel, totalPairs, type Level } from "@/lib/catalog"
import { useStore } from "@/lib/store"
import { plural } from "@/lib/text"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

const NEW_FOLDER = "__new"
const NO_FOLDER = "__none"

export default function CatalogPage() {
  const router = useRouter()
  const { state, ready, addPacks, createFolder } = useStore()

  const [selected, setSelected] = React.useState<Set<string>>(() => new Set(DEUTSCH_COURSE.map((pack) => pack.id)))
  const [folderChoice, setFolderChoice] = React.useState<string>("")
  const [newFolderName, setNewFolderName] = React.useState("Deutsch")

  // Preselect a folder called "Deutsch" if the user already made one.
  React.useEffect(() => {
    if (!ready || folderChoice) return
    const match = state.folders.find((folder) => folder.name.trim().toLowerCase() === "deutsch")
    setFolderChoice(match ? match.id : NEW_FOLDER)
  }, [ready, state.folders, folderChoice])

  const existingTitles = React.useMemo(
    () => new Set(state.sets.map((set) => set.title.trim().toLowerCase())),
    [state.sets],
  )

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleLevel(level: Level, on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      for (const pack of packsByLevel(level)) {
        if (on) next.add(pack.id)
        else next.delete(pack.id)
      }
      return next
    })
  }

  const chosenPacks = DEUTSCH_COURSE.filter((pack) => selected.has(pack.id))
  const chosenNew = chosenPacks.filter((pack) => !existingTitles.has(pack.title.trim().toLowerCase()))

  function handleAdd() {
    if (!chosenPacks.length) {
      toast.error("Выберите хотя бы один модуль")
      return
    }
    let folderId: string | null = null
    if (folderChoice === NEW_FOLDER) {
      const name = newFolderName.trim() || "Deutsch"
      const existing = state.folders.find((folder) => folder.name.trim().toLowerCase() === name.toLowerCase())
      folderId = existing ? existing.id : createFolder(name, "#4255ff")
    } else if (folderChoice !== NO_FOLDER) {
      folderId = folderChoice
    }

    const result = addPacks(
      chosenPacks.map((pack) => ({
        title: pack.title,
        description: pack.description,
        pairs: pack.pairs,
        termLang: "de-DE",
        defLang: "ru-RU",
      })),
      folderId,
    )

    if (!result.added) {
      toast.error("Все выбранные модули уже есть в библиотеке")
      return
    }
    toast.success(
      `Добавлено ${result.added} ${plural(result.added, "модуль", "модуля", "модулей")} и ${result.terms} карточек` +
        (result.skipped ? ` · пропущено дубликатов: ${result.skipped}` : ""),
    )
    router.push(folderId ? `/folder/${folderId}` : "/library")
  }

  if (!ready) return <Skeleton className="mx-auto mt-10 h-96 max-w-4xl rounded-xl" />

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Languages className="size-6" />
        </span>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Готовый курс немецкого A1 → C1</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {DEUTSCH_COURSE.length} модулей · {totalPairs(DEUTSCH_COURSE)} карточек · лексика, грамматика и речевые обороты
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border bg-card p-5">
        <h2 className="font-extrabold">Куда добавить</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Папка</Label>
            <Select value={folderChoice} onValueChange={setFolderChoice}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите папку" />
              </SelectTrigger>
              <SelectContent>
                {state.folders.map((folder) => (
                  <SelectItem key={folder.id} value={folder.id}>
                    {folder.name}
                  </SelectItem>
                ))}
                <SelectItem value={NEW_FOLDER}>+ Создать новую папку</SelectItem>
                <SelectItem value={NO_FOLDER}>Без папки</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {folderChoice === NEW_FOLDER && (
            <div className="space-y-1.5">
              <Label htmlFor="new-folder">Название новой папки</Label>
              <Input id="new-folder" value={newFolderName} onChange={(event) => setNewFolderName(event.target.value)} />
            </div>
          )}
        </div>
        <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
          <Sparkles className="mt-0.5 size-3.5 shrink-0" />
          Модули с уже существующим названием будут пропущены — повторное добавление ничего не продублирует.
        </p>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-bold">
          Выбрано {chosenPacks.length} из {DEUTSCH_COURSE.length} модулей
          {chosenPacks.length > chosenNew.length && (
            <span className="font-semibold text-muted-foreground"> · новых {chosenNew.length}</span>
          )}
        </p>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className="font-bold" onClick={() => setSelected(new Set(DEUTSCH_COURSE.map((p) => p.id)))}>
            Выбрать все
          </Button>
          <Button variant="ghost" size="sm" className="font-bold" onClick={() => setSelected(new Set())}>
            Снять всё
          </Button>
        </div>
      </div>

      <div className="mt-4 space-y-5">
        {LEVEL_ORDER.map((level) => {
          const packs = packsByLevel(level)
          const info = LEVEL_INFO[level]
          const allOn = packs.every((pack) => selected.has(pack.id))
          return (
            <section key={level} className="overflow-hidden rounded-xl border bg-card">
              <header className="flex flex-wrap items-center gap-3 border-b px-5 py-4">
                <span
                  className="grid size-10 shrink-0 place-items-center rounded-lg text-sm font-black text-white"
                  style={{ background: info.color }}
                >
                  {info.label}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-extrabold">{info.caption}</p>
                  <p className="text-xs text-muted-foreground">
                    {packs.length} {plural(packs.length, "модуль", "модуля", "модулей")} · {totalPairs(packs)} карточек
                  </p>
                </div>
                <Button variant="outline" size="sm" className="font-bold" onClick={() => toggleLevel(level, !allOn)}>
                  {allOn ? "Снять уровень" : "Выбрать уровень"}
                </Button>
              </header>
              <ul className="divide-y">
                {packs.map((pack) => {
                  const on = selected.has(pack.id)
                  const already = existingTitles.has(pack.title.trim().toLowerCase())
                  return (
                    <li key={pack.id}>
                      <label className="flex cursor-pointer items-start gap-3 px-5 py-3.5 transition-colors hover:bg-secondary/50">
                        <Checkbox checked={on} onCheckedChange={() => toggle(pack.id)} className="mt-0.5" />
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="font-bold">{pack.title}</span>
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-[11px] font-bold",
                                pack.kind === "grammar" && "bg-primary/15 text-primary",
                                pack.kind === "vocab" && "bg-chart-2/15 text-chart-2",
                                pack.kind === "phrases" && "bg-accent/25 text-accent-foreground dark:text-accent",
                              )}
                            >
                              {pack.kind === "grammar" ? "грамматика" : pack.kind === "phrases" ? "обороты" : "лексика"}
                            </span>
                            {already && (
                              <span className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground">
                                <Check className="size-3" />
                                уже в библиотеке
                              </span>
                            )}
                          </span>
                          <span className="mt-0.5 block text-sm text-muted-foreground">{pack.description}</span>
                        </span>
                        <span className="shrink-0 text-xs font-bold tabular-nums text-muted-foreground">
                          {pack.pairs.length}
                        </span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
      </div>

      <div className="sticky bottom-4 mt-8">
        <Button size="lg" className="h-14 w-full rounded-full text-base font-bold shadow-lg" onClick={handleAdd} disabled={!chosenPacks.length}>
          <FolderPlus className="size-5" />
          Добавить {chosenPacks.length} {plural(chosenPacks.length, "модуль", "модуля", "модулей")} ·{" "}
          {totalPairs(chosenPacks)} карточек
        </Button>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <Link href="/library" className="flex items-center gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-primary/60">
          <BookOpen className="size-5 text-primary" />
          <span className="font-bold">Моя библиотека</span>
        </Link>
        <Link href="/create" className="flex items-center gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-primary/60">
          <GraduationCap className="size-5 text-primary" />
          <span className="font-bold">Создать свой модуль</span>
        </Link>
      </div>
    </div>
  )
}
