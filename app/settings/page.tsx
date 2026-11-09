"use client"

import * as React from "react"
import { Download, RefreshCw, Trash2, Upload } from "lucide-react"
import { toast } from "sonner"
import { useStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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

export default function SettingsPage() {
  const { state, ready, updateSettings, exportState, importState, resetAll } = useStore()
  const [raw, setRaw] = React.useState("")
  const fileRef = React.useRef<HTMLInputElement>(null)

  if (!ready) return <Skeleton className="mx-auto mt-10 h-64 max-w-2xl rounded-xl" />

  function download() {
    const blob = new Blob([exportState()], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `quizmaster-backup-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
    toast.success("Резервная копия сохранена")
  }

  function handleImport(text: string) {
    const result = importState(text)
    if (result.ok) {
      toast.success(result.message)
      setRaw("")
    } else {
      toast.error(result.message)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-extrabold tracking-tight">Настройки</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Все данные хранятся только в этом браузере — аккаунт и подписка не нужны.
      </p>

      <section className="mt-6 space-y-5 rounded-xl border bg-card p-5">
        <h2 className="font-extrabold">Изучение</h2>
        <Row label="Озвучка терминов" hint="Показывать кнопку синтеза речи">
          <Switch checked={state.settings.ttsEnabled} onCheckedChange={(checked) => updateSettings({ ttsEnabled: checked })} />
        </Row>
        <Row label="Сначала показывать термин" hint="Иначе карточка открывается определением">
          <Switch checked={state.settings.frontIsTerm} onCheckedChange={(checked) => updateSettings({ frontIsTerm: checked })} />
        </Row>
        <Row label="Игнорировать диакритику" hint="café = cafe при проверке ответа">
          <Switch
            checked={state.settings.accentInsensitive}
            onCheckedChange={(checked) => updateSettings({ accentInsensitive: checked })}
          />
        </Row>
        <Row label="Тип вопросов в «Заучивании»" hint="Смешанный режим подбирает тип под ваш уровень">
          <Select value={state.settings.learnMode} onValueChange={(value) => updateSettings({ learnMode: value as "mixed" | "choice" | "written" })}>
            <SelectTrigger className="w-[13rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mixed">Смешанные</SelectItem>
              <SelectItem value="choice">Только выбор</SelectItem>
              <SelectItem value="written">Только ввод</SelectItem>
            </SelectContent>
          </Select>
        </Row>
        <Row label={`Пауза автопрокрутки: ${state.settings.autoplayDelay} с`} hint="Для режима «Карточки»">
          <input
            type="range"
            min={2}
            max={12}
            value={state.settings.autoplayDelay}
            onChange={(event) => updateSettings({ autoplayDelay: Number(event.target.value) })}
            className="w-40 accent-primary"
          />
        </Row>
      </section>

      <section id="import" className="mt-6 space-y-4 rounded-xl border bg-card p-5 scroll-mt-20">
        <h2 className="font-extrabold">Данные</h2>
        <p className="text-sm text-muted-foreground">
          Сохраните копию, чтобы перенести модули на другое устройство или в другой браузер.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={download} className="rounded-full font-bold">
            <Download className="size-4" />
            Скачать копию (JSON)
          </Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()} className="rounded-full font-bold">
            <Upload className="size-4" />
            Загрузить из файла
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={async (event) => {
              const file = event.target.files?.[0]
              if (!file) return
              handleImport(await file.text())
              event.target.value = ""
            }}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="raw">…или вставьте JSON вручную</Label>
          <Textarea
            id="raw"
            value={raw}
            onChange={(event) => setRaw(event.target.value)}
            rows={5}
            placeholder='{"sets": [...]} или [{"title": "…", "terms": [...]}]'
            className="font-mono text-xs"
          />
          <Button disabled={!raw.trim()} onClick={() => handleImport(raw)} variant="secondary" className="font-bold">
            Импортировать
          </Button>
        </div>
      </section>

      <section className="mt-6 space-y-4 rounded-xl border bg-card p-5">
        <h2 className="font-extrabold">Сброс</h2>
        <div className="flex flex-wrap gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="rounded-full font-bold">
                <RefreshCw className="size-4" />
                Вернуть демо-модули
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Заменить всё демо-набором?</AlertDialogTitle>
                <AlertDialogDescription>
                  Ваши текущие модули и прогресс будут удалены, вместо них появятся четыре учебных модуля для примера.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Отмена</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    resetAll(true)
                    toast.success("Демо-модули восстановлены")
                  }}
                >
                  Заменить
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="rounded-full font-bold text-destructive hover:text-destructive">
                <Trash2 className="size-4" />
                Удалить все данные
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Удалить всё безвозвратно?</AlertDialogTitle>
                <AlertDialogDescription>
                  Будут удалены все модули ({state.sets.length}), папки и статистика. Сначала лучше скачать резервную копию.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Отмена</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    resetAll(false)
                    toast.success("Данные удалены")
                  }}
                >
                  Удалить всё
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </section>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        QuizMaster · все режимы бесплатны и без ограничений
      </p>
    </div>
  )
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <Label className="text-sm font-bold">{label}</Label>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}
