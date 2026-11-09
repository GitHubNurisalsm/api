"use client"

import Link from "next/link"
import { Star } from "lucide-react"
import { Button } from "@/components/ui/button"

export function EmptyPool({
  setId,
  starredOnly,
  onShowAll,
  message,
}: {
  setId: string
  starredOnly: boolean
  onShowAll?: () => void
  message?: string
}) {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <Star className="mx-auto size-10 text-muted-foreground" />
      <p className="mt-4 font-bold">Нет карточек для изучения</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {message ?? (starredOnly ? "В модуле нет избранных терминов." : "Сначала добавьте термины в модуль.")}
      </p>
      {starredOnly && onShowAll ? (
        <Button className="mt-5 rounded-full font-bold" onClick={onShowAll}>
          Показать все
        </Button>
      ) : (
        <Button asChild className="mt-5 rounded-full font-bold">
          <Link href={`/set/${setId}/edit`}>Добавить термины</Link>
        </Button>
      )}
    </div>
  )
}
