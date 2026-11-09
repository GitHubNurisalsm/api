import Link from "next/link"
import { SearchX } from "lucide-react"
import { Button } from "@/components/ui/button"

export function NotFoundSet() {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <SearchX className="mx-auto size-10 text-muted-foreground" />
      <h1 className="mt-4 text-xl font-extrabold">Модуль не найден</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Возможно, он был удалён или вы открыли ссылку на другом устройстве — данные хранятся локально в браузере.
      </p>
      <Button asChild className="mt-6 rounded-full font-bold">
        <Link href="/library">В библиотеку</Link>
      </Button>
    </div>
  )
}
