"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Check, RotateCcw, Trophy, X } from "lucide-react"
import { toast } from "sonner"
import type { Term } from "@/lib/types"
import { useSet, useStore } from "@/lib/store"
import { gradeAnswer, pickRandom, shuffle } from "@/lib/text"
import { StudyShell } from "@/components/study-shell"
import { NotFoundSet } from "@/components/not-found-set"
import { EmptyPool } from "@/components/empty-pool"
import { Confetti } from "@/components/confetti"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

type QType = "written" | "choice" | "trueFalse" | "matching"

type Question =
  | { id: string; type: "written"; term: Term; prompt: string; answer: string }
  | { id: string; type: "choice"; term: Term; prompt: string; answer: string; options: string[] }
  | { id: string; type: "trueFalse"; term: Term; prompt: string; shown: string; isTrue: boolean }
  | { id: string; type: "matching"; terms: Term[]; options: string[] }

const TYPE_LABELS: Record<QType, string> = {
  written: "Письменный ответ",
  choice: "Выбор ответа",
  trueFalse: "Верно / неверно",
  matching: "Соотнесение",
}

export default function TestPage() {
  const params = useParams<{ id: string }>()
  const { ready, state, recordAnswer, recordTest } = useStore()
  const set = useSet(params.id)

  const [phase, setPhase] = React.useState<"setup" | "test" | "result">("setup")
  const [count, setCount] = React.useState(10)
  const [types, setTypes] = React.useState<Record<QType, boolean>>({ written: true, choice: true, trueFalse: true, matching: true })
  const [answerWithTerm, setAnswerWithTerm] = React.useState(false)
  const [starredOnly, setStarredOnly] = React.useState(false)

  const [questions, setQuestions] = React.useState<Question[]>([])
  const [answers, setAnswers] = React.useState<Record<string, string>>({})
  const [graded, setGraded] = React.useState<Record<string, boolean>>({})

  const pool = React.useMemo(() => {
    if (!set) return []
    return starredOnly ? set.terms.filter((term) => term.starred) : set.terms
  }, [set, starredOnly])

  React.useEffect(() => {
    setCount((value) => Math.min(Math.max(1, value), Math.max(1, pool.length)))
  }, [pool.length])

  if (!ready) return <Skeleton className="mx-auto mt-16 h-80 max-w-3xl rounded-2xl" />
  if (!set) return <NotFoundSet />
  if (!set.terms.length)
    return (
      <StudyShell setId={set.id} title={set.title} subtitle="Тест">
        <EmptyPool setId={set.id} starredOnly={false} />
      </StudyShell>
    )

  function buildTest() {
    const enabled = (Object.keys(types) as QType[]).filter((type) => types[type])
    if (!enabled.length) {
      toast.error("Выберите хотя бы один тип вопросов")
      return
    }
    if (!pool.length) {
      toast.error("Нет терминов для теста")
      return
    }

    const selected = shuffle(pool).slice(0, Math.min(count, pool.length))
    const promptOf = (term: Term) => (answerWithTerm ? term.definition : term.term)
    const answerOf = (term: Term) => (answerWithTerm ? term.term : term.definition)

    const built: Question[] = []
    let cursor = 0
    const matchingEnabled = enabled.includes("matching")
    const simpleTypes = enabled.filter((type) => type !== "matching")

    // One matching block of up to 5 pairs, when requested and there is room
    if (matchingEnabled && selected.length >= 4) {
      const blockSize = Math.min(5, selected.length, Math.max(4, Math.floor(selected.length / 2)))
      const block = selected.slice(0, blockSize)
      cursor = blockSize
      built.push({
        id: "match-block",
        type: "matching",
        terms: block,
        options: shuffle(block.map((term) => answerOf(term))),
      })
    }

    const rest = selected.slice(cursor)
    const cycle = simpleTypes.length ? simpleTypes : (["choice"] as QType[])
    rest.forEach((term, index) => {
      const type = cycle[index % cycle.length]
      if (type === "written") {
        built.push({ id: term.id, type: "written", term, prompt: promptOf(term), answer: answerOf(term) })
      } else if (type === "choice") {
        const distractors = pickRandom(pool, 3, (item) => item.id === term.id).map((item) => answerOf(item))
        built.push({
          id: term.id,
          type: "choice",
          term,
          prompt: promptOf(term),
          answer: answerOf(term),
          options: shuffle([answerOf(term), ...distractors]),
        })
      } else {
        const useTrue = Math.random() > 0.45
        const other = pickRandom(pool, 1, (item) => item.id === term.id)[0]
        const shown = useTrue || !other ? answerOf(term) : answerOf(other)
        built.push({ id: term.id, type: "trueFalse", term, prompt: promptOf(term), shown, isTrue: shown === answerOf(term) })
      }
    })

    setQuestions(built)
    setAnswers({})
    setGraded({})
    setPhase("test")
  }

  function gradeAll() {
    const results: Record<string, boolean> = {}
    let score = 0
    let total = 0

    for (const question of questions) {
      if (question.type === "matching") {
        question.terms.forEach((term) => {
          total += 1
          const expected = answerWithTerm ? term.term : term.definition
          const given = answers[`${question.id}:${term.id}`] ?? ""
          const ok = given === expected
          results[`${question.id}:${term.id}`] = ok
          if (ok) score += 1
          recordAnswer(set!.id, term.id, ok)
        })
        continue
      }
      total += 1
      const given = answers[question.id] ?? ""
      let ok = false
      if (question.type === "written") {
        const verdict = gradeAnswer(given, question.answer, state.settings.accentInsensitive)
        ok = verdict === "correct" || verdict === "typo"
      } else if (question.type === "choice") {
        ok = given === question.answer
      } else {
        ok = given === (question.isTrue ? "true" : "false")
      }
      results[question.id] = ok
      if (ok) score += 1
      recordAnswer(set!.id, question.term.id, ok)
    }

    setGraded(results)
    recordTest(set!.id, { date: Date.now(), score, total, mode: "test" })
    setPhase("result")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  /* ---------- setup ---------- */
  if (phase === "setup") {
    return (
      <StudyShell setId={set.id} title={set.title} subtitle="Тест">
        <div className="mx-auto max-w-xl px-4 py-10">
          <h2 className="text-2xl font-extrabold">Настройте тест</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            В модуле {set.terms.length} терминов{starredOnly && ` · избранных: ${pool.length}`}
          </p>

          <div className="mt-6 space-y-5 rounded-xl border bg-card p-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Количество вопросов</Label>
                <span className="font-bold tabular-nums">{Math.min(count, Math.max(1, pool.length))}</span>
              </div>
              <input
                type="range"
                min={1}
                max={Math.max(1, Math.min(50, pool.length))}
                value={Math.min(count, Math.max(1, pool.length))}
                onChange={(event) => setCount(Number(event.target.value))}
                className="w-full accent-primary"
              />
            </div>

            <div className="space-y-3">
              <Label>Типы вопросов</Label>
              {(Object.keys(TYPE_LABELS) as QType[]).map((type) => (
                <label key={type} className="flex cursor-pointer items-center gap-3 text-sm font-semibold">
                  <Checkbox checked={types[type]} onCheckedChange={(checked) => setTypes((prev) => ({ ...prev, [type]: Boolean(checked) }))} />
                  {TYPE_LABELS[type]}
                </label>
              ))}
            </div>

            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="with-term" className="text-sm">
                  Отвечать термином (а не определением)
                </Label>
                <Switch id="with-term" checked={answerWithTerm} onCheckedChange={setAnswerWithTerm} />
              </div>
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="starred" className="text-sm">
                  Только избранные термины
                </Label>
                <Switch id="starred" checked={starredOnly} onCheckedChange={setStarredOnly} />
              </div>
            </div>
          </div>

          <Button size="lg" className="mt-6 h-12 w-full rounded-full font-bold" onClick={buildTest}>
            Начать тест
          </Button>
        </div>
      </StudyShell>
    )
  }

  /* ---------- result ---------- */
  const totalQuestions = questions.reduce((sum, question) => sum + (question.type === "matching" ? question.terms.length : 1), 0)
  const correctCount = Object.values(graded).filter(Boolean).length
  const percent = totalQuestions ? Math.round((correctCount / totalQuestions) * 100) : 0
  const isResult = phase === "result"

  return (
    <StudyShell
      setId={set.id}
      title={set.title}
      subtitle={isResult ? `Результат: ${percent}%` : `Тест · ${totalQuestions} вопросов`}
      progress={isResult ? 100 : undefined}
    >
      {isResult && <Confetti active={percent >= 80} />}
      <div className="mx-auto max-w-2xl px-4 py-8">
        {isResult && (
          <div className="mb-8 rounded-2xl border-2 bg-card p-6 text-center">
            <Trophy className={cn("mx-auto size-10", percent >= 80 ? "text-accent" : "text-muted-foreground")} />
            <p className="mt-3 text-4xl font-extrabold">{percent}%</p>
            <p className="mt-1 text-sm font-bold text-muted-foreground">
              Верно {correctCount} из {totalQuestions}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Button className="rounded-full font-bold" onClick={buildTest}>
                <RotateCcw className="size-4" />
                Новый тест
              </Button>
              <Button variant="outline" className="rounded-full font-bold" onClick={() => setPhase("setup")}>
                Изменить настройки
              </Button>
              <Button asChild variant="ghost" className="rounded-full font-bold">
                <Link href={`/set/${set.id}/learn`}>Доучить слабые места</Link>
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-5">
          {questions.map((question, position) => (
            <div key={question.id} className="rounded-xl border bg-card p-5">
              {question.type === "matching" ? (
                <>
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Соотнесите пары</p>
                  <div className="mt-4 space-y-3">
                    {question.terms.map((term) => {
                      const key = `${question.id}:${term.id}`
                      const expected = answerWithTerm ? term.term : term.definition
                      const ok = graded[key]
                      return (
                        <div key={term.id} className="grid gap-2 sm:grid-cols-2 sm:items-center">
                          <p className="font-semibold">{answerWithTerm ? term.definition : term.term}</p>
                          <div>
                            <Select
                              value={answers[key] ?? ""}
                              disabled={isResult}
                              onValueChange={(value) => setAnswers((prev) => ({ ...prev, [key]: value }))}
                            >
                              <SelectTrigger
                                className={cn(
                                  "w-full",
                                  isResult && ok && "border-chart-2 bg-chart-2/10",
                                  isResult && ok === false && "border-destructive bg-destructive/10",
                                )}
                              >
                                <SelectValue placeholder="Выберите пару" />
                              </SelectTrigger>
                              <SelectContent>
                                {question.options.map((option) => (
                                  <SelectItem key={option} value={option}>
                                    {option}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {isResult && ok === false && <p className="mt-1 text-xs font-bold text-chart-2">Верно: {expected}</p>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      {position + 1}. {TYPE_LABELS[question.type]}
                    </p>
                    {isResult &&
                      (graded[question.id] ? <Check className="size-5 text-chart-2" /> : <X className="size-5 text-destructive" />)}
                  </div>
                  <p className="mt-3 text-lg font-bold leading-snug">
                    {question.type === "trueFalse" ? (
                      <>
                        {question.prompt} <span className="text-muted-foreground">—</span> {question.shown}?
                      </>
                    ) : (
                      question.prompt
                    )}
                  </p>

                  <div className="mt-4">
                    {question.type === "written" && (
                      <>
                        <Input
                          value={answers[question.id] ?? ""}
                          disabled={isResult}
                          placeholder="Ваш ответ"
                          autoComplete="off"
                          onChange={(event) => setAnswers((prev) => ({ ...prev, [question.id]: event.target.value }))}
                          className={cn(
                            "h-12 rounded-xl border-2 font-semibold",
                            isResult && graded[question.id] && "border-chart-2 bg-chart-2/10",
                            isResult && graded[question.id] === false && "border-destructive bg-destructive/10",
                          )}
                        />
                        {isResult && !graded[question.id] && (
                          <p className="mt-2 text-sm font-bold text-chart-2">Верно: {question.answer}</p>
                        )}
                      </>
                    )}

                    {question.type === "choice" && (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {question.options.map((option) => {
                          const picked = answers[question.id] === option
                          const correct = option === question.answer
                          return (
                            <button
                              key={option}
                              type="button"
                              disabled={isResult}
                              onClick={() => setAnswers((prev) => ({ ...prev, [question.id]: option }))}
                              className={cn(
                                "rounded-xl border-2 p-3 text-left font-semibold transition-colors",
                                picked && !isResult && "border-primary bg-primary/10",
                                !picked && !isResult && "hover:border-primary/60",
                                isResult && correct && "border-chart-2 bg-chart-2/10",
                                isResult && picked && !correct && "border-destructive bg-destructive/10",
                              )}
                            >
                              {option}
                            </button>
                          )
                        })}
                      </div>
                    )}

                    {question.type === "trueFalse" && (
                      <div className="flex gap-2">
                        {[
                          { value: "true", label: "Верно" },
                          { value: "false", label: "Неверно" },
                        ].map((option) => {
                          const picked = answers[question.id] === option.value
                          const correct = option.value === (question.isTrue ? "true" : "false")
                          return (
                            <button
                              key={option.value}
                              type="button"
                              disabled={isResult}
                              onClick={() => setAnswers((prev) => ({ ...prev, [question.id]: option.value }))}
                              className={cn(
                                "flex-1 rounded-xl border-2 p-3 font-bold transition-colors",
                                picked && !isResult && "border-primary bg-primary/10",
                                !picked && !isResult && "hover:border-primary/60",
                                isResult && correct && "border-chart-2 bg-chart-2/10",
                                isResult && picked && !correct && "border-destructive bg-destructive/10",
                              )}
                            >
                              {option.label}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {!isResult && (
          <div className="sticky bottom-4 mt-8">
            <Button size="lg" className="h-14 w-full rounded-full text-base font-bold shadow-lg" onClick={gradeAll}>
              Проверить ответы
            </Button>
          </div>
        )}
      </div>
    </StudyShell>
  )
}
