"use client"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MapPin, Plus } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { CreateTripModal } from "./create-trip-modal"

export function Header() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 max-w-7xl">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <MapPin className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold tracking-tight">Traveler's Diary</h1>
          </Link>

          <nav className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                My Trips
              </Button>
            </Link>
            <Button onClick={() => setIsCreateModalOpen(true)} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New Journey</span>
            </Button>
            <Avatar className="h-9 w-9">
              <AvatarImage src="/lone-traveler-mountain-path.png" alt="User" />
              <AvatarFallback>JD</AvatarFallback>
            </Avatar>
          </nav>
        </div>
      </header>

      <CreateTripModal open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} />
    </>
  )
}
