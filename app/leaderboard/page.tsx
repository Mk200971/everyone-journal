import { createClient } from "@/lib/supabase/server"
import { Navbar } from "@/components/navbar"
import { LeaderboardClient } from "@/components/leaderboard-client"

const getMedalEmoji = (rank: number) => {
  switch (rank) {
    case 1:
      return "🥇"
    case 2:
      return "🥈"
    case 3:
      return "🥉"
    default:
      return null
  }
}

const getRowBackground = (rank: number) => {
  if (rank <= 3) {
    return "bg-gradient-to-r from-primary/20 to-secondary/20"
  }
  return ""
}

export default async function LeaderboardPage() {
  const supabase = await createClient()

  const USERS_PER_PAGE = 50

  const { data: initialUsers, error } = await supabase.rpc("get_leaderboard").range(0, USERS_PER_PAGE - 1)

  if (error) {
    console.error("Error fetching leaderboard:", error)
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute bottom-20 right-20 w-80 h-80 bg-accent/5 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "3s" }}
        ></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <Navbar />

        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-6 sm:mb-10">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-3 sm:mb-4">Leaderboard</h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
              Celebrating our most customer obsessed community members
            </p>
          </div>

          <LeaderboardClient initialUsers={initialUsers || []} />
        </div>
      </div>
    </div>
  )
}
