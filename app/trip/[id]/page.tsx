import { Header } from "@/components/header"
import { TripDetails } from "@/components/trip-details"

export default function TripPage({ params }: { params: { id: string } }) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="h-[calc(100vh-4rem)]">
        <TripDetails tripId={params.id} />
      </main>
    </div>
  )
}
