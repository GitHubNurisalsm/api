"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { BookOpen, FolderPlus, Library, Menu, Plus, Search, Settings, Sparkles, Upload, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

const NAV = [
  { href: "/", label: "Главная", icon: BookOpen },
  { href: "/library", label: "Библиотека", icon: Library },
  { href: "/stats", label: "Прогресс", icon: Sparkles },
]

export function AppHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const [query, setQuery] = React.useState("")
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const searchRef = React.useRef<HTMLInputElement>(null)

  // `/` focuses search, like on Quizlet
  React.useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
      if (event.key === "/" && !typing) {
        event.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  function submitSearch(event: React.FormEvent) {
    event.preventDefault()
    const trimmed = query.trim()
    router.push(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/search")
  }

  const isStudyRoute = /\/(flashcards|learn|write|spell|test|match)$/.test(pathname)
  if (isStudyRoute) return null

  return (
    <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden" aria-label="Меню">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <SheetTitle className="px-5 pt-5 text-lg">QuizMaster</SheetTitle>
            <nav className="mt-4 flex flex-col gap-1 px-3">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors hover:bg-secondary",
                    pathname === item.href && "bg-secondary text-primary",
                  )}
                >
                  <item.icon className="size-4" />
                  {item.label}
                </Link>
              ))}
              <Link
                href="/settings"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors hover:bg-secondary"
              >
                <Settings className="size-4" />
                Настройки
              </Link>
              <Link
                href="/create"
                onClick={() => setMobileOpen(false)}
                className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-bold text-primary-foreground"
              >
                <Plus className="size-4" />
                Создать модуль
              </Link>
            </nav>
          </SheetContent>
        </Sheet>

        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-sm font-black text-primary-foreground">Q</span>
          <span className="hidden text-lg font-extrabold tracking-tight sm:inline">QuizMaster</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-bold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
                pathname === item.href && "bg-secondary text-primary",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <form onSubmit={submitSearch} className="relative ml-auto hidden max-w-md flex-1 sm:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Поиск модулей и терминов  ( / )"
            className="h-10 rounded-full border-transparent bg-muted pl-9 pr-9 focus-visible:bg-card"
            aria-label="Поиск"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Очистить"
            >
              <X className="size-4" />
            </button>
          )}
        </form>

        <div className="ml-auto flex items-center gap-1 sm:ml-0">
          <Button variant="ghost" size="icon" className="sm:hidden" onClick={() => router.push("/search")} aria-label="Поиск">
            <Search className="size-5" />
          </Button>
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="h-10 gap-1.5 rounded-full px-3 font-bold sm:px-4">
                <Plus className="size-4" />
                <span className="hidden sm:inline">Создать</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => router.push("/create")}>
                <BookOpen className="size-4" />
                Учебный модуль
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/library?new=folder")}>
                <FolderPlus className="size-4" />
                Папка
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/settings#import")}>
                <Upload className="size-4" />
                Импорт из файла
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
