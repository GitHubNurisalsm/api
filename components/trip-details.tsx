"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Clock, Camera, Plus, MapIcon } from "lucide-react"
import { useState } from "react"
import { AddWaypointModal } from "./add-waypoint-modal"
import { useMobile } from "@/hooks/use-mobile"

interface Waypoint {
  id: string
  locationName: string
  timestamp: string
  note: string
  images: string[]
  coordinates: {
    lat: number
    lng: number
  }
}

const SAMPLE_WAYPOINTS: Record<string, Waypoint[]> = {
  "1": [
    {
      id: "1",
      locationName: "Zermatt Village",
      timestamp: "June 15, 2024 - 10:30 AM",
      note: "Arrived at the charming mountain village. The air is crisp and the views of the Matterhorn are breathtaking!",
      images: ["/zermatt-village-alpine.jpg"],
      coordinates: { lat: 46.0207, lng: 7.7491 },
    },
    {
      id: "2",
      locationName: "Gornergrat Railway Summit",
      timestamp: "June 16, 2024 - 2:15 PM",
      note: "Took the scenic cogwheel railway to 3,089m altitude. 360° panoramic views of Monte Rosa and surrounding peaks.",
      images: ["/gornergrat-summit-view.jpg", "/matterhorn-mountain.jpg"],
      coordinates: { lat: 45.9833, lng: 7.7833 },
    },
    {
      id: "3",
      locationName: "Glacier Paradise",
      timestamp: "June 18, 2024 - 11:00 AM",
      note: "Europe's highest cable car station at 3,883m. Walked through the glacier ice palace - absolutely surreal experience!",
      images: ["/ice-glacier-palace.jpg"],
      coordinates: { lat: 45.9389, lng: 7.7286 },
    },
    {
      id: "4",
      locationName: "Five Lakes Walk",
      timestamp: "June 20, 2024 - 9:45 AM",
      note: "Hiked the famous 5-Seenweg trail. Each alpine lake reflected the Matterhorn perfectly. Pure magic.",
      images: ["/alpine-lake-reflection.png"],
      coordinates: { lat: 46.0125, lng: 7.7563 },
    },
  ],
  "2": [
    {
      id: "1",
      locationName: "Shibuya Crossing",
      timestamp: "Aug 5, 2024 - 7:30 PM",
      note: "First stop in Tokyo! The famous scramble crossing at night is even more spectacular than imagined. Neon lights everywhere!",
      images: ["/shibuya-crossing-tokyo-night.jpg"],
      coordinates: { lat: 35.6595, lng: 139.7004 },
    },
  ],
  "3": [
    {
      id: "1",
      locationName: "Oia Village",
      timestamp: "Sept 20, 2024 - 6:15 PM",
      note: "Currently here! Watching the world-famous sunset over the caldera. The blue domes and white buildings glow golden.",
      images: ["/santorini-oia-sunset.jpg"],
      coordinates: { lat: 36.4618, lng: 25.3753 },
    },
  ],
}

const TRIP_NAMES: Record<string, string> = {
  "1": "Alpine Adventure",
  "2": "Tokyo Exploration",
  "3": "Santorini Dreams",
  "4": "Patagonia Expedition",
  "5": "Iceland Northern Lights",
  "6": "Bali Retreat",
}

export function TripDetails({ tripId }: { tripId: string }) {
  const [isAddWaypointOpen, setIsAddWaypointOpen] = useState(false)
  const [showMap, setShowMap] = useState(false)
  const isMobile = useMobile()
  const waypoints = SAMPLE_WAYPOINTS[tripId] || []
  const tripName = TRIP_NAMES[tripId] || "Unknown Trip"

  return (
    <>
      <div className="h-full flex flex-col lg:flex-row">
        {/* Timeline Section */}
        <div className={`flex-1 overflow-y-auto ${isMobile && showMap ? "hidden" : "block"}`}>
          <div className="container mx-auto px-4 py-6 max-w-3xl">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-balance">{tripName}</h1>
                <p className="text-muted-foreground mt-1">
                  {waypoints.length} {waypoints.length === 1 ? "location" : "locations"} visited
                </p>
              </div>
              <Button onClick={() => setIsAddWaypointOpen(true)} size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Waypoint
              </Button>
            </div>

            {waypoints.length > 0 ? (
              <div className="relative">
                {/* Vertical Timeline Line */}
                <div className="absolute left-[19px] top-6 bottom-6 w-0.5 bg-border" />

                <div className="space-y-8">
                  {waypoints.map((waypoint, index) => (
                    <div key={waypoint.id} className="relative pl-12">
                      {/* Timeline Dot */}
                      <div className="absolute left-0 top-2 w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                        <MapPin className="h-5 w-5 text-primary-foreground" />
                      </div>

                      <Card>
                        <CardContent className="p-5 space-y-4">
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-semibold text-lg text-balance">{waypoint.locationName}</h3>
                              <Badge variant="outline" className="whitespace-nowrap">
                                {index + 1} of {waypoints.length}
                              </Badge>
                            </div>

                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              <span>{waypoint.timestamp}</span>
                            </div>
                          </div>

                          <p className="text-sm leading-relaxed text-pretty">{waypoint.note}</p>

                          {waypoint.images.length > 0 && (
                            <div className="flex gap-3 overflow-x-auto pb-2">
                              {waypoint.images.map((image, idx) => (
                                <div
                                  key={idx}
                                  className="relative flex-shrink-0 w-32 h-24 rounded-lg overflow-hidden bg-accent group"
                                >
                                  <img
                                    src={image || "/placeholder.svg"}
                                    alt={`${waypoint.locationName} ${idx + 1}`}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                  />
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                    <Camera className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="pt-2 border-t border-border">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                              <MapPin className="h-3 w-3" />
                              <span>
                                {waypoint.coordinates.lat.toFixed(4)}°, {waypoint.coordinates.lng.toFixed(4)}°
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <Card className="p-12 text-center">
                <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg mb-2">No waypoints yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Start documenting your journey by adding your first location
                </p>
                <Button onClick={() => setIsAddWaypointOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add First Waypoint
                </Button>
              </Card>
            )}
          </div>
        </div>

        {/* Map Section */}
        <div
          className={`${isMobile ? (showMap ? "w-full" : "hidden") : "w-full lg:w-2/5"} bg-accent border-l border-border flex items-center justify-center p-6 lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)]`}
        >
          <div className="text-center space-y-4 max-w-md">
            <div className="mx-auto w-24 h-24 rounded-full bg-secondary flex items-center justify-center">
              <MapIcon className="h-12 w-12 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Interactive Map</h3>
              <p className="text-sm text-muted-foreground text-pretty">
                Your waypoints would appear on an interactive map here. Integration with mapping services like Mapbox or
                Google Maps can display your journey route.
              </p>
            </div>
            {waypoints.length > 0 && (
              <div className="pt-4">
                <p className="text-xs text-muted-foreground mb-2">Tracked Locations:</p>
                <div className="space-y-1">
                  {waypoints.map((wp) => (
                    <div key={wp.id} className="text-xs font-mono bg-card p-2 rounded">
                      {wp.coordinates.lat.toFixed(4)}°, {wp.coordinates.lng.toFixed(4)}°
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Map Toggle */}
        {isMobile && waypoints.length > 0 && (
          <div className="fixed bottom-4 right-4 z-50">
            <Button onClick={() => setShowMap(!showMap)} size="lg" className="rounded-full shadow-lg gap-2">
              <MapIcon className="h-5 w-5" />
              {showMap ? "Show Timeline" : "Show Map"}
            </Button>
          </div>
        )}
      </div>

      <AddWaypointModal open={isAddWaypointOpen} onOpenChange={setIsAddWaypointOpen} />
    </>
  )
}
