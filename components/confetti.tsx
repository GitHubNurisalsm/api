"use client"

import * as React from "react"

const COLORS = ["#4255ff", "#ffcd1f", "#23b26d", "#a855f7", "#ff6b81", "#0ea5e9"]

export function Confetti({ active, pieces = 70 }: { active: boolean; pieces?: number }) {
  const [items, setItems] = React.useState<{ id: number; left: number; delay: number; duration: number; color: string }[]>([])

  React.useEffect(() => {
    if (!active) {
      setItems([])
      return
    }
    setItems(
      Array.from({ length: pieces }, (_, index) => ({
        id: index,
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        duration: 1.8 + Math.random() * 1.4,
        color: COLORS[index % COLORS.length],
      })),
    )
    const timer = window.setTimeout(() => setItems([]), 3600)
    return () => window.clearTimeout(timer)
  }, [active, pieces])

  if (!items.length) return null

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      {items.map((item) => (
        <span
          key={item.id}
          className="confetti-piece"
          style={{
            left: `${item.left}%`,
            background: item.color,
            animationDelay: `${item.delay}s`,
            animationDuration: `${item.duration}s`,
          }}
        />
      ))}
    </div>
  )
}
