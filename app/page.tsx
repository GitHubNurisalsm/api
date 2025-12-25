import { Header } from "@/components/header"
import { TripsDashboard } from "@/components/trips-dashboard"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <TripsDashboard />
      </main>
    </div>
  )
}
