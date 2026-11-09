export type Level = "A1" | "A2" | "B1" | "B2" | "C1"

export type CoursePack = {
  id: string
  level: Level
  title: string
  description: string
  kind: "vocab" | "grammar" | "phrases"
  pairs: [string, string][]
}

export const LEVEL_INFO: Record<Level, { label: string; caption: string; color: string }> = {
  A1: { label: "A1", caption: "Начальный — выживание в быту", color: "#22c55e" },
  A2: { label: "A2", caption: "Базовый — простое общение", color: "#0ea5e9" },
  B1: { label: "B1", caption: "Пороговый — самостоятельная речь", color: "#4255ff" },
  B2: { label: "B2", caption: "Продвинутый — свободное общение", color: "#a855f7" },
  C1: { label: "C1", caption: "Профессиональный — нюансы и стиль", color: "#ef4444" },
}
