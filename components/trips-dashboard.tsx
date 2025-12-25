"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

type TripStatus = "Upcoming" | "Active" | "Completed"

interface Trip {
  id: string
  title: string
  dateRange: string
  status: TripStatus
  coverImage: string
}

const SAMPLE_TRIPS: Trip[] = [
  {
    id: "1",
    title: "Alpine Adventure",
    dateRange: "June 15-22, 2024",
    status: "Completed",
    coverImage: "/swiss-alps-mountains-snow-peaks.jpg",
  },
  {
    id: "2",
    title: "Tokyo Exploration",
    dateRange: "Aug 5-12, 2024",
    status: "Completed",
    coverImage: "/tokyo-skyline-cherry-blossoms.jpg",
  },
  {
    id: "3",
    title: "Santorini Dreams",
    dateRange: "Sept 20-27, 2024",
    status: "Active",
    coverImage: "/santorini-white-blue.png",
  },
  {
    id: "4",
    title: "Patagonia Expedition",
    dateRange: "Dec 10-20, 2024",
    status: "Upcoming",
    coverImage: "/patagonia-mountains-glacier-lake.jpg",
  },
  {
    id: "5",
    title: "Iceland Northern Lights",
    dateRange: "Jan 15-22, 2025",
    status: "Upcoming",
    coverImage: "/iceland-aurora-northern-lights.jpg",
  },
  {
    id: "6",
    title: "Bali Retreat",
    dateRange: "Mar 5-15, 2025",
    status: "Upcoming",
    coverImage: "/bali-rice-terraces-temple.jpg",
  },
]

function getStatusColor(status: TripStatus): string {
  switch (status) {
    case "Upcoming":
      return "bg-secondary text-secondary-foreground"
    case "Active":
      return "bg-primary text-primary-foreground"
    case "Completed":
      return "bg-muted text-muted-foreground"
  }
}

export function TripsDashboard() {
  const [trips] = useState<Trip[]>(SAMPLE_TRIPS)

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-balance">Your Journeys</h2>
          <p className="text-muted-foreground mt-1">
            {trips.length} {trips.length === 1 ? "trip" : "trips"} documented
          </p>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {trips.map((trip) => (
          <Link key={trip.id} href={`/trip/${trip.id}`}>
            <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 h-full">
              <div className="aspect-[4/3] overflow-hidden bg-accent">
                <img
                  src={trip.coverImage || "/placeholder.svg"}
                  alt={trip.title}
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-lg leading-tight text-balance">{trip.title}</h3>
                  <Badge className={getStatusColor(trip.status)} variant="secondary">
                    {trip.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{trip.dateRange}</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
