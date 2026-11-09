"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Play, RotateCcw, Timer, Trophy } from "lucide-react"
import { useSet, useStore } from "@/lib/store"
import { formatTime, shuffle } from "@/lib/text"
import { StudyShell } from "@/components/study-shell"
import { NotFoundSet } from "@/components/not-found-set"
import { EmptyPool } from "@/components/empty-pool"
import { Confetti } from "@/components/confetti"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

type Tile = { key: string; pairId: string; text: string; side: "term" | "definition" }

const PENALTY_MS = 1000

export default function MatchPage() {
  const params = useParams<{ id: string }>()
  const { ready, state, recordAnswer, recordMatch } = useStore()
  const set = useSet(params.id)

  const [phase, setPhase] = React.useState<"idle" | "playing" | "done">("idle")
  const [pairCount, setPairCount] = React.useState(6)
  const [tiles, setTiles] = React.useState<Tile[]>([])
  const [selected, setSelected] = React.useState<string | null>(null)
  const [matched, setMatched] = React.useState<Set<string>>(new Set())
  const [wrongKeys, setWrongKeys] = React.useState<string[]>([])
  const [penalty, setPenalty] = React.useState(0)
  const [startedAt, setStartedAt] = React.useState(0)
  const [elapsed, setElapsed] = React.useState(0)
  const [finalTime, setFinalTime] = React.useState(0)
  const [isRecord, setIsRecord] = React.useState(false)

  const maxPairs = Math.min(12, set?.terms.length ?? 0)

  React.useEffect(() => {
    if (maxPairs && pairCount > maxPairs) setPairCount(maxPairs)
  }, [maxPairs, pairCount])

  // ticking clock
  React.useEffect(() => {
    if (phase !== "playing") return
    const interval = window.setInterval(() => setElapsed(Date.now() - startedAt + penalty), 100)
    return () => window.clearInterval(interval)
  }, [phase, startedAt, penalty])

  function startGame() {
    if (!set) return
    const chosen = shuffle(set.terms).slice(0, Math.min(pairCount, set.terms.length))
    const built: Tile[] = chosen.flatMap((term) => [
      { key: `${term.id}-t`, pairId: term.id, text: term.term, side: "term" as const },
      { key: `${term.id}-d`, pairId: term.id, text: term.definition, side: "definition" as const },
    ])
    setTiles(shuffle(built))
    setMatched(new Set())
    setSelected(null)
    setWrongKeys([])
    setPenalty(0)
    setElapsed(0)
    setStartedAt(Date.now())
    setPhase("playing")
  }

  function clickTile(tile: Tile) {
    if (phase !== "playing" || matched.has(tile.pairId) || wrongKeys.length) return
    if (!selected) {
      setSelected(tile.key)
      return
    }
    if (selected === tile.key) {
      setSelected(null)
      return
    }
    const first = tiles.find((item) => item.key === selected)
    if (!first) {
      setSelected(tile.key)
      return
    }
    if (first.pairId === tile.pairId && first.side !== tile.side) {
      const nextMatched = new Set(matched).add(tile.pairId)
      setMatched(nextMatched)
      setSelected(null)
      if (set) recordAnswer(set.id, tile.pairId, true)
      if (nextMatched.size === tiles.length / 2) {
        const total = Date.now() - startedAt + penalty
        setFinalTime(total)
        setElapsed(total)
        setPhase("done")
        if (set) setIsRecord(recordMatch(set.id, total))
      }
    } else {
      setWrongKeys([selected, tile.key])
      setPenalty((value) => value + PENALTY_MS)
      if (set) recordAnswer(set.id, first.pairId, false)
      window.setTimeout(() => {
        setWrongKeys([])
        setSelected(null)
      }, 480)
    }
  }

  if (!ready) return <Skeleton className="mx-auto mt-16 h-80 max-w-4xl rounded-2xl" />
  if (!set) return <NotFoundSet />
  if (set.terms.length < 2)
    return (
      <StudyShell setId={set.id} title={set.title} subtitle="Подбор">
        <EmptyPool setId={set.id} starredOnly={false} message="Для игры нужно минимум 2 термина." />
      </StudyShell>
    )

  const best = state.progress[set.id]?.bestMatchTime ?? null

  if (phase === "idle") {
    return (
      <StudyShell setId={set.id} title={set.title} subtitle="Подбор">
        <div className="mx-auto max-w-lg px-4 py-14 text-center">
          <Timer className="mx-auto size-12 text-primary" />
          <h2 className="mt-4 text-2xl font-extrabold">Игра «Подбор»</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Соедините термины с определениями как можно быстрее. За ошибку — штраф 1 секунда.
          </p>
          {best !== null && (
            <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent/20 px-4 py-1.5 text-sm font-bold text-accent-foreground dark:text-accent">
              <Trophy className="size-4" />
              Ваш рекорд: {formatTime(best)}
            </p>
          )}

          <div className="mt-8 space-y-2 text-left">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold">Пар в игре</span>
              <span className="font-bold tabular-nums">{pairCount}</span>
            </div>
            <input
              type="range"
              min={2}
              max={Math.max(2, maxPairs)}
              value={pairCount}
              onChange={(event) => setPairCount(Number(event.target.value))}
              className="w-full accent-primary"
            />
            <p className="text-xs text-muted-foreground">Доступно терминов: {set.terms.length}</p>
          </div>

          <Button size="lg" className="mt-8 h-14 w-full rounded-full text-base font-bold" onClick={startGame}>
            <Play className="size-5" />
            Начать игру
          </Button>
        </div>
      </StudyShell>
    )
  }

  if (phase === "done") {
    return (
      <StudyShell setId={set.id} title={set.title} subtitle="Подбор · итоги" progress={100}>
        <Confetti active />
        <div className="mx-auto max-w-lg px-4 py-14 text-center">
          <Trophy className="mx-auto size-12 text-accent" />
          <h2 className="mt-4 text-2xl font-extrabold">{isRecord ? "Новый рекорд!" : "Готово!"}</h2>
          <p className="mt-3 text-5xl font-extrabold tabular-nums text-primary">{formatTime(finalTime)}</p>
          {penalty > 0 && <p className="mt-2 text-sm text-muted-foreground">Включая штраф {formatTime(penalty)} за ошибки</p>}
          {best !== null && !isRecord && <p className="mt-2 text-sm text-muted-foreground">Рекорд: {formatTime(best)}</p>}

          <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button className="rounded-full px-6 font-bold" onClick={startGame}>
              <RotateCcw className="size-4" />
              Ещё раз
            </Button>
            <Button variant="outline" className="rounded-full px-6 font-bold" onClick={() => setPhase("idle")}>
              Изменить количество пар
            </Button>
            <Button asChild variant="ghost" className="rounded-full font-bold">
              <Link href={`/set/${set.id}`}>К модулю</Link>
            </Button>
          </div>
        </div>
      </StudyShell>
    )
  }

  return (
    <StudyShell
      setId={set.id}
      title={set.title}
      subtitle={`Подбор · осталось пар: ${tiles.length / 2 - matched.size}`}
      progress={(matched.size / (tiles.length / 2)) * 100}
      right={
        <span className="rounded-full bg-secondary px-3 py-1 text-sm font-bold tabular-nums text-secondary-foreground">
          {formatTime(elapsed)}
        </span>
      }
    >
      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {tiles.map((tile) => {
            const isMatched = matched.has(tile.pairId)
            const isSelected = selected === tile.key
            const isWrong = wrongKeys.includes(tile.key)
            return (
              <button
                key={tile.key}
                type="button"
                onClick={() => clickTile(tile)}
                disabled={isMatched}
                className={cn(
                  "flex min-h-[7rem] items-center justify-center rounded-xl border-2 bg-card p-3 text-center text-sm font-semibold transition-all",
                  !isMatched && "hover:-translate-y-0.5 hover:border-primary hover:shadow-md",
                  isSelected && "border-primary bg-primary/10 ring-2 ring-primary/30",
                  isWrong && "animate-shake border-destructive bg-destructive/10",
                  isMatched && "pointer-events-none scale-95 opacity-0",
                )}
              >
                <span className="line-clamp-4 break-words">{tile.text}</span>
              </button>
            )
          })}
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">Нажмите на термин, затем на его определение</p>
      </div>
    </StudyShell>
  )
}
