"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Search } from "lucide-react"
import { useStore } from "@/lib/store"
import { plural, stripAccents } from "@/lib/text"
import { SetCard } from "@/components/set-card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"

function matches(haystack: string, needle: string) {
  return stripAccents(haystack.toLowerCase()).includes(stripAccents(needle.toLowerCase()))
}

function SearchResults() {
  const searchParams = useSearchParams()
  const { state, ready } = useStore()
  const [query, setQuery] = React.useState(searchParams.get("q") ?? "")

  React.useEffect(() => {
    setQuery(searchParams.get("q") ?? "")
  }, [searchParams])

  const trimmed = query.trim()

  const setHits = React.useMemo(() => {
    if (!trimmed) return []
    return state.sets.filter((set) => matches(set.title, trimmed) || matches(set.description, trimmed))
  }, [state.sets, trimmed])

  const termHits = React.useMemo(() => {
    if (!trimmed) return []
    const results: { setId: string; setTitle: string; term: string; definition: string }[] = []
    for (const set of state.sets) {
      for (const term of set.terms) {
        if (matches(term.term, trimmed) || matches(term.definition, trimmed)) {
          results.push({ setId: set.id, setTitle: set.title, term: term.term, definition: term.definition })
        }
      }
    }
    return results.slice(0, 60)
  }, [state.sets, trimmed])

  if (!ready) return <Skeleton className="mx-auto mt-10 h-64 max-w-5xl rounded-xl" />

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-extrabold tracking-tight">Поиск</h1>
      <div className="relative mt-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Введите слово, термин или название модуля"
          className="h-12 rounded-full pl-10 text-base"
          autoFocus
        />
      </div>

      {!trimmed ? (
        <p className="mt-10 text-center text-sm text-muted-foreground">Начните вводить запрос — поиск идёт по названиям модулей и всем терминам.</p>
      ) : (
        <>
          <p className="mt-6 text-sm font-bold text-muted-foreground">
            Найдено: {setHits.length} {plural(setHits.length, "модуль", "модуля", "модулей")} и {termHits.length}{" "}
            {plural(termHits.length, "термин", "термина", "терминов")}
          </p>

          {setHits.length > 0 && (
            <section className="mt-6">
              <h2 className="mb-3 text-lg font-extrabold">Модули</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {setHits.map((set) => (
                  <SetCard key={set.id} set={set} compact />
                ))}
              </div>
            </section>
          )}

          {termHits.length > 0 && (
            <section className="mt-8">
              <h2 className="mb-3 text-lg font-extrabold">Термины</h2>
              <div className="space-y-2">
                {termHits.map((hit, index) => (
                  <Link
                    key={`${hit.setId}-${index}`}
                    href={`/set/${hit.setId}`}
                    className="block rounded-xl border bg-card p-4 transition-colors hover:border-primary/60"
                  >
                    <div className="sm:flex sm:gap-4">
                      <p className="font-bold sm:w-2/5">{hit.term}</p>
                      <p className="mt-1 flex-1 text-muted-foreground sm:mt-0">{hit.definition}</p>
                    </div>
                    <p className="mt-2 text-xs font-semibold text-primary">{hit.setTitle}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {!setHits.length && !termHits.length && (
            <p className="mt-12 rounded-xl border border-dashed bg-card p-10 text-center text-sm text-muted-foreground">
              Ничего не найдено по запросу «{trimmed}».
            </p>
          )}
        </>
      )}
    </div>
  )
}

export default function SearchPage() {
  return (
    <React.Suspense fallback={<Skeleton className="mx-auto mt-10 h-64 max-w-5xl rounded-xl" />}>
      <SearchResults />
    </React.Suspense>
  )
}
