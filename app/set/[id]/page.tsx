"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Copy,
  Gamepad2,
  GraduationCap,
  Keyboard,
  Layers,
  Pencil,
  RotateCcw,
  Share2,
  Shuffle,
  Star,
  Timer,
  Trash2,
  Volume2,
} from "lucide-react"
import { toast } from "sonner"
import { useSet, useStore } from "@/lib/store"
import { cardOf, masteryFor } from "@/lib/srs"
import { formatTime, plural, shuffle } from "@/lib/text"
import { speak } from "@/lib/speech"
import { Flashcard } from "@/components/flashcard"
import { NotFoundSet } from "@/components/not-found-set"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

const MODES = [
  { slug: "flashcards", label: "Карточки", icon: Layers },
  { slug: "learn", label: "Заучивание", icon: GraduationCap },
  { slug: "write", label: "Письмо", icon: Keyboard },
  { slug: "spell", label: "Диктант", icon: Volume2 },
  { slug: "test", label: "Тест", icon: BookOpen },
  { slug: "match", label: "Подбор", icon: Gamepad2 },
]

export default function SetPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { ready, getProgress, toggleStar, starAll, deleteSet, duplicateSet, resetProgress, touchRecent, state } = useStore()
  const set = useSet(params.id)

  const [index, setIndex] = React.useState(0)
  const [flipped, setFlipped] = React.useState(false)
  const [order, setOrder] = React.useState<string[] | null>(null)

  React.useEffect(() => {
    if (set) touchRecent(set.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [set?.id])

  if (!ready) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-8">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-80 w-full rounded-2xl" />
      </div>
    )
  }
  if (!set) return <NotFoundSet />

  const progress = getProgress(set.id)
  const mastery = masteryFor(set, progress)
  const folder = state.folders.find((item) => item.id === set.folderId)
  const terms = order ? (order.map((id) => set.terms.find((term) => term.id === id)).filter(Boolean) as typeof set.terms) : set.terms
  const current = terms[Math.min(index, terms.length - 1)]
  const starredCount = set.terms.filter((term) => term.starred).length

  function go(step: number) {
    setFlipped(false)
    setIndex((prev) => {
      const next = prev + step
      if (next < 0) return terms.length - 1
      if (next >= terms.length) return 0
      return next
    })
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2 font-bold text-muted-foreground">
        <Link href="/library">
          <ArrowLeft className="size-4" />
          Библиотека
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight text-balance sm:text-3xl">{set.title}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {set.terms.length} {plural(set.terms.length, "термин", "термина", "терминов")}
            {folder && <> · папка «{folder.name}»</>}
            {progress.bestMatchTime && <> · лучший «Подбор»: {formatTime(progress.bestMatchTime)}</>}
          </p>
          {set.description && <p className="mt-2 max-w-2xl text-sm">{set.description}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm" className="font-bold">
            <Link href={`/set/${set.id}/edit`}>
              <Pencil className="size-4" />
              Изменить
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="font-bold"
            onClick={() => {
              const id = duplicateSet(set.id)
              if (id) {
                toast.success("Копия создана")
                router.push(`/set/${id}`)
              }
            }}
          >
            <Copy className="size-4" />
            Копия
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="font-bold"
            onClick={async () => {
              const text = set.terms.map((term) => `${term.term} - ${term.definition}`).join("\n")
              try {
                await navigator.clipboard.writeText(text)
                toast.success("Список скопирован в буфер обмена")
              } catch {
                toast.error("Браузер не дал доступ к буферу обмена")
              }
            }}
          >
            <Share2 className="size-4" />
            Экспорт
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="font-bold text-destructive hover:text-destructive">
                <Trash2 className="size-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Удалить модуль?</AlertDialogTitle>
                <AlertDialogDescription>
                  «{set.title}» и весь прогресс по нему будут удалены. Действие нельзя отменить.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Отмена</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    deleteSet(set.id)
                    router.push("/library")
                  }}
                >
                  Удалить
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Study modes */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {MODES.map((mode) => (
          <Link
            key={mode.slug}
            href={`/set/${set.id}/${mode.slug}`}
            className="flex flex-col items-center gap-2 rounded-xl border bg-card px-3 py-4 font-bold transition-all hover:-translate-y-0.5 hover:border-primary hover:text-primary hover:shadow-md"
          >
            <mode.icon className="size-6" />
            <span className="text-sm">{mode.label}</span>
          </Link>
        ))}
      </div>

      {/* Mastery */}
      <div className="mt-6 rounded-xl border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-muted-foreground">Освоено материала</p>
            <p className="text-3xl font-extrabold">{mastery.percent}%</p>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <Stat label="Выучено" value={mastery.mastered} color="bg-chart-2" />
            <Stat label="Знакомо" value={mastery.familiar} color="bg-primary" />
            <Stat label="Изучается" value={mastery.learning} color="bg-accent" />
            <Stat label="Не начато" value={mastery.notStudied} color="bg-muted-foreground/40" />
          </div>
          <Button variant="ghost" size="sm" className="font-bold" onClick={() => {
            resetProgress(set.id)
            toast.success("Прогресс сброшен")
          }}>
            <RotateCcw className="size-4" />
            Сбросить прогресс
          </Button>
        </div>
        <div className="mt-4 flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
          <Segment value={mastery.mastered} total={mastery.total} className="bg-chart-2" />
          <Segment value={mastery.familiar} total={mastery.total} className="bg-primary" />
          <Segment value={mastery.learning} total={mastery.total} className="bg-accent" />
        </div>
      </div>

      {/* Preview carousel */}
      {current && (
        <div className="mt-8">
          <Flashcard
            term={current}
            flipped={flipped}
            frontIsTerm={state.settings.frontIsTerm}
            termLang={set.termLang}
            defLang={set.defLang}
            ttsEnabled={state.settings.ttsEnabled}
            onFlip={() => setFlipped((prev) => !prev)}
            onStar={() => toggleStar(set.id, current.id)}
          />
          <div className="mt-4 flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              className="font-bold"
              onClick={() => {
                setOrder(order ? null : shuffle(set.terms.map((term) => term.id)))
                setIndex(0)
                setFlipped(false)
                toast.success(order ? "Исходный порядок" : "Карточки перемешаны")
              }}
            >
              <Shuffle className={cn("size-4", order && "text-primary")} />
              Перемешать
            </Button>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" className="rounded-full" onClick={() => go(-1)} aria-label="Назад">
                <ArrowLeft className="size-4" />
              </Button>
              <span className="text-sm font-bold tabular-nums">
                {Math.min(index + 1, terms.length)} / {terms.length}
              </span>
              <Button variant="outline" size="icon" className="rounded-full" onClick={() => go(1)} aria-label="Вперёд">
                <ArrowRight className="size-4" />
              </Button>
            </div>
            <Button asChild size="sm" className="rounded-full font-bold">
              <Link href={`/set/${set.id}/flashcards`}>Во весь экран</Link>
            </Button>
          </div>
        </div>
      )}

      {/* Term list */}
      <div className="mt-10">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-extrabold">Термины в модуле ({set.terms.length})</h2>
          <div className="flex gap-2">
            {starredCount > 0 && (
              <Button variant="ghost" size="sm" className="font-bold" onClick={() => starAll(set.id, false)}>
                Снять все звёзды ({starredCount})
              </Button>
            )}
            <Button variant="ghost" size="sm" className="font-bold" onClick={() => starAll(set.id, true)}>
              <Star className="size-4" />
              Отметить все
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          {set.terms.map((term) => {
            const card = cardOf(progress, term.id)
            return (
              <div key={term.id} className="flex items-start gap-3 rounded-xl border bg-card p-4">
                <div className="min-w-0 flex-1 sm:flex sm:items-start sm:gap-4">
                  <p className="min-w-0 font-bold sm:w-2/5 sm:shrink-0">{term.term}</p>
                  <p className="mt-1 min-w-0 flex-1 text-muted-foreground sm:mt-0">{term.definition}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <span
                    className={cn(
                      "hidden rounded-full px-2 py-0.5 text-xs font-bold sm:inline",
                      card.status === "mastered" && "bg-chart-2/20 text-chart-2",
                      card.status === "familiar" && "bg-primary/15 text-primary",
                      card.status === "learning" && "bg-accent/25 text-accent-foreground dark:text-accent",
                      card.status === "new" && "bg-muted text-muted-foreground",
                    )}
                  >
                    {card.status === "mastered"
                      ? "выучено"
                      : card.status === "familiar"
                        ? "знакомо"
                        : card.status === "learning"
                          ? "изучается"
                          : "новое"}
                  </span>
                  {state.settings.ttsEnabled && (
                    <Button variant="ghost" size="icon" className="size-8" onClick={() => speak(term.term, set.termLang)} aria-label="Озвучить">
                      <Volume2 className="size-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn("size-8", term.starred && "text-accent")}
                    onClick={() => toggleStar(set.id, term.id)}
                    aria-label="В избранное"
                  >
                    <Star className={cn("size-4", term.starred && "fill-current")} />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {progress.testHistory.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-3 text-lg font-extrabold">История тестов</h2>
          <div className="space-y-2">
            {progress.testHistory.slice(0, 8).map((result, index) => (
              <div key={index} className="flex items-center justify-between rounded-lg border bg-card px-4 py-3 text-sm">
                <span className="font-semibold">{new Date(result.date).toLocaleString("ru-RU")}</span>
                <span className="font-bold">
                  {result.score} / {result.total} ({Math.round((result.score / result.total) * 100)}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={cn("size-2.5 rounded-full", color)} />
      <span className="text-muted-foreground">{label}</span>
      <span className="font-bold tabular-nums">{value}</span>
    </div>
  )
}

function Segment({ value, total, className }: { value: number; total: number; className: string }) {
  if (!total || !value) return null
  return <div className={className} style={{ width: `${(value / total) * 100}%` }} />
}
