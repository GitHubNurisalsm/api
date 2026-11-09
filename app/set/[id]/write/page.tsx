"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { RotateCcw, Settings2, Star, Trophy, Volume2 } from "lucide-react"
import type { Term } from "@/lib/types"
import { useSet, useStore } from "@/lib/store"
import { gradeAnswer, shuffle } from "@/lib/text"
import { speak } from "@/lib/speech"
import { StudyShell } from "@/components/study-shell"
import { NotFoundSet } from "@/components/not-found-set"
import { EmptyPool } from "@/components/empty-pool"
import { Confetti } from "@/components/confetti"
import { VerdictBanner, WrittenInput, type Verdict } from "@/components/answer-ui"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export default function WritePage() {
  const params = useParams<{ id: string }>()
  const { ready, state, recordAnswer, completeRound, toggleStar, updateSettings } = useStore()
  const set = useSet(params.id)

  const [starredOnly, setStarredOnly] = React.useState(false)
  const [askTermFirst, setAskTermFirst] = React.useState(true)
  const [queue, setQueue] = React.useState<Term[]>([])
  const [index, setIndex] = React.useState(0)
  const [input, setInput] = React.useState("")
  const [verdict, setVerdict] = React.useState<Verdict>("idle")
  const [stats, setStats] = React.useState({ correct: 0, wrong: 0 })
  const [missed, setMissed] = React.useState<Term[]>([])
  const [done, setDone] = React.useState(false)

  const pool = React.useMemo(() => {
    if (!set) return []
    return starredOnly ? set.terms.filter((term) => term.starred) : set.terms
  }, [set, starredOnly])

  const start = React.useCallback(
    (terms?: Term[]) => {
      setQueue(shuffle(terms ?? pool))
      setIndex(0)
      setInput("")
      setVerdict("idle")
      setStats({ correct: 0, wrong: 0 })
      setMissed([])
      setDone(false)
    },
    [pool],
  )

  React.useEffect(() => {
    if (ready && pool.length && !queue.length && !done) start()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, pool.length])

  if (!ready) return <Skeleton className="mx-auto mt-16 h-80 max-w-3xl rounded-2xl" />
  if (!set) return <NotFoundSet />
  if (!pool.length)
    return (
      <StudyShell setId={set.id} title={set.title} subtitle="Письмо">
        <EmptyPool setId={set.id} starredOnly={starredOnly} onShowAll={() => setStarredOnly(false)} />
      </StudyShell>
    )

  const current = queue[index]

  function submit() {
    if (!current || verdict !== "idle" || !set) return
    const expected = askTermFirst ? current.definition : current.term
    const result = gradeAnswer(input, expected, state.settings.accentInsensitive)
    const correct = result === "correct" || result === "typo"
    setVerdict(result)
    recordAnswer(set.id, current.id, correct)
    setStats((prev) => ({ correct: prev.correct + (correct ? 1 : 0), wrong: prev.wrong + (correct ? 0 : 1) }))
    if (!correct) setMissed((prev) => [...prev, current])
  }

  function next() {
    setInput("")
    setVerdict("idle")
    setIndex((prev) => {
      if (prev + 1 >= queue.length) {
        if (set) completeRound(set.id)
        setDone(true)
        return prev
      }
      return prev + 1
    })
  }

  if (done) {
    const total = stats.correct + stats.wrong
    const percent = total ? Math.round((stats.correct / total) * 100) : 0
    return (
      <StudyShell setId={set.id} title={set.title} subtitle="Письмо · итоги" progress={100}>
        <Confetti active={percent >= 80} />
        <div className="mx-auto max-w-lg px-4 py-14 text-center">
          <Trophy className={`mx-auto size-12 ${percent >= 80 ? "text-accent" : "text-muted-foreground"}`} />
          <h2 className="mt-4 text-2xl font-extrabold">Результат: {percent}%</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Верно {stats.correct} из {total}
          </p>
          <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
            {missed.length > 0 && (
              <Button className="rounded-full px-6 font-bold" onClick={() => start(missed)}>
                <RotateCcw className="size-4" />
                Повторить ошибки ({missed.length})
              </Button>
            )}
            <Button variant="outline" className="rounded-full px-6 font-bold" onClick={() => start()}>
              Пройти заново
            </Button>
            <Button asChild variant="ghost" className="rounded-full font-bold">
              <Link href={`/set/${set.id}`}>К модулю</Link>
            </Button>
          </div>

          {missed.length > 0 && (
            <div className="mt-8 space-y-2 text-left">
              <p className="text-sm font-bold">Над этим стоит поработать:</p>
              {missed.map((term) => (
                <div key={term.id} className="rounded-lg border bg-card px-4 py-3 text-sm">
                  <span className="font-bold">{term.term}</span>
                  <span className="text-muted-foreground"> — {term.definition}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </StudyShell>
    )
  }

  if (!current) return <Skeleton className="mx-auto mt-16 h-80 max-w-3xl rounded-2xl" />

  const prompt = askTermFirst ? current.term : current.definition
  const expected = askTermFirst ? current.definition : current.term
  const promptLang = askTermFirst ? set.termLang : set.defLang

  return (
    <StudyShell
      setId={set.id}
      title={set.title}
      subtitle={`Письмо · ${index + 1} из ${queue.length}`}
      progress={((index + 1) / queue.length) * 100}
      right={
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Параметры">
              <Settings2 className="size-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="ask-term" className="text-sm">
                Спрашивать термин
              </Label>
              <Switch
                id="ask-term"
                checked={askTermFirst}
                onCheckedChange={(checked) => {
                  setAskTermFirst(checked)
                  setVerdict("idle")
                  setInput("")
                }}
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="starred" className="text-sm">
                Только избранные
              </Label>
              <Switch
                id="starred"
                checked={starredOnly}
                onCheckedChange={(checked) => {
                  setStarredOnly(checked)
                  setQueue([])
                }}
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="accents" className="text-sm">
                Игнорировать диакритику
              </Label>
              <Switch
                id="accents"
                checked={state.settings.accentInsensitive}
                onCheckedChange={(checked) => updateSettings({ accentInsensitive: checked })}
              />
            </div>
            <p className="border-t pt-3 text-xs text-muted-foreground">
              Опечатка в 1–2 символа считается почти верным ответом. Несколько вариантов перевода разделяйте запятой или «/».
            </p>
          </PopoverContent>
        </Popover>
      }
    >
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="rounded-2xl border-2 bg-card p-6 sm:p-8">
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Напишите перевод или определение</p>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="size-8" onClick={() => speak(prompt, promptLang)} aria-label="Озвучить">
                <Volume2 className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={`size-8 ${current.starred ? "text-accent" : ""}`}
                onClick={() => toggleStar(set.id, current.id)}
                aria-label="В избранное"
              >
                <Star className={`size-4 ${current.starred ? "fill-current" : ""}`} />
              </Button>
            </div>
          </div>
          <p className="mt-5 min-h-[4rem] text-2xl font-bold leading-snug text-balance sm:text-3xl">{prompt}</p>
        </div>

        <div className="mt-6">
          <WrittenInput
            value={input}
            verdict={verdict}
            onChange={setInput}
            onSubmit={submit}
            onSkip={() => {
              if (!current || !set) return
              setVerdict("wrong")
              recordAnswer(set.id, current.id, false)
              setStats((prev) => ({ ...prev, wrong: prev.wrong + 1 }))
              setMissed((prev) => [...prev, current])
            }}
          />
          <VerdictBanner verdict={verdict} correctAnswer={expected} onNext={next} />
        </div>

        <div className="mt-6 flex justify-center gap-6 text-sm font-bold text-muted-foreground">
          <span className="text-chart-2">Верно: {stats.correct}</span>
          <span className="text-destructive">Ошибок: {stats.wrong}</span>
        </div>
      </div>
    </StudyShell>
  )
}
