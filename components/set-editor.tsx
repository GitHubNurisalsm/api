"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowDown, ArrowLeftRight, ArrowUp, FileUp, Plus, Trash2, Wand2 } from "lucide-react"
import { toast } from "sonner"
import type { StudySet, Term } from "@/lib/types"
import { useStore } from "@/lib/store"
import { makeId } from "@/lib/seed"
import { parseBulkImport } from "@/lib/text"
import { LANGUAGES } from "@/lib/speech"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

type Draft = { id: string; term: string; definition: string; starred: boolean }

function toDraft(terms: Term[]): Draft[] {
  if (!terms.length) {
    return [
      { id: makeId("t"), term: "", definition: "", starred: false },
      { id: makeId("t"), term: "", definition: "", starred: false },
    ]
  }
  return terms.map((term) => ({ id: term.id, term: term.term, definition: term.definition, starred: term.starred }))
}

export function SetEditor({ existing }: { existing?: StudySet }) {
  const router = useRouter()
  const { state, createSet, updateSet, createFolder } = useStore()

  const [title, setTitle] = React.useState(existing?.title ?? "")
  const [description, setDescription] = React.useState(existing?.description ?? "")
  const [termLang, setTermLang] = React.useState(existing?.termLang ?? "en-US")
  const [defLang, setDefLang] = React.useState(existing?.defLang ?? "ru-RU")
  const [folderId, setFolderId] = React.useState<string>(existing?.folderId ?? "none")
  const [rows, setRows] = React.useState<Draft[]>(() => toDraft(existing?.terms ?? []))
  const [importOpen, setImportOpen] = React.useState(false)
  const lastRowRef = React.useRef<HTMLInputElement | null>(null)
  const focusLast = React.useRef(false)

  React.useEffect(() => {
    if (focusLast.current) {
      lastRowRef.current?.focus()
      focusLast.current = false
    }
  }, [rows])

  function addRow() {
    focusLast.current = true
    setRows((prev) => [...prev, { id: makeId("t"), term: "", definition: "", starred: false }])
  }

  function updateRow(id: string, patch: Partial<Draft>) {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  }

  function removeRow(id: string) {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((row) => row.id !== id)))
  }

  function move(index: number, direction: -1 | 1) {
    setRows((prev) => {
      const next = prev.slice()
      const target = index + direction
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  function swapColumns() {
    setRows((prev) => prev.map((row) => ({ ...row, term: row.definition, definition: row.term })))
    setTermLang(defLang)
    setDefLang(termLang)
  }

  function handleSave() {
    const cleaned = rows
      .map((row) => ({ ...row, term: row.term.trim(), definition: row.definition.trim() }))
      .filter((row) => row.term || row.definition)

    if (!title.trim()) {
      toast.error("Добавьте название модуля")
      return
    }
    if (cleaned.length < 1) {
      toast.error("Нужен хотя бы один термин")
      return
    }

    const terms: Term[] = cleaned.map((row) => ({
      id: row.id,
      term: row.term,
      definition: row.definition,
      starred: row.starred,
    }))
    const resolvedFolder = folderId === "none" ? null : folderId

    if (existing) {
      updateSet(existing.id, { title: title.trim(), description, terms, termLang, defLang, folderId: resolvedFolder })
      toast.success("Изменения сохранены")
      router.push(`/set/${existing.id}`)
    } else {
      const id = createSet({ title, description, terms, termLang, defLang, folderId: resolvedFolder })
      toast.success("Модуль создан")
      router.push(`/set/${id}`)
    }
  }

  const filled = rows.filter((row) => row.term.trim() && row.definition.trim()).length

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight">{existing ? "Редактировать модуль" : "Новый учебный модуль"}</h1>
        <div className="flex gap-2">
          <ImportDialog
            open={importOpen}
            onOpenChange={setImportOpen}
            onImport={(pairs) => {
              setRows((prev) => {
                const kept = prev.filter((row) => row.term.trim() || row.definition.trim())
                return [
                  ...kept,
                  ...pairs.map((pair) => ({ id: makeId("t"), term: pair.term, definition: pair.definition, starred: false })),
                ]
              })
              toast.success(`Добавлено строк: ${pairs.length}`)
            }}
          />
          <Button onClick={handleSave} className="rounded-full px-6 font-bold">
            {existing ? "Сохранить" : "Создать"}
          </Button>
        </div>
      </div>

      <div className="mt-6 space-y-4 rounded-xl border bg-card p-5">
        <div className="space-y-2">
          <Label htmlFor="title">Название</Label>
          <Input
            id="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder='Например: «Английский — Unit 5» или «Биология: клетка»'
            className="h-11 text-base font-semibold"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Описание (необязательно)</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Добавьте описание…"
            rows={2}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Язык термина</Label>
            <Select value={termLang} onValueChange={setTermLang}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Язык определения</Label>
            <Select value={defLang} onValueChange={setDefLang}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Папка</Label>
            <Select
              value={folderId}
              onValueChange={(value) => {
                if (value === "__new") {
                  const name = window.prompt("Название новой папки")
                  if (name) setFolderId(createFolder(name))
                  return
                }
                setFolderId(value)
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Без папки</SelectItem>
                {state.folders.map((folder) => (
                  <SelectItem key={folder.id} value={folder.id}>
                    {folder.name}
                  </SelectItem>
                ))}
                <SelectItem value="__new">+ Новая папка…</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm font-bold text-muted-foreground">
          {filled} из {rows.length} строк заполнено
        </p>
        <Button variant="ghost" onClick={swapColumns} className="font-bold">
          <ArrowLeftRight className="size-4" />
          Поменять столбцы
        </Button>
      </div>

      <div className="mt-3 space-y-3">
        {rows.map((row, index) => (
          <div key={row.id} className="rounded-xl border bg-card p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-bold text-muted-foreground">{index + 1}</span>
              <div className="flex items-center gap-0.5">
                <Button variant="ghost" size="icon" className="size-8" onClick={() => move(index, -1)} aria-label="Вверх" disabled={index === 0}>
                  <ArrowUp className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => move(index, 1)}
                  aria-label="Вниз"
                  disabled={index === rows.length - 1}
                >
                  <ArrowDown className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-destructive"
                  onClick={() => removeRow(row.id)}
                  aria-label="Удалить строку"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Input
                  ref={index === rows.length - 1 ? lastRowRef : undefined}
                  value={row.term}
                  onChange={(event) => updateRow(row.id, { term: event.target.value })}
                  placeholder="Термин"
                  className="h-11 border-0 border-b-2 border-input rounded-none bg-transparent px-1 text-base font-semibold shadow-none focus-visible:border-primary focus-visible:ring-0"
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && index === rows.length - 1) addRow()
                  }}
                />
                <span className="text-xs font-bold uppercase text-muted-foreground">Термин</span>
              </div>
              <div className="space-y-1">
                <Input
                  value={row.definition}
                  onChange={(event) => updateRow(row.id, { definition: event.target.value })}
                  placeholder="Определение"
                  className="h-11 border-0 border-b-2 border-input rounded-none bg-transparent px-1 text-base font-semibold shadow-none focus-visible:border-primary focus-visible:ring-0"
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && index === rows.length - 1) addRow()
                  }}
                />
                <span className="text-xs font-bold uppercase text-muted-foreground">Определение</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addRow}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed bg-card py-6 font-bold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
      >
        <Plus className="size-5" />
        Добавить карточку
      </button>

      <div className="mt-6 flex justify-end">
        <Button onClick={handleSave} size="lg" className="rounded-full px-8 font-bold">
          {existing ? "Сохранить изменения" : "Создать модуль"}
        </Button>
      </div>
    </div>
  )
}

function ImportDialog({
  open,
  onOpenChange,
  onImport,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (pairs: { term: string; definition: string }[]) => void
}) {
  const [raw, setRaw] = React.useState("")
  const [colSep, setColSep] = React.useState<"tab" | "comma" | "dash" | "custom">("dash")
  const [custom, setCustom] = React.useState("")
  const [rowSep, setRowSep] = React.useState<"newline" | "semicolon">("newline")

  const preview = React.useMemo(() => parseBulkImport(raw, rowSep, colSep, custom), [raw, rowSep, colSep, custom])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-full font-bold">
          <FileUp className="size-4" />
          Импорт
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Импорт данных</DialogTitle>
          <DialogDescription>Вставьте список — по одной паре на строку. Поддерживается копирование из Word, Excel и Google Таблиц.</DialogDescription>
        </DialogHeader>

        <Textarea
          value={raw}
          onChange={(event) => setRaw(event.target.value)}
          rows={8}
          placeholder={"ability - способность\nachieve - достигать\navailable - доступный"}
          className="font-mono text-sm"
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label className="mb-2 block">Между термином и определением</Label>
            <RadioGroup value={colSep} onValueChange={(value) => setColSep(value as typeof colSep)} className="gap-2">
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="dash" /> Тире (слово - перевод)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="tab" /> Табуляция
              </label>
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="comma" /> Запятая
              </label>
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="custom" /> Свой символ
              </label>
            </RadioGroup>
            {colSep === "custom" && (
              <Input value={custom} onChange={(event) => setCustom(event.target.value)} placeholder="Например: |" className="mt-2 h-9" />
            )}
          </div>
          <div>
            <Label className="mb-2 block">Между карточками</Label>
            <RadioGroup value={rowSep} onValueChange={(value) => setRowSep(value as typeof rowSep)} className="gap-2">
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="newline" /> Новая строка
              </label>
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="semicolon" /> Точка с запятой
              </label>
            </RadioGroup>
            <div className="mt-4 rounded-lg bg-secondary p-3 text-sm">
              <p className="flex items-center gap-1.5 font-bold">
                <Wand2 className="size-4" />
                Найдено карточек: {preview.length}
              </p>
              {preview.slice(0, 3).map((pair, index) => (
                <p key={index} className="mt-1 truncate text-xs text-muted-foreground">
                  {pair.term} → {pair.definition || "—"}
                </p>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button
            disabled={!preview.length}
            onClick={() => {
              onImport(preview)
              setRaw("")
              onOpenChange(false)
            }}
            className="font-bold"
          >
            Импортировать {preview.length || ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
