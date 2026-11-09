"use client"

import Link from "next/link"
import * as React from "react"
import { ArrowRight, BookOpen, Flame, Folder, Gamepad2, GraduationCap, Keyboard, Languages, Layers, Plus, Sparkles, Timer } from "lucide-react"
import { useStore } from "@/lib/store"
import { masteryFor, streakFromDays } from "@/lib/srs"
import { plural } from "@/lib/text"
import { SetCard } from "@/components/set-card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

const MODES = [
  { icon: Layers, title: "Карточки", text: "Классический флип с озвучкой и автопрокруткой" },
  { icon: GraduationCap, title: "Заучивание", text: "Адаптивные раунды: тесты и ввод вперемешку" },
  { icon: Keyboard, title: "Письмо", text: "Печатаете ответ, опечатки распознаются" },
  { icon: Timer, title: "Диктант", text: "Слушаете озвучку и пишете на слух" },
  { icon: BookOpen, title: "Тест", text: "Экзамен с выбором, вводом и «верно/неверно»" },
  { icon: Gamepad2, title: "Подбор", text: "Игра на время: соединяйте пары" },
]

export default function HomePage() {
  const { state, ready, getProgress } = useStore()
  const streak = streakFromDays(state.stats.studyDays)

  const recentSets = React.useMemo(() => {
    const byId = new Map(state.sets.map((set) => [set.id, set]))
    const recent = state.recent.map((id) => byId.get(id)).filter(Boolean)
    const rest = state.sets.filter((set) => !state.recent.includes(set.id)).sort((a, b) => b.updatedAt - a.updatedAt)
    return [...recent, ...rest].slice(0, 8) as typeof state.sets
  }, [state.sets, state.recent])

  const continueSet = recentSets[0]
  const continueMastery = continueSet ? masteryFor(continueSet, getProgress(continueSet.id)) : null

  if (!ready) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-44 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Hero / continue studying */}
      <section className="overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-card to-accent/10 p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
            <Sparkles className="size-3.5" />
            Все режимы открыты
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/25 px-3 py-1 text-xs font-bold text-accent-foreground dark:text-accent">
            Без лимитов и подписки
          </span>
          {streak > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1 text-xs font-bold">
              <Flame className="size-3.5 text-orange-500" />
              Серия: {streak} {plural(streak, "день", "дня", "дней")}
            </span>
          )}
        </div>

        <h1 className="mt-4 max-w-2xl text-3xl font-extrabold leading-tight tracking-tight text-balance sm:text-4xl">
          {continueSet ? "Продолжите с того места, где остановились" : "Создайте первый модуль и начните учить"}
        </h1>

        {continueSet ? (
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <div className="rounded-xl border bg-card px-4 py-3">
              <p className="line-clamp-1 max-w-[18rem] font-bold">{continueSet.title}</p>
              <p className="text-xs text-muted-foreground">
                {continueSet.terms.length} {plural(continueSet.terms.length, "термин", "термина", "терминов")} · освоено{" "}
                {continueMastery?.percent}%
              </p>
            </div>
            <Button asChild size="lg" className="h-12 rounded-full px-6 font-bold">
              <Link href={`/set/${continueSet.id}/learn`}>
                Учить дальше
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 rounded-full px-6 font-bold">
              <Link href={`/set/${continueSet.id}/flashcards`}>Карточки</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-5 flex flex-wrap gap-3">
            <Button asChild size="lg" className="h-12 rounded-full px-6 font-bold">
              <Link href="/create">
                <Plus className="size-4" />
                Создать модуль
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 rounded-full px-6 font-bold">
              <Link href="/settings#import">Импортировать набор</Link>
            </Button>
          </div>
        )}
      </section>

      {/* Ready-made course */}
      <section className="mt-6">
        <Link
          href="/catalog"
          className="flex flex-wrap items-center gap-4 rounded-xl border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-md"
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <Languages className="size-6" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-extrabold">Готовый курс немецкого A1 → C1</span>
            <span className="mt-0.5 block text-sm text-muted-foreground">
              39 модулей и 1786 карточек: лексика, грамматика и речевые обороты. Добавьте в свою папку в один клик.
            </span>
          </span>
          <ArrowRight className="size-5 shrink-0 text-muted-foreground" />
        </Link>
      </section>

      {/* Folders */}
      {state.folders.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-lg font-extrabold">Папки</h2>
          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
            {state.folders.map((folder) => {
              const count = state.sets.filter((set) => set.folderId === folder.id).length
              return (
                <Link
                  key={folder.id}
                  href={`/folder/${folder.id}`}
                  className="flex min-w-[13rem] items-center gap-3 rounded-xl border bg-card px-4 py-3 transition-colors hover:border-primary/60"
                >
                  <Folder className="size-5 shrink-0" style={{ color: folder.color }} />
                  <div className="min-w-0">
                    <p className="truncate font-bold">{folder.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {count} {plural(count, "модуль", "модуля", "модулей")}
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* Recent sets */}
      <section className="mt-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-extrabold">Недавние модули</h2>
          <Button asChild variant="ghost" className="font-bold">
            <Link href="/library">
              Вся библиотека
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
        {recentSets.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {recentSets.map((set) => (
              <SetCard key={set.id} set={set} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed bg-card p-10 text-center">
            <p className="font-bold">Пока пусто</p>
            <p className="mt-1 text-sm text-muted-foreground">Создайте модуль — и он появится здесь.</p>
            <Button asChild className="mt-4 rounded-full font-bold">
              <Link href="/create">Создать модуль</Link>
            </Button>
          </div>
        )}
      </section>

      {/* Modes overview */}
      <section className="mt-12">
        <h2 className="mb-1 text-lg font-extrabold">6 режимов изучения</h2>
        <p className="mb-4 text-sm text-muted-foreground">Доступны в каждом модуле, без ограничений.</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MODES.map((mode) => (
            <div key={mode.title} className="rounded-xl border bg-card p-5">
              <mode.icon className="size-6 text-primary" />
              <p className="mt-3 font-bold">{mode.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{mode.text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
