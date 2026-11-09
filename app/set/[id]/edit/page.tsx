"use client"

import { useParams } from "next/navigation"
import { SetEditor } from "@/components/set-editor"
import { useSet, useStore } from "@/lib/store"
import { NotFoundSet } from "@/components/not-found-set"
import { Skeleton } from "@/components/ui/skeleton"

export default function EditSetPage() {
  const params = useParams<{ id: string }>()
  const { ready } = useStore()
  const set = useSet(params.id)

  if (!ready) return <Skeleton className="mx-auto mt-10 h-64 max-w-4xl rounded-xl" />
  if (!set) return <NotFoundSet />
  return <SetEditor existing={set} />
}
