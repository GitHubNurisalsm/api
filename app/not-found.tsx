import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <p className="text-5xl font-extrabold text-primary">404</p>
      <h1 className="mt-4 text-xl font-extrabold">Страница не найдена</h1>
      <p className="mt-2 text-sm text-muted-foreground">Возможно, ссылка устарела.</p>
      <Button asChild className="mt-6 rounded-full font-bold">
        <Link href="/">На главную</Link>
      </Button>
    </div>
  )
}
