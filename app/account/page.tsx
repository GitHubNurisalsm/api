"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Check, CloudOff, Loader2, LogOut, RefreshCw, ShieldCheck, UserPlus } from "lucide-react"
import { toast } from "sonner"
import { useStore } from "@/lib/store"
import { plural, relativeDate } from "@/lib/text"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function AccountPage() {
  const router = useRouter()
  const { state, ready, account, syncStatus, lastSyncedAt, register, login, logout, syncNow } = useStore()

  const [username, setUsername] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [repeat, setRepeat] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function submit(mode: "login" | "register") {
    setError(null)
    if (mode === "register" && password !== repeat) {
      setError("Пароли не совпадают")
      return
    }
    setBusy(true)
    const result = mode === "register" ? await register(username, password) : await login(username, password)
    setBusy(false)
    if (!result.ok) {
      setError(result.error ?? "Не получилось")
      return
    }
    setPassword("")
    setRepeat("")
    toast.success(mode === "register" ? "Профиль создан — прогресс теперь сохраняется" : "Вы вошли")
    router.push("/")
  }

  if (!ready) return <Skeleton className="mx-auto mt-10 h-80 max-w-md rounded-xl" />

  const totalCards = state.sets.reduce((sum, set) => sum + set.terms.length, 0)

  if (account) {
    return (
      <div className="mx-auto max-w-md px-4 py-10 sm:px-6">
        <div className="rounded-xl border bg-card p-6 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-primary/10 text-xl font-black text-primary">
            {account.displayName.slice(0, 1).toUpperCase()}
          </span>
          <h1 className="mt-4 text-xl font-extrabold">{account.displayName}</h1>
          <p className="text-sm text-muted-foreground">@{account.username}</p>

          <div className="mt-5 flex items-center justify-center gap-2 rounded-lg bg-secondary px-4 py-2.5 text-sm font-bold">
            {syncStatus === "saving" ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Сохраняю…
              </>
            ) : syncStatus === "error" ? (
              <>
                <CloudOff className="size-4 text-destructive" />
                Нет связи — сохранено на устройстве
              </>
            ) : (
              <>
                <Check className="size-4 text-chart-2" />
                {lastSyncedAt ? `Синхронизировано ${relativeDate(lastSyncedAt)}` : "Синхронизировано"}
              </>
            )}
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            {state.sets.length} {plural(state.sets.length, "модуль", "модуля", "модулей")} · {totalCards} карточек привязаны к профилю.
            Войдите с тем же именем на другом устройстве — прогресс подтянется.
          </p>

          <div className="mt-6 flex flex-col gap-2">
            <Button
              variant="outline"
              className="rounded-full font-bold"
              onClick={async () => {
                await syncNow()
                toast.success("Синхронизировано")
              }}
            >
              <RefreshCw className="size-4" />
              Синхронизировать сейчас
            </Button>
            <Button
              variant="ghost"
              className="rounded-full font-bold text-destructive hover:text-destructive"
              onClick={async () => {
                await logout()
                toast.success("Вы вышли. Данные остались на этом устройстве.")
              }}
            >
              <LogOut className="size-4" />
              Выйти
            </Button>
          </div>
        </div>

        <Button asChild variant="ghost" className="mt-4 w-full font-bold">
          <Link href="/">На главную</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10 sm:px-6">
      <div className="text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-xl bg-primary/10 text-primary">
          <ShieldCheck className="size-6" />
        </span>
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight">Профиль</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Чтобы прогресс не терялся при смене браузера или устройства, создайте профиль — модули и статистика будут
          сохраняться на сервере.
        </p>
      </div>

      <Tabs defaultValue="register" className="mt-6">
        <TabsList className="w-full">
          <TabsTrigger value="register" className="flex-1">
            Регистрация
          </TabsTrigger>
          <TabsTrigger value="login" className="flex-1">
            Вход
          </TabsTrigger>
        </TabsList>

        {(["register", "login"] as const).map((mode) => (
          <TabsContent key={mode} value={mode} className="mt-4">
            <form
              className="space-y-4 rounded-xl border bg-card p-5"
              onSubmit={(event) => {
                event.preventDefault()
                void submit(mode)
              }}
            >
              <div className="space-y-2">
                <Label htmlFor={`${mode}-username`}>Имя пользователя</Label>
                <Input
                  id={`${mode}-username`}
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="например, nurislam"
                  autoComplete="username"
                  autoCapitalize="off"
                  spellCheck={false}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${mode}-password`}>Пароль</Label>
                <Input
                  id={`${mode}-password`}
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="минимум 6 символов"
                  autoComplete={mode === "register" ? "new-password" : "current-password"}
                  className="h-11"
                />
              </div>
              {mode === "register" && (
                <div className="space-y-2">
                  <Label htmlFor="repeat">Повторите пароль</Label>
                  <Input
                    id="repeat"
                    type="password"
                    value={repeat}
                    onChange={(event) => setRepeat(event.target.value)}
                    autoComplete="new-password"
                    className="h-11"
                  />
                </div>
              )}

              {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">{error}</p>}

              <Button type="submit" disabled={busy} size="lg" className="h-12 w-full rounded-full font-bold">
                {busy ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
                {mode === "register" ? "Создать профиль" : "Войти"}
              </Button>

              {mode === "register" && (
                <p className="text-xs text-muted-foreground">
                  То, что уже есть в этом браузере, не потеряется: при первом входе локальные модули и прогресс
                  объединяются с тем, что хранится в профиле.
                </p>
              )}
            </form>
          </TabsContent>
        ))}
      </Tabs>

      <Button asChild variant="ghost" className="mt-4 w-full font-bold">
        <Link href="/">Продолжить без профиля</Link>
      </Button>
    </div>
  )
}
