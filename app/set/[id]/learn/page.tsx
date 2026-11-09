"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowRight, Settings2, Sparkles, Star, Trophy, Volume2 } from "lucide-react"
import type { Term } from "@/lib/types"
import { useSet, useStore } from "@/lib/store"
import { buildLearnRound, cardOf, masteryFor, MAX_BOX } from "@/lib/srs"
import { gradeAnswer, pickRandom, shuffle } from "@/lib/text"
import { speak } from "@/lib/speech"
import { StudyShell } from "@/components/study-shell"
import { NotFoundSet } from "@/components/not-found-set"
import { EmptyPool } from "@/components/empty-pool"
import { Confetti } from "@/components/confetti"
import { ChoiceGrid, VerdictBanner, WrittenInput, type Verdict } from "@/components/answer-ui"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type Question = { term: Term; kind: "choice" | "written" }

export default function LearnPage() {
  const params = useParams<{ id: string }>()
  const { ready, state, recordAnswer, completeRound, toggleStar, updateSettings, getProgress } = useStore()
  const set = useSet(params.id)

  const [starredOnly, setStarredOnly] = React.useState(false)
  const [askTermFirst, setAskTermFirst] = React.useState(true)
  const [queue, setQueue] = React.useState<Question[]>([])
  const [roundIndex, setRoundIndex] = React.useState(0)
  const [roundNumber, setRoundNumber] = React.useState(1)
  const [input, setInput] = React.useState("")
  const [verdict, setVerdict] = React.useState<Verdict>("idle")
  const [picked, setPicked] = React.useState<string | null>(null)
  const [roundStats, setRoundStats] = React.useState({ correct: 0, wrong: 0 })
  const [phase, setPhase] = React.useState<"question" | "roundEnd" | "done">("question")

  const pool = React.useMemo(() => {
    if (!set) return []
    return starredOnly ? set.terms.filter((term) => term.starred) : set.terms
  }, [set, starredOnly])

  const buildQuestion = React.useCallback(
    (term: Term): Question => {
      const card = cardOf(set ? getProgress(set.id) : undefined, term.id)
      const mode = state.settings.learnMode
      if (mode === "choice") return { term, kind: "choice" }
      if (mode === "written") return { term, kind: "written" }
      return { term, kind: card.box >= 2 ? "written" : "choice" }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [set?.id, state.settings.learnMode, state.progress],
  )

  const startRound = React.useCallback(() => {
    if (!set || !pool.length) return
    const progress = getProgress(set.id)
    const round = buildLearnRound(pool, progress, 7)
    setQueue(round.map(buildQuestion))
    setRoundIndex(0)
    setRoundStats({ correct: 0, wrong: 0 })
    setInput("")
    setVerdict("idle")
    setPicked(null)
    setPhase("question")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [set?.id, pool, buildQuestion])

  // first round
  React.useEffect(() => {
    if (ready && set && pool.length && !queue.length && phase === "question") startRound()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, set?.id, pool.length])

  const question = queue[roundIndex]
  const options = React.useMemo(() => {
    if (!question || question.kind !== "choice" || !set) return []
    const answerText = askTermFirst ? question.term.definition : question.term.term
    const distractors = pickRandom(set.terms, 3, (term) => term.id === question.term.id)
    const all = [
      { id: question.term.id, label: answerText },
      ...distractors.map((term) => ({ id: term.id, label: askTermFirst ? term.definition : term.term })),
    ]
    return shuffle(all)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question?.term.id, askTermFirst, set?.id, roundIndex])

  function advance(correct: boolean) {
    if (!set || !question) return
    recordAnswer(set.id, question.term.id, correct)
    setRoundStats((prev) => ({ correct: prev.correct + (correct ? 1 : 0), wrong: prev.wrong + (correct ? 0 : 1) }))
    if (!correct) {
      // Quizlet re-asks a missed card later in the same round
      setQueue((prev) => [...prev, { term: question.term, kind: "choice" }])
    }
  }

  function goNext() {
    setInput("")
    setVerdict("idle")
    setPicked(null)
    setRoundIndex((prev) => {
      if (prev + 1 >= queue.length) {
        setPhase("roundEnd")
        return prev
      }
      return prev + 1
    })
  }

  function submitWritten() {
    if (!question || verdict !== "idle") return
    const expected = askTermFirst ? question.term.definition : question.term.term
    const result = gradeAnswer(input, expected, state.settings.accentInsensitive)
    const correct = result === "correct" || result === "typo"
    setVerdict(result)
    advance(correct)
  }

  function selectChoice(id: string) {
    if (!question || verdict !== "idle") return
    setPicked(id)
    const correct = id === question.term.id
    setVerdict(correct ? "correct" : "wrong")
    advance(correct)
    if (correct) window.setTimeout(() => goNext(), 550)
  }

  // digit shortcuts for choices
  React.useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!question || question.kind !== "choice" || verdict !== "idle") {
        if (verdict !== "idle" && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault()
          goNext()
        }
        return
      }
      const digit = Number(event.key)
      if (digit >= 1 && digit <= options.length) selectChoice(options[digit - 1].id)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question, verdict, options])

  if (!ready) return <Skeleton className="mx-auto mt-16 h-80 max-w-3xl rounded-2xl" />
  if (!set) return <NotFoundSet />

  if (!pool.length) {
    return (
      <StudyShell setId={set.id} title={set.title} subtitle="Заучивание">
        <EmptyPool setId={set.id} starredOnly={starredOnly} onShowAll={() => setStarredOnly(false)} />
      </StudyShell>
    )
  }

  const progress = getProgress(set.id)
  const mastery = masteryFor({ ...set, terms: pool }, progress)
  const allMastered = pool.every((term) => cardOf(progress, term.id).box >= MAX_BOX)

  if (phase === "roundEnd" || phase === "done") {
    return (
      <StudyShell setId={set.id} title={set.title} subtitle={`Раунд ${roundNumber} завершён`} progress={mastery.percent}>
        <Confetti active={allMastered} />
        <div className="mx-auto max-w-lg px-4 py-14 text-center">
          {allMastered ? (
            <>
              <Trophy className="mx-auto size-12 text-accent" />
              <h2 className="mt-4 text-2xl font-extrabold">Модуль освоен на 100%</h2>
              <p className="mt-2 text-sm text-muted-foreground">Все {pool.length} терминов в долговременной памяти. Проверьте себя тестом.</p>
            </>
          ) : (
            <>
              <Sparkles className="mx-auto size-12 text-primary" />
              <h2 className="mt-4 text-2xl font-extrabold">Раунд {roundNumber} завершён</h2>
              <p className="mt-2 text-sm text-muted-foreground">Освоено материала: {mastery.percent}%</p>
            </>
          )}

          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="rounded-xl border bg-card p-5">
              <p className="text-3xl font-extrabold text-chart-2">{roundStats.correct}</p>
              <p className="mt-1 text-sm font-bold text-muted-foreground">Верно</p>
            </div>
            <div className="rounded-xl border bg-card p-5">
              <p className="text-3xl font-extrabold text-destructive">{roundStats.wrong}</p>
              <p className="mt-1 text-sm font-bold text-muted-foreground">С ошибкой</p>
            </div>
          </div>

          <div className="mt-6 flex h-2.5 overflow-hidden rounded-full bg-muted">
            <div className="bg-chart-2" style={{ width: `${(mastery.mastered / mastery.total) * 100}%` }} />
            <div className="bg-primary" style={{ width: `${(mastery.familiar / mastery.total) * 100}%` }} />
            <div className="bg-accent" style={{ width: `${(mastery.learning / mastery.total) * 100}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Выучено {mastery.mastered} · знакомо {mastery.familiar} · изучается {mastery.learning} · новое {mastery.notStudied}
          </p>

          <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
            {!allMastered && (
              <Button
                className="rounded-full px-6 font-bold"
                onClick={() => {
                  completeRound(set.id)
                  setRoundNumber((value) => value + 1)
                  startRound()
                }}
              >
                Следующий раунд
                <ArrowRight className="size-4" />
              </Button>
            )}
            <Button asChild variant={allMastered ? "default" : "outline"} className="rounded-full px-6 font-bold">
              <Link href={`/set/${set.id}/test`}>Пройти тест</Link>
            </Button>
            <Button asChild variant="ghost" className="rounded-full font-bold">
              <Link href={`/set/${set.id}`}>К модулю</Link>
            </Button>
          </div>
        </div>
      </StudyShell>
    )
  }

  if (!question) return <Skeleton className="mx-auto mt-16 h-80 max-w-3xl rounded-2xl" />

  const prompt = askTermFirst ? question.term.term : question.term.definition
  const expected = askTermFirst ? question.term.definition : question.term.term
  const promptLang = askTermFirst ? set.termLang : set.defLang
  const card = cardOf(progress, question.term.id)

  return (
    <StudyShell
      setId={set.id}
      title={set.title}
      subtitle={`Заучивание · раунд ${roundNumber} · ${roundIndex + 1}/${queue.length}`}
      progress={((roundIndex + 1) / queue.length) * 100}
      right={
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Параметры">
              <Settings2 className="size-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm">Тип вопросов</Label>
              <Select value={state.settings.learnMode} onValueChange={(value) => updateSettings({ learnMode: value as typeof state.settings.learnMode })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mixed">Смешанные (адаптивно)</SelectItem>
                  <SelectItem value="choice">Только выбор ответа</SelectItem>
                  <SelectItem value="written">Только ввод с клавиатуры</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="ask-term" className="text-sm">
                Спрашивать термин
              </Label>
              <Switch id="ask-term" checked={askTermFirst} onCheckedChange={setAskTermFirst} />
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
          </PopoverContent>
        </Popover>
      }
    >
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="rounded-2xl border-2 bg-card p-6 sm:p-8">
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {question.kind === "choice" ? "Выберите верный ответ" : "Введите ответ"}
              {card.box > 0 && <span className="ml-2 text-primary">уровень {card.box}/{MAX_BOX}</span>}
            </p>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="size-8" onClick={() => speak(prompt, promptLang)} aria-label="Озвучить">
                <Volume2 className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={`size-8 ${question.term.starred ? "text-accent" : ""}`}
                onClick={() => toggleStar(set.id, question.term.id)}
                aria-label="В избранное"
              >
                <Star className={`size-4 ${question.term.starred ? "fill-current" : ""}`} />
              </Button>
            </div>
          </div>
          <p className="mt-5 min-h-[4rem] text-2xl font-bold leading-snug text-balance sm:text-3xl">{prompt}</p>
        </div>

        <div className="mt-6">
          {question.kind === "choice" ? (
            <ChoiceGrid options={options} answerId={question.term.id} selectedId={picked} disabled={verdict !== "idle"} onSelect={selectChoice} />
          ) : (
            <WrittenInput
              value={input}
              verdict={verdict}
              onChange={setInput}
              onSubmit={submitWritten}
              onSkip={() => {
                setVerdict("wrong")
                advance(false)
              }}
            />
          )}
        </div>

        {(question.kind === "written" || verdict === "wrong") && (
          <VerdictBanner verdict={verdict} correctAnswer={expected} onNext={goNext} />
        )}
      </div>
    </StudyShell>
  )
}
