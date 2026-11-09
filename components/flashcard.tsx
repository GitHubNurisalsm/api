"use client"

import * as React from "react"
import { Star, Volume2 } from "lucide-react"
import type { Term } from "@/lib/types"
import { speak } from "@/lib/speech"
import { cn } from "@/lib/utils"

export function Flashcard({
  term,
  flipped,
  frontIsTerm,
  termLang,
  defLang,
  onFlip,
  onStar,
  ttsEnabled = true,
  className,
}: {
  term: Term
  flipped: boolean
  frontIsTerm: boolean
  termLang: string
  defLang: string
  onFlip: () => void
  onStar?: () => void
  ttsEnabled?: boolean
  className?: string
}) {
  const frontText = frontIsTerm ? term.term : term.definition
  const backText = frontIsTerm ? term.definition : term.term
  const frontLang = frontIsTerm ? termLang : defLang
  const backLang = frontIsTerm ? defLang : termLang

  return (
    <div className={cn("flip-scene h-[clamp(18rem,52vh,30rem)] w-full", className)}>
      <div
        className={cn("flip-card cursor-pointer select-none", flipped && "is-flipped")}
        onClick={onFlip}
        role="button"
        tabIndex={0}
        aria-label="Перевернуть карточку"
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault()
            onFlip()
          }
        }}
      >
        <Face
          text={frontText}
          lang={frontLang}
          label="Термин"
          showLabel={frontIsTerm}
          starred={term.starred}
          onStar={onStar}
          ttsEnabled={ttsEnabled}
        />
        <Face
          text={backText}
          lang={backLang}
          label="Определение"
          showLabel={frontIsTerm}
          starred={term.starred}
          onStar={onStar}
          ttsEnabled={ttsEnabled}
          back
        />
      </div>
    </div>
  )
}

function Face({
  text,
  lang,
  label,
  showLabel,
  starred,
  onStar,
  ttsEnabled,
  back = false,
}: {
  text: string
  lang: string
  label: string
  showLabel: boolean
  starred: boolean
  onStar?: () => void
  ttsEnabled: boolean
  back?: boolean
}) {
  const long = text.length > 160
  return (
    <div className={cn("flip-face rounded-2xl border-2 bg-card p-6 shadow-md sm:p-10", back && "back")}>
      <div className="absolute left-4 top-4 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        {showLabel ? (back ? "Определение" : "Термин") : back ? "Термин" : "Определение"}
      </div>
      <div className="absolute right-3 top-3 flex items-center gap-1">
        {ttsEnabled && (
          <button
            type="button"
            className="grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Озвучить"
            onClick={(event) => {
              event.stopPropagation()
              speak(text, lang)
            }}
          >
            <Volume2 className="size-5" />
          </button>
        )}
        {onStar && (
          <button
            type="button"
            className={cn(
              "grid size-9 place-items-center rounded-full transition-colors hover:bg-secondary",
              starred ? "text-accent" : "text-muted-foreground hover:text-foreground",
            )}
            aria-label={starred ? "Убрать из избранного" : "В избранное"}
            onClick={(event) => {
              event.stopPropagation()
              onStar()
            }}
          >
            <Star className={cn("size-5", starred && "fill-current")} />
          </button>
        )}
      </div>
      <p
        className={cn(
          "max-h-full overflow-auto px-2 text-center font-semibold leading-snug text-balance",
          long ? "text-lg sm:text-xl" : "text-2xl sm:text-4xl",
        )}
      >
        {text || "—"}
      </p>
    </div>
  )
}
