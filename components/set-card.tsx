"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Copy, Folder, MoreHorizontal, Pencil, Star, Trash2 } from "lucide-react"
import type { StudySet } from "@/lib/types"
import { useStore } from "@/lib/store"
import { masteryFor } from "@/lib/srs"
import { plural, relativeDate } from "@/lib/text"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"

export function SetCard({ set, compact = false }: { set: StudySet; compact?: boolean }) {
  const { state, getProgress, deleteSet, duplicateSet, moveSetToFolder } = useStore()
  const router = useRouter()
  const progress = getProgress(set.id)
  const mastery = masteryFor(set, progress)
  const starred = set.terms.filter((term) => term.starred).length
  const folder = state.folders.find((item) => item.id === set.folderId)

  return (
    <div className="group relative flex h-full flex-col justify-between rounded-xl border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-md">
      <Link href={`/set/${set.id}`} className="flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-2 pr-6 font-bold leading-snug text-balance">{set.title}</p>
        </div>
        {!compact && set.description && (
          <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{set.description}</p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-muted-foreground">
          <span className="rounded-full bg-secondary px-2.5 py-1 text-secondary-foreground">
            {set.terms.length} {plural(set.terms.length, "термин", "термина", "терминов")}
          </span>
          {starred > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-accent/20 px-2.5 py-1 text-accent-foreground dark:text-accent">
              <Star className="size-3 fill-current" />
              {starred}
            </span>
          )}
          {folder && (
            <span className="flex items-center gap-1">
              <Folder className="size-3" style={{ color: folder.color }} />
              {folder.name}
            </span>
          )}
        </div>
      </Link>

      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
          <span>{progress.lastStudied ? `Учили ${relativeDate(progress.lastStudied)}` : "Ещё не изучали"}</span>
          <span className="font-bold text-foreground">{mastery.percent}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${mastery.percent}%` }}
            role="progressbar"
            aria-valuenow={mastery.percent}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 size-7 opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
            aria-label="Действия с модулем"
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => router.push(`/set/${set.id}/edit`)}>
            <Pencil className="size-4" />
            Редактировать
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              const id = duplicateSet(set.id)
              if (id) toast.success("Копия создана")
            }}
          >
            <Copy className="size-4" />
            Дублировать
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Folder className="size-4" />
              Переместить в папку
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={() => moveSetToFolder(set.id, null)}>Без папки</DropdownMenuItem>
              {state.folders.map((item) => (
                <DropdownMenuItem key={item.id} onClick={() => moveSetToFolder(set.id, item.id)}>
                  {item.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => {
              deleteSet(set.id)
              toast.success("Модуль удалён")
            }}
          >
            <Trash2 className="size-4" />
            Удалить
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
