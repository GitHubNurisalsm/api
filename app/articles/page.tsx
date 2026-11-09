"use client"

import * as React from "react"
import Link from "next/link"
import { Check, RotateCcw, Trophy, Volume2, X, Zap } from "lucide-react"
import { useStore } from "@/lib/store"
import { ARTICLE_COLORS, collectArticleCards, type ArticleCard } from "@/lib/review"
import { plural, shuffle } from "@/lib/text"
import { speak } from "@/lib/speech"
import { Confetti } from "@/components/confetti"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

const ARTICLES = ["der", "die", "das"] as const
const ROUND = 20

/** Gender rules that cover most German nouns — shown after a mistake. */
const RULES: { test: RegExp; article: string; note: string }[] = [
  { test: /(ung|heit|keit|schaft|tion|tät|ik|ur|anz|enz)$/i, article: "die", note: "-ung, -heit, -keit, -schaft, -tion, -tät — всегда die" },
  { test: /(chen|lein|ment|um|tum)$/i, article: "das", note: "-chen, -lein, -ment, -um — всегда das" },
  { test: /(er|ling|ismus|or|ant)$/i, article: "der", note: "-er, -ling, -ismus, -or — обычно der" },
  { test: /(e)$/i, article: "die", note: "существительные на -e чаще всего die" },
  { test: /(nis|sal)$/i, article: "das", note: "-nis, -sal — обычно das" },
]

function ruleFor(noun: string, article: string) {
  const hit = RULES.find((rule) => rule.test.test(noun) && rule.article === article)
  return hit?.note ?? null
}

export default function ArticlesPage() {
  const { state, ready, recordAnswer } = useStore()
  const [queue, setQueue] = React.useState<ArticleCard[] | null>(null)
  const [index, setIndex] = React.useState(0)
  const [picked, setPicked] = React.useState<string | null>(null)
  const [stats, setStats] = React.useState({ correct: 0, wrong: 0 })
  const [missed, setMissed] = React.useState<ArticleCard[]>([])
  const [done, setDone] = React.useState(false)

  const pool = React.useMemo(() => (ready ? collectArticleCards(state) : []), [state, ready])
  const current = queue?.[index]

  React.useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!current || picked) return
      const key = event.key.toLowerCase()
      const map: Record<string, string> = { "1": "der", "2": "die", "3": "das" }
      if (map[key]) choose(map[key])
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, picked])

  if (!ready) return <Skeleton className="mx-auto mt-10 h-80 max-w-2xl rounded-xl" />

  function start(cards: ArticleCard[]) {
    setQueue(shuffle(cards).slice(0, ROUND))
    setIndex(0)
    setPicked(null)
    setStats({ correct: 0, wrong: 0 })
    setMissed([])
    setDone(false)
  }

  function choose(article: string) {
    if (!current || picked) return
    setPicked(article)
    const correct = article === current.article
    recordAnswer(current.setId, current.term.id, correct)
    setStats((prev) => ({ correct: prev.correct + (correct ? 1 : 0), wrong: prev.wrong + (correct ? 0 : 1) }))
    if (!correct) setMissed((prev) => [...prev, current])
    window.setTimeout(
      () => {
        setPicked(null)
        setIndex((prev) => {
          if (!queue || prev + 1 >= queue.length) {
            setDone(true)
            return prev
          }
          return prev + 1
        })
      },
      correct ? 450 : 1600,
    )
  }

  /* ---------- start / results ---------- */
  if (!queue || done) {
    const finished = done && queue
    const percent = stats.correct + stats.wrong ? Math.round((stats.correct / (stats.correct + stats.wrong)) * 100) : 0
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        {finished && <Confetti active={percent >= 80} />}
        <div className="text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-xl bg-primary/10 text-primary">
            <Zap className="size-6" />
          </span>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight">Тренажёр артиклей</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Артикль нужно знать вместе со словом. Быстрые подходы по {ROUND} существительных закрепляют род лучше, чем
            заучивание списком.
          </p>
        </div>

        {finished && (
          <div className="mt-6 rounded-2xl border-2 bg-card p-6 text-center">
            <Trophy className={cn("mx-auto size-10", percent >= 80 ? "text-accent" : "text-muted-foreground")} />
            <p className="mt-3 text-4xl font-extrabold">{percent}%</p>
            <p className="mt-1 text-sm font-bold text-muted-foreground">
              {stats.correct} из {stats.correct + stats.wrong} верно
            </p>
          </div>
        )}

        {finished && missed.length > 0 && (
          <div className="mt-6 space-y-2">
            <p className="text-sm font-bold">Повторите эти:</p>
            {missed.map((card, position) => (
              <div key={`${card.term.id}-${position}`} className="flex items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3">
                <span className="min-w-0">
                  <span className="font-extrabold" style={{ color: ARTICLE_COLORS[card.article] }}>
                    {card.article}
                  </span>{" "}
                  <span className="font-bold">{card.noun}</span>
                  <span className="block truncate text-xs text-muted-foreground">{card.term.definition}</span>
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 rounded-xl border bg-card p-5">
          <p className="font-extrabold">Доступно существительных: {pool.length}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Берутся из всех ваших модулей — всё, что записано как «der/die/das …».
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button size="lg" className="rounded-full px-6 font-bold" disabled={!pool.length} onClick={() => start(pool)}>
              {finished ? <RotateCcw className="size-4" /> : <Zap className="size-4" />}
              {finished ? "Ещё подход" : `Начать (${Math.min(pool.length, ROUND)} слов)`}
            </Button>
            {finished && missed.length > 0 && (
              <Button size="lg" variant="outline" className="rounded-full px-6 font-bold" onClick={() => start(missed)}>
                Только ошибки ({missed.length})
              </Button>
            )}
          </div>
        </div>

        {!pool.length && (
          <div className="mt-6 rounded-xl border border-dashed bg-card p-8 text-center">
            <p className="font-bold">Нет существительных с артиклем</p>
            <p className="mt-1 text-sm text-muted-foreground">Добавьте немецкие модули — тренажёр возьмёт слова оттуда.</p>
            <Button asChild className="mt-4 rounded-full font-bold">
              <Link href="/catalog">Готовый курс немецкого</Link>
            </Button>
          </div>
        )}

        <div className="mt-8 rounded-xl border bg-card p-5">
          <p className="font-extrabold">Подсказки по роду</p>
          <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
            {RULES.map((rule) => (
              <li key={rule.note}>
                <span className="font-bold" style={{ color: ARTICLE_COLORS[rule.article as "der" | "die" | "das"] }}>
                  {rule.article}
                </span>{" "}
                — {rule.note}
              </li>
            ))}
          </ul>
        </div>
      </div>
    )
  }

  /* ---------- drill ---------- */
  if (!current) return <Skeleton className="mx-auto mt-10 h-80 max-w-2xl rounded-xl" />
  const isCorrect = picked === current.article
  const hint = picked && !isCorrect ? ruleFor(current.noun, current.article) : null

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      <div className="mb-4 flex items-center justify-between text-sm font-bold">
        <span className="text-muted-foreground">Артикли</span>
        <span className="tabular-nums">
          {index + 1} / {queue.length}
        </span>
      </div>
      <div className="mb-6 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-primary transition-all" style={{ width: `${((index + 1) / queue.length) * 100}%` }} />
      </div>

      <div
        className={cn(
          "rounded-2xl border-2 bg-card p-8 text-center transition-colors",
          picked && isCorrect && "border-chart-2 bg-chart-2/10",
          picked && !isCorrect && "border-destructive bg-destructive/10",
        )}
      >
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => speak(`${current.article} ${current.noun}`, "de-DE")}
            aria-label="Озвучить"
          >
            <Volume2 className="size-4" />
          </Button>
        </div>
        <p className="text-3xl font-extrabold sm:text-4xl">
          {picked && (
            <span style={{ color: ARTICLE_COLORS[current.article] }}>{current.article} </span>
          )}
          {current.noun}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">{current.term.definition}</p>
        {hint && <p className="mt-3 rounded-lg bg-card px-3 py-2 text-sm font-semibold">{hint}</p>}
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        {ARTICLES.map((article, position) => {
          const chosen = picked === article
          const right = picked && article === current.article
          return (
            <button
              key={article}
              type="button"
              disabled={Boolean(picked)}
              onClick={() => choose(article)}
              className={cn(
                "flex h-24 flex-col items-center justify-center gap-1 rounded-2xl border-2 bg-card text-2xl font-extrabold transition-all",
                !picked && "hover:-translate-y-0.5 hover:shadow-md",
                right && "border-chart-2 bg-chart-2/10",
                chosen && !right && "animate-shake border-destructive bg-destructive/10",
              )}
              style={!picked ? { color: ARTICLE_COLORS[article] } : undefined}
            >
              {article}
              <span className="text-xs font-bold text-muted-foreground">{position + 1}</span>
              {right && <Check className="size-5 text-chart-2" />}
              {chosen && !right && <X className="size-5 text-destructive" />}
            </button>
          )
        })}
      </div>

      <div className="mt-6 flex justify-center gap-6 text-sm font-bold text-muted-foreground">
        <span className="text-chart-2">Верно: {stats.correct}</span>
        <span className="text-destructive">Ошибок: {stats.wrong}</span>
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        Клавиши 1, 2, 3 — быстрый выбор. {pool.length} {plural(pool.length, "слово", "слова", "слов")} в базе.
      </p>
    </div>
  )
}
