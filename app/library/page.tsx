"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Folder, FolderPlus, Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { useStore } from "@/lib/store"
import { plural } from "@/lib/text"
import { FOLDER_COLORS } from "@/lib/types"
import { SetCard } from "@/components/set-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

type Sort = "updated" | "created" | "alpha" | "size"

function LibraryContent() {
  const searchParams = useSearchParams()
  const { state, ready, createFolder, renameFolder, deleteFolder } = useStore()
  const [sort, setSort] = React.useState<Sort>("updated")
  const [folderOpen, setFolderOpen] = React.useState(searchParams.get("new") === "folder")
  const [folderName, setFolderName] = React.useState("")
  const [folderColor, setFolderColor] = React.useState(FOLDER_COLORS[0])

  const sorted = React.useMemo(() => {
    const items = state.sets.slice()
    if (sort === "updated") items.sort((a, b) => b.updatedAt - a.updatedAt)
    if (sort === "created") items.sort((a, b) => b.createdAt - a.createdAt)
    if (sort === "alpha") items.sort((a, b) => a.title.localeCompare(b.title, "ru"))
    if (sort === "size") items.sort((a, b) => b.terms.length - a.terms.length)
    return items
  }, [state.sets, sort])

  if (!ready) {
    return (
      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-8 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-44 rounded-xl" />
        ))}
      </div>
    )
  }

  const starredSets = state.sets.filter((set) => set.terms.some((term) => term.starred))

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Библиотека</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {state.sets.length} {plural(state.sets.length, "модуль", "модуля", "модулей")} ·{" "}
            {state.folders.length} {plural(state.folders.length, "папка", "папки", "папок")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={sort} onValueChange={(value) => setSort(value as Sort)}>
            <SelectTrigger className="w-[11rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updated">Недавно изменённые</SelectItem>
              <SelectItem value="created">Сначала новые</SelectItem>
              <SelectItem value="alpha">По алфавиту</SelectItem>
              <SelectItem value="size">По числу терминов</SelectItem>
            </SelectContent>
          </Select>
          <Button asChild className="rounded-full font-bold">
            <Link href="/create">
              <Plus className="size-4" />
              Модуль
            </Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="sets" className="mt-6">
        <TabsList>
          <TabsTrigger value="sets">Модули</TabsTrigger>
          <TabsTrigger value="folders">Папки</TabsTrigger>
          <TabsTrigger value="starred">С избранным</TabsTrigger>
        </TabsList>

        <TabsContent value="sets" className="mt-5">
          {sorted.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {sorted.map((set) => (
                <SetCard key={set.id} set={set} />
              ))}
            </div>
          ) : (
            <EmptyLibrary />
          )}
        </TabsContent>

        <TabsContent value="folders" className="mt-5">
          <Dialog open={folderOpen} onOpenChange={setFolderOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="mb-4 rounded-full font-bold">
                <FolderPlus className="size-4" />
                Новая папка
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Новая папка</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="folder-name">Название</Label>
                  <Input
                    id="folder-name"
                    value={folderName}
                    onChange={(event) => setFolderName(event.target.value)}
                    placeholder="Например: Английский"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Цвет</Label>
                  <div className="flex flex-wrap gap-2">
                    {FOLDER_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        aria-label={`Цвет ${color}`}
                        onClick={() => setFolderColor(color)}
                        className={cn("size-8 rounded-full border-2", folderColor === color ? "border-foreground" : "border-transparent")}
                        style={{ background: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setFolderOpen(false)}>
                  Отмена
                </Button>
                <Button
                  className="font-bold"
                  onClick={() => {
                    if (!folderName.trim()) {
                      toast.error("Введите название")
                      return
                    }
                    createFolder(folderName, folderColor)
                    setFolderName("")
                    setFolderOpen(false)
                    toast.success("Папка создана")
                  }}
                >
                  Создать
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {state.folders.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {state.folders.map((folder) => {
                const sets = state.sets.filter((set) => set.folderId === folder.id)
                return (
                  <div key={folder.id} className="rounded-xl border bg-card p-5">
                    <div className="flex items-start justify-between">
                      <Link href={`/folder/${folder.id}`} className="flex min-w-0 items-center gap-3">
                        <Folder className="size-6 shrink-0" style={{ color: folder.color }} />
                        <div className="min-w-0">
                          <p className="truncate font-bold">{folder.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {sets.length} {plural(sets.length, "модуль", "модуля", "модулей")}
                          </p>
                        </div>
                      </Link>
                      <div className="flex shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          aria-label="Переименовать"
                          onClick={() => {
                            const name = window.prompt("Новое название папки", folder.name)
                            if (name?.trim()) renameFolder(folder.id, name.trim())
                          }}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:text-destructive"
                          aria-label="Удалить папку"
                          onClick={() => {
                            deleteFolder(folder.id)
                            toast.success("Папка удалена, модули сохранены")
                          }}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                    {sets.length > 0 && (
                      <ul className="mt-4 space-y-1.5 border-t pt-3">
                        {sets.slice(0, 4).map((set) => (
                          <li key={set.id}>
                            <Link href={`/set/${set.id}`} className="block truncate text-sm font-semibold hover:text-primary">
                              {set.title}
                            </Link>
                          </li>
                        ))}
                        {sets.length > 4 && <li className="text-xs text-muted-foreground">и ещё {sets.length - 4}…</li>}
                      </ul>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed bg-card p-10 text-center text-sm text-muted-foreground">
              Папок пока нет — создайте первую, чтобы сгруппировать модули.
            </p>
          )}
        </TabsContent>

        <TabsContent value="starred" className="mt-5">
          {starredSets.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {starredSets.map((set) => (
                <SetCard key={set.id} set={set} />
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed bg-card p-10 text-center text-sm text-muted-foreground">
              Отметьте звёздочкой сложные термины — модули с ними появятся здесь.
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function EmptyLibrary() {
  return (
    <div className="rounded-xl border border-dashed bg-card p-12 text-center">
      <p className="text-lg font-bold">Библиотека пуста</p>
      <p className="mt-1 text-sm text-muted-foreground">Создайте модуль вручную или импортируйте готовый список.</p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Button asChild className="rounded-full font-bold">
          <Link href="/create">Создать модуль</Link>
        </Button>
        <Button asChild variant="outline" className="rounded-full font-bold">
          <Link href="/catalog">Готовый курс немецкого</Link>
        </Button>
        <Button asChild variant="ghost" className="rounded-full font-bold">
          <Link href="/settings#import">Импорт из файла</Link>
        </Button>
      </div>
    </div>
  )
}

export default function LibraryPage() {
  return (
    <React.Suspense
      fallback={
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-8 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-44 rounded-xl" />
          ))}
        </div>
      }
    >
      <LibraryContent />
    </React.Suspense>
  )
}
