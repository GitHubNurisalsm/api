"use client"

import * as React from "react"
import Link from "next/link"
import { Flame, GraduationCap, Layers, Target, Trophy } from "lucide-react"
import { useStore } from "@/lib/store"
import { cardOf, dayKey, masteryFor, streakFromDays } from "@/lib/srs"
import { formatTime, plural } from "@/lib/text"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export default function StatsPage() {
  const { state, ready, getProgress } = useStore()

  if (!ready) return <Skeleton className="mx-auto mt-10 h-64 max-w-5xl rounded-xl" />

  const streak = streakFromDays(state.stats.studyDays)
  const totalTerms = state.sets.reduce((sum, set) => sum + set.terms.length, 0)
  const masteredTerms = state.sets.reduce((sum, set) => {
    const progress = getProgress(set.id)
    return sum + set.terms.filter((term) => cardOf(progress, term.id).status === "mastered").length
  }, 0)
  const overall = totalTerms ? Math.round((masteredTerms / totalTerms) * 100) : 0

  // last 12 weeks heat map
  const days: { key: string; active: boolean }[] = []
  for (let offset = 83; offset >= 0; offset--) {
    const key = dayKey(new Date(Date.now() - offset * 86_400_000))
    days.push({ key, active: state.stats.studyDays.includes(key) })
  }

  const ranked = state.sets
    .map((set) => ({ set, mastery: masteryFor(set, getProgress(set.id)), progress: getProgress(set.id) }))
    .sort((a, b) => b.mastery.percent - a.mastery.percent)

  const weakest = ranked
    .filter((entry) => entry.mastery.total > 0 && entry.mastery.percent < 100)
    .slice(-3)
    .reverse()

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-extrabold tracking-tight">Ваш прогресс</h1>
      <p className="mt-1 text-sm text-muted-foreground">Статистика считается локально в этом браузере.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Flame} label="Серия дней" value={String(streak)} hint={streak ? "так держать" : "начните сегодня"} />
        <StatCard icon={Target} label="Освоено всего" value={`${overall}%`} hint={`${masteredTerms} из ${totalTerms} терминов`} />
        <StatCard icon={Layers} label="Модулей" value={String(state.sets.length)} hint={`${totalTerms} терминов`} />
        <StatCard
          icon={GraduationCap}
          label="Ответов дано"
          value={String(state.stats.cardsStudied)}
          hint={`${state.stats.sessions} ${plural(state.stats.sessions, "сессия", "сессии", "сессий")}`}
        />
      </div>

      <section className="mt-8 rounded-xl border bg-card p-5">
        <h2 className="font-extrabold">Активность за 12 недель</h2>
        <div className="mt-4 grid grid-flow-col grid-rows-7 gap-1" style={{ gridAutoColumns: "minmax(0, 1fr)" }}>
          {days.map((day) => (
            <div
              key={day.key}
              title={day.key}
              className={cn("aspect-square rounded-[3px]", day.active ? "bg-primary" : "bg-muted")}
            />
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Занимались {state.stats.studyDays.length} {plural(state.stats.studyDays.length, "день", "дня", "дней")}
        </p>
      </section>

      {weakest.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-extrabold">Стоит подтянуть</h2>
          <div className="space-y-2">
            {weakest.map((entry) => (
              <div key={entry.set.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
                <div className="min-w-0">
                  <p className="truncate font-bold">{entry.set.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Освоено {entry.mastery.percent}% · не начато {entry.mastery.notStudied}
                  </p>
                </div>
                <Button asChild size="sm" className="rounded-full font-bold">
                  <Link href={`/set/${entry.set.id}/learn`}>Учить</Link>
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-extrabold">Все модули</h2>
        {ranked.length ? (
          <div className="space-y-2">
            {ranked.map((entry) => (
              <Link
                key={entry.set.id}
                href={`/set/${entry.set.id}`}
                className="block rounded-xl border bg-card p-4 transition-colors hover:border-primary/60"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="min-w-0 truncate font-bold">{entry.set.title}</p>
                  <div className="flex items-center gap-3 text-xs font-bold text-muted-foreground">
                    {entry.progress.bestMatchTime !== null && (
                      <span className="flex items-center gap-1">
                        <Trophy className="size-3.5 text-accent" />
                        {formatTime(entry.progress.bestMatchTime)}
                      </span>
                    )}
                    <span className="text-foreground">{entry.mastery.percent}%</span>
                  </div>
                </div>
                <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="bg-chart-2" style={{ width: `${(entry.mastery.mastered / Math.max(1, entry.mastery.total)) * 100}%` }} />
                  <div className="bg-primary" style={{ width: `${(entry.mastery.familiar / Math.max(1, entry.mastery.total)) * 100}%` }} />
                  <div className="bg-accent" style={{ width: `${(entry.mastery.learning / Math.max(1, entry.mastery.total)) * 100}%` }} />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed bg-card p-10 text-center text-sm text-muted-foreground">
            Пока нет данных — создайте модуль и начните учить.
          </p>
        )}
      </section>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  hint: string
}) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <Icon className="size-5 text-primary" />
      <p className="mt-3 text-3xl font-extrabold tabular-nums">{value}</p>
      <p className="text-sm font-bold">{label}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
    </div>
  )
}
