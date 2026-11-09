"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft, Folder } from "lucide-react"
import { useStore } from "@/lib/store"
import { plural } from "@/lib/text"
import { SetCard } from "@/components/set-card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

export default function FolderPage() {
  const params = useParams<{ id: string }>()
  const { state, ready } = useStore()

  if (!ready) return <Skeleton className="mx-auto mt-10 h-64 max-w-5xl rounded-xl" />

  const folder = state.folders.find((item) => item.id === params.id)
  if (!folder) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-xl font-extrabold">Папка не найдена</h1>
        <Button asChild className="mt-6 rounded-full font-bold">
          <Link href="/library">В библиотеку</Link>
        </Button>
      </div>
    )
  }

  const sets = state.sets.filter((set) => set.folderId === folder.id)

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2 font-bold text-muted-foreground">
        <Link href="/library">
          <ArrowLeft className="size-4" />
          Библиотека
        </Link>
      </Button>
      <div className="flex items-center gap-3">
        <Folder className="size-8" style={{ color: folder.color }} />
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">{folder.name}</h1>
          <p className="text-sm text-muted-foreground">
            {sets.length} {plural(sets.length, "модуль", "модуля", "модулей")}
          </p>
        </div>
      </div>

      {sets.length ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {sets.map((set) => (
            <SetCard key={set.id} set={set} />
          ))}
        </div>
      ) : (
        <p className="mt-6 rounded-xl border border-dashed bg-card p-10 text-center text-sm text-muted-foreground">
          В папке пока нет модулей. Откройте модуль и выберите «Переместить в папку».
        </p>
      )}
    </div>
  )
}
