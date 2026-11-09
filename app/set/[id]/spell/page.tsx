"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Headphones, RotateCcw, Trophy, Volume2 } from "lucide-react"
import type { Term } from "@/lib/types"
import { useSet, useStore } from "@/lib/store"
import { gradeAnswer, shuffle } from "@/lib/text"
import { speak, stopSpeaking } from "@/lib/speech"
import { StudyShell } from "@/components/study-shell"
import { NotFoundSet } from "@/components/not-found-set"
import { EmptyPool } from "@/components/empty-pool"
import { Confetti } from "@/components/confetti"
import { VerdictBanner, WrittenInput, type Verdict } from "@/components/answer-ui"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

export default function SpellPage() {
  const params = useParams<{ id: string }>()
  const { ready, state, recordAnswer, completeRound } = useStore()
  const set = useSet(params.id)

  const [queue, setQueue] = React.useState<Term[]>([])
  const [index, setIndex] = React.useState(0)
  const [input, setInput] = React.useState("")
  const [verdict, setVerdict] = React.useState<Verdict>("idle")
  const [stats, setStats] = React.useState({ correct: 0, wrong: 0 })
  const [missed, setMissed] = React.useState<Term[]>([])
  const [done, setDone] = React.useState(false)
  const [supported, setSupported] = React.useState(true)

  React.useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window)
  }, [])

  const pool = set?.terms ?? []
  const current = queue[index]

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pool.length, set?.id],
  )

  React.useEffect(() => {
    if (ready && pool.length && !queue.length && !done) start()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, pool.length])

  // speak the prompt whenever a new card appears
  React.useEffect(() => {
    if (current && set && verdict === "idle") speak(current.term, set.termLang)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id])

  React.useEffect(() => () => stopSpeaking(), [])

  if (!ready) return <Skeleton className="mx-auto mt-16 h-80 max-w-3xl rounded-2xl" />
  if (!set) return <NotFoundSet />
  if (!pool.length)
    return (
      <StudyShell setId={set.id} title={set.title} subtitle="Диктант">
        <EmptyPool setId={set.id} starredOnly={false} />
      </StudyShell>
    )

  function submit() {
    if (!current || !set || verdict !== "idle") return
    const result = gradeAnswer(input, current.term, state.settings.accentInsensitive)
    const correct = result === "correct"
    setVerdict(correct ? "correct" : result === "typo" ? "typo" : "wrong")
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
      <StudyShell setId={set.id} title={set.title} subtitle="Диктант · итоги" progress={100}>
        <Confetti active={percent >= 80} />
        <div className="mx-auto max-w-lg px-4 py-14 text-center">
          <Trophy className={`mx-auto size-12 ${percent >= 80 ? "text-accent" : "text-muted-foreground"}`} />
          <h2 className="mt-4 text-2xl font-extrabold">Написано правильно: {percent}%</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {stats.correct} из {total} слов без ошибок
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
        </div>
      </StudyShell>
    )
  }

  if (!current) return <Skeleton className="mx-auto mt-16 h-80 max-w-3xl rounded-2xl" />

  return (
    <StudyShell
      setId={set.id}
      title={set.title}
      subtitle={`Диктант · ${index + 1} из ${queue.length}`}
      progress={((index + 1) / queue.length) * 100}
    >
      <div className="mx-auto max-w-2xl px-4 py-8">
        {!supported && (
          <div className="mb-6 rounded-xl border-2 border-destructive bg-destructive/10 p-4 text-sm font-semibold">
            Этот браузер не поддерживает синтез речи. Подсказка с текстом показана ниже.
          </div>
        )}

        <div className="rounded-2xl border-2 bg-card p-8 text-center">
          <Headphones className="mx-auto size-10 text-primary" />
          <p className="mt-4 text-sm font-bold uppercase tracking-wide text-muted-foreground">Послушайте и напишите</p>
          <Button
            size="lg"
            variant="outline"
            className="mt-5 h-14 rounded-full border-2 px-8 font-bold"
            onClick={() => speak(current.term, set.termLang)}
          >
            <Volume2 className="size-5" />
            Прослушать снова
          </Button>
          <p className="mt-4 text-sm text-muted-foreground">Подсказка: {current.definition}</p>
          {!supported && <p className="mt-2 text-lg font-bold">{current.term}</p>}
        </div>

        <div className="mt-6">
          <WrittenInput
            value={input}
            verdict={verdict}
            placeholder="Напишите, что услышали"
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
          <VerdictBanner verdict={verdict} correctAnswer={current.term} onNext={next} />
        </div>

        <div className="mt-6 flex justify-center gap-6 text-sm font-bold text-muted-foreground">
          <span className="text-chart-2">Верно: {stats.correct}</span>
          <span className="text-destructive">Ошибок: {stats.wrong}</span>
        </div>
      </div>
    </StudyShell>
  )
}
