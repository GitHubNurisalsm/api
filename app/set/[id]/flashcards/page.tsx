"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft, ArrowRight, Check, Pause, Play, RotateCcw, Settings2, Shuffle, Star, X } from "lucide-react"
import { toast } from "sonner"
import { useSet, useStore } from "@/lib/store"
import { shuffle } from "@/lib/text"
import { stopSpeaking } from "@/lib/speech"
import { Flashcard } from "@/components/flashcard"
import { StudyShell } from "@/components/study-shell"
import { NotFoundSet } from "@/components/not-found-set"
import { Confetti } from "@/components/confetti"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export default function FlashcardsPage() {
  const params = useParams<{ id: string }>()
  const { ready, state, toggleStar, recordAnswer, completeRound, updateSettings } = useStore()
  const set = useSet(params.id)

  const [starredOnly, setStarredOnly] = React.useState(false)
  const [shuffled, setShuffled] = React.useState(false)
  const [autoplay, setAutoplay] = React.useState(false)
  const [index, setIndex] = React.useState(0)
  const [flipped, setFlipped] = React.useState(false)
  const [known, setKnown] = React.useState<Set<string>>(new Set())
  const [unknown, setUnknown] = React.useState<Set<string>>(new Set())
  const [finished, setFinished] = React.useState(false)
  const [seed, setSeed] = React.useState(0)

  const pool = React.useMemo(() => {
    if (!set) return []
    const base = starredOnly ? set.terms.filter((term) => term.starred) : set.terms
    return shuffled ? shuffle(base) : base
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [set, starredOnly, shuffled, seed])

  const current = pool[index]

  const next = React.useCallback(() => {
    setFlipped(false)
    stopSpeaking()
    setIndex((prev) => {
      if (prev + 1 >= pool.length) {
        setFinished(true)
        return prev
      }
      return prev + 1
    })
  }, [pool.length])

  const prev = React.useCallback(() => {
    setFlipped(false)
    stopSpeaking()
    setIndex((value) => Math.max(0, value - 1))
  }, [])

  function mark(isKnown: boolean) {
    if (!current || !set) return
    recordAnswer(set.id, current.id, isKnown)
    if (isKnown) {
      setKnown((prev) => new Set(prev).add(current.id))
      setUnknown((prev) => {
        const copy = new Set(prev)
        copy.delete(current.id)
        return copy
      })
    } else {
      setUnknown((prev) => new Set(prev).add(current.id))
    }
    next()
  }

  // keyboard shortcuts
  React.useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === " " || event.key === "Enter") {
        event.preventDefault()
        setFlipped((value) => !value)
      } else if (event.key === "ArrowRight") {
        event.preventDefault()
        next()
      } else if (event.key === "ArrowLeft") {
        event.preventDefault()
        prev()
      } else if (event.key.toLowerCase() === "s" && current && set) {
        toggleStar(set.id, current.id)
      } else if (event.key === "1") {
        mark(false)
      } else if (event.key === "2") {
        mark(true)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [next, prev, current, set])

  // autoplay: flip after half the delay, advance after the full delay
  React.useEffect(() => {
    if (!autoplay || finished || !pool.length) return
    const delay = state.settings.autoplayDelay * 1000
    const flipTimer = window.setTimeout(() => setFlipped(true), delay / 2)
    const nextTimer = window.setTimeout(() => next(), delay)
    return () => {
      window.clearTimeout(flipTimer)
      window.clearTimeout(nextTimer)
    }
  }, [autoplay, index, finished, pool.length, state.settings.autoplayDelay, next])

  React.useEffect(() => () => stopSpeaking(), [])

  if (!ready) return <Skeleton className="mx-auto mt-16 h-80 max-w-3xl rounded-2xl" />
  if (!set) return <NotFoundSet />

  if (!pool.length) {
    return (
      <StudyShell setId={set.id} title={set.title} subtitle="Карточки">
        <div className="mx-auto max-w-md px-4 py-24 text-center">
          <Star className="mx-auto size-10 text-muted-foreground" />
          <p className="mt-4 font-bold">Нет карточек для показа</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {starredOnly ? "В этом модуле нет избранных терминов." : "Добавьте термины в модуль."}
          </p>
          {starredOnly ? (
            <Button className="mt-5 rounded-full font-bold" onClick={() => setStarredOnly(false)}>
              Показать все
            </Button>
          ) : (
            <Button asChild className="mt-5 rounded-full font-bold">
              <Link href={`/set/${set.id}/edit`}>Добавить термины</Link>
            </Button>
          )}
        </div>
      </StudyShell>
    )
  }

  if (finished) {
    const total = known.size + unknown.size
    return (
      <StudyShell setId={set.id} title={set.title} subtitle="Карточки · итоги" progress={100}>
        <Confetti active={known.size > 0 && known.size >= unknown.size} />
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <h2 className="text-2xl font-extrabold">Вы просмотрели все карточки</h2>
          {total > 0 && (
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="rounded-xl border bg-card p-5">
                <p className="text-3xl font-extrabold text-chart-2">{known.size}</p>
                <p className="mt-1 text-sm font-bold text-muted-foreground">Знаю</p>
              </div>
              <div className="rounded-xl border bg-card p-5">
                <p className="text-3xl font-extrabold text-destructive">{unknown.size}</p>
                <p className="mt-1 text-sm font-bold text-muted-foreground">Повторить</p>
              </div>
            </div>
          )}
          <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
            {unknown.size > 0 && (
              <Button
                className="rounded-full font-bold"
                onClick={() => {
                  const ids = unknown
                  setStarredOnly(false)
                  setIndex(0)
                  setFinished(false)
                  setKnown(new Set())
                  setUnknown(new Set())
                  toast.success(`Повторяем ${ids.size} сложных карточек`)
                  setSeed((value) => value + 1)
                }}
              >
                <RotateCcw className="size-4" />
                Повторить сложные
              </Button>
            )}
            <Button
              variant="outline"
              className="rounded-full font-bold"
              onClick={() => {
                completeRound(set.id)
                setIndex(0)
                setFinished(false)
                setKnown(new Set())
                setUnknown(new Set())
                setSeed((value) => value + 1)
              }}
            >
              Начать заново
            </Button>
            <Button asChild variant="ghost" className="rounded-full font-bold">
              <Link href={`/set/${set.id}/learn`}>Перейти к заучиванию</Link>
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
      subtitle={`Карточка ${index + 1} из ${pool.length}`}
      progress={((index + 1) / pool.length) * 100}
      right={
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setAutoplay((value) => !value)}
            aria-label={autoplay ? "Остановить автопрокрутку" : "Автопрокрутка"}
          >
            {autoplay ? <Pause className="size-5" /> : <Play className="size-5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setShuffled((value) => !value)
              setIndex(0)
              setFlipped(false)
              setSeed((value) => value + 1)
            }}
            aria-label="Перемешать"
          >
            <Shuffle className={cn("size-5", shuffled && "text-primary")} />
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Настройки режима">
                <Settings2 className="size-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="starred-only" className="text-sm">
                  Только избранные
                </Label>
                <Switch
                  id="starred-only"
                  checked={starredOnly}
                  onCheckedChange={(checked) => {
                    setStarredOnly(checked)
                    setIndex(0)
                    setFlipped(false)
                  }}
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="front-term" className="text-sm">
                  Сначала термин
                </Label>
                <Switch
                  id="front-term"
                  checked={state.settings.frontIsTerm}
                  onCheckedChange={(checked) => updateSettings({ frontIsTerm: checked })}
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="tts" className="text-sm">
                  Кнопка озвучки
                </Label>
                <Switch id="tts" checked={state.settings.ttsEnabled} onCheckedChange={(checked) => updateSettings({ ttsEnabled: checked })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Пауза автопрокрутки: {state.settings.autoplayDelay} с</Label>
                <input
                  type="range"
                  min={2}
                  max={12}
                  value={state.settings.autoplayDelay}
                  onChange={(event) => updateSettings({ autoplayDelay: Number(event.target.value) })}
                  className="w-full accent-primary"
                />
              </div>
              <p className="border-t pt-3 text-xs text-muted-foreground">
                Горячие клавиши: <b>Пробел</b> — перевернуть, <b>←/→</b> — листать, <b>S</b> — звезда, <b>1/2</b> — не знаю / знаю.
              </p>
            </PopoverContent>
          </Popover>
        </div>
      }
    >
      <div className="mx-auto max-w-3xl px-4 py-8">
        {current && (
          <Flashcard
            term={current}
            flipped={flipped}
            frontIsTerm={state.settings.frontIsTerm}
            termLang={set.termLang}
            defLang={set.defLang}
            ttsEnabled={state.settings.ttsEnabled}
            onFlip={() => setFlipped((value) => !value)}
            onStar={() => toggleStar(set.id, current.id)}
          />
        )}

        <div className="mt-6 flex items-center justify-center gap-3">
          <Button variant="outline" size="lg" className="h-14 flex-1 rounded-xl border-2 font-bold hover:border-destructive hover:text-destructive" onClick={() => mark(false)}>
            <X className="size-5" />
            Повторить
          </Button>
          <Button variant="outline" size="icon" className="size-12 rounded-full" onClick={prev} aria-label="Назад" disabled={index === 0}>
            <ArrowLeft className="size-5" />
          </Button>
          <Button variant="outline" size="icon" className="size-12 rounded-full" onClick={next} aria-label="Вперёд">
            <ArrowRight className="size-5" />
          </Button>
          <Button variant="outline" size="lg" className="h-14 flex-1 rounded-xl border-2 font-bold hover:border-chart-2 hover:text-chart-2" onClick={() => mark(true)}>
            <Check className="size-5" />
            Знаю
          </Button>
        </div>

        <div className="mt-4 flex justify-center gap-6 text-sm font-bold text-muted-foreground">
          <span>Знаю: {known.size}</span>
          <span>Повторить: {unknown.size}</span>
        </div>
      </div>
    </StudyShell>
  )
}
