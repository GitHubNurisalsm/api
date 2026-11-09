"use client"

import * as React from "react"
import { Check, CornerDownLeft, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export type Verdict = "idle" | "correct" | "typo" | "wrong"

export type Choice = { id: string; label: string }

export function ChoiceGrid({
  options,
  answerId,
  selectedId,
  disabled,
  onSelect,
}: {
  options: Choice[]
  answerId: string
  selectedId: string | null
  disabled: boolean
  onSelect: (id: string) => void
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {options.map((option, position) => {
        const isAnswer = option.id === answerId
        const isPicked = option.id === selectedId
        const reveal = disabled && (isAnswer || isPicked)
        return (
          <button
            key={option.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(option.id)}
            className={cn(
              "flex min-h-[4.5rem] items-center gap-3 rounded-xl border-2 bg-card p-4 text-left font-semibold transition-all",
              !disabled && "hover:-translate-y-0.5 hover:border-primary hover:shadow-md",
              reveal && isAnswer && "border-chart-2 bg-chart-2/10",
              reveal && isPicked && !isAnswer && "border-destructive bg-destructive/10",
              disabled && !reveal && "opacity-50",
            )}
          >
            <span className="grid size-7 shrink-0 place-items-center rounded-md bg-secondary text-xs font-bold text-secondary-foreground">
              {position + 1}
            </span>
            <span className="min-w-0 flex-1 break-words">{option.label}</span>
            {reveal && isAnswer && <Check className="size-5 shrink-0 text-chart-2" />}
            {reveal && isPicked && !isAnswer && <X className="size-5 shrink-0 text-destructive" />}
          </button>
        )
      })}
    </div>
  )
}

export function WrittenInput({
  value,
  verdict,
  placeholder = "Введите ответ",
  onChange,
  onSubmit,
  onSkip,
  autoFocus = true,
}: {
  value: string
  verdict: Verdict
  placeholder?: string
  onChange: (value: string) => void
  onSubmit: () => void
  onSkip?: () => void
  autoFocus?: boolean
}) {
  const ref = React.useRef<HTMLInputElement>(null)
  React.useEffect(() => {
    if (autoFocus && verdict === "idle") ref.current?.focus()
  }, [autoFocus, verdict])

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
      className="space-y-3"
    >
      <div className="relative">
        <Input
          ref={ref}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          disabled={verdict !== "idle"}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          className={cn(
            "h-14 rounded-xl border-2 pr-28 text-base font-semibold",
            verdict === "correct" && "border-chart-2 bg-chart-2/10",
            verdict === "typo" && "border-accent bg-accent/10",
            verdict === "wrong" && "border-destructive bg-destructive/10 animate-shake",
          )}
        />
        {verdict === "idle" && (
          <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
            {onSkip && (
              <Button type="button" variant="ghost" size="sm" className="font-bold text-muted-foreground" onClick={onSkip}>
                Не знаю
              </Button>
            )}
            <Button type="submit" size="icon" className="size-10 rounded-lg" aria-label="Проверить">
              <CornerDownLeft className="size-4" />
            </Button>
          </div>
        )}
      </div>
    </form>
  )
}

export function VerdictBanner({ verdict, correctAnswer, onNext }: { verdict: Verdict; correctAnswer: string; onNext: () => void }) {
  if (verdict === "idle") return null
  return (
    <div
      className={cn(
        "animate-pop-in mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 p-4",
        verdict === "correct" && "border-chart-2 bg-chart-2/10",
        verdict === "typo" && "border-accent bg-accent/10",
        verdict === "wrong" && "border-destructive bg-destructive/10",
      )}
    >
      <div className="min-w-0">
        <p className="font-extrabold">
          {verdict === "correct" ? "Верно!" : verdict === "typo" ? "Почти — опечатка" : "Правильный ответ:"}
        </p>
        {verdict !== "correct" && <p className="mt-0.5 break-words font-semibold">{correctAnswer}</p>}
      </div>
      <Button onClick={onNext} className="rounded-full font-bold">
        Дальше
        <CornerDownLeft className="size-4" />
      </Button>
    </div>
  )
}
