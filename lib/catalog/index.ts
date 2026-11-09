import type { CoursePack, Level } from "./types"
import { A1_PACKS } from "./a1"
import { A2_PACKS } from "./a2"
import { B1_PACKS } from "./b1"
import { B2_PACKS } from "./b2"
import { C1_PACKS } from "./c1"

export * from "./types"

export const DEUTSCH_COURSE: CoursePack[] = [...A1_PACKS, ...A2_PACKS, ...B1_PACKS, ...B2_PACKS, ...C1_PACKS]

export const LEVEL_ORDER: Level[] = ["A1", "A2", "B1", "B2", "C1"]

export function packsByLevel(level: Level) {
  return DEUTSCH_COURSE.filter((pack) => pack.level === level)
}

export function totalPairs(packs: CoursePack[]) {
  return packs.reduce((sum, pack) => sum + pack.pairs.length, 0)
}
