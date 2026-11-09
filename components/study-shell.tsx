"use client"

import Link from "next/link"
import { X } from "lucide-react"
import type React from "react"
import { Button } from "@/components/ui/button"

/** Distraction-free chrome shared by every study mode. */
export function StudyShell({
  setId,
  title,
  subtitle,
  progress,
  right,
  children,
}: {
  setId: string
  title: string
  subtitle?: string
  progress?: number
  right?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{title}</p>
            {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          {right}
          <Button asChild variant="ghost" size="icon" aria-label="Закрыть режим">
            <Link href={`/set/${setId}`}>
              <X className="size-5" />
            </Link>
          </Button>
        </div>
        {typeof progress === "number" && (
          <div className="h-1 w-full bg-muted">
            <div className="h-full bg-primary transition-all duration-300" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
          </div>
        )}
      </header>
      <div className="flex-1">{children}</div>
    </div>
  )
}
