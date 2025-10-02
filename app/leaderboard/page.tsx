import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from "next/link"
import { Trophy } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { Navbar } from "@/components/navbar"

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

  const { data: users, error } = await supabase.rpc("get_leaderboard")

  if (error) {
    console.error("Error fetching leaderboard:", error)
  }

  const sortedUsers = users || []

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

          {sortedUsers.length > 0 && (
            <div className="mb-8 sm:mb-12">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-6">
                {sortedUsers.slice(0, 3).map((user, index) => {
                  const rank = index + 1
                  const medal = getMedalEmoji(rank)
                  const isFirst = rank === 1

                  return (
                    <Card
                      key={user.id}
                      className={`relative overflow-hidden transition-all duration-300 hover:scale-105 ${
                        isFirst
                          ? "bg-gradient-to-br from-accent/20 to-primary/10 border-accent/30 md:order-2 md:scale-110"
                          : rank === 2
                            ? "bg-gradient-to-br from-primary/15 to-secondary/10 border-primary/25 md:order-1"
                            : "bg-gradient-to-br from-secondary/15 to-muted/20 border-secondary/25 md:order-3"
                      } backdrop-blur-lg border-2`}
                    >
                      <div className="absolute top-3 right-3">
                        <div className="bg-white/20 dark:bg-black/30 backdrop-blur-sm rounded-full px-2 py-1 border border-white/20">
                          <span className="text-xs font-bold text-foreground">#{rank}</span>
                        </div>
                      </div>

                      <CardContent className="p-4 sm:p-6 text-center">
                        <div className="mb-4">
                          {medal && <div className="text-4xl sm:text-5xl mb-2">{medal}</div>}
                          <Link href={`/user/${user.id}`} className="inline-block">
                            <Avatar
                              className={`mx-auto ring-4 hover:ring-primary/60 transition-all duration-200 cursor-pointer ${
                                isFirst
                                  ? "ring-accent/50 h-16 w-16 sm:h-20 sm:w-20"
                                  : "ring-primary/30 h-14 w-14 sm:h-16 sm:w-16"
                              }`}
                            >
                              <AvatarImage src={user.avatar_url || "/placeholder.svg"} alt={user.name} />
                              <AvatarFallback className="bg-primary/20 text-foreground font-bold text-lg">
                                {user.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                          </Link>
                        </div>

                        <div className="space-y-3 mb-4">
                          <h3 className="font-bold text-foreground text-lg sm:text-xl">{user.name}</h3>

                          <div className="space-y-2">
                            <div className="bg-white/10 dark:bg-black/20 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                              <div className="space-y-1">
                                <div className="flex items-center justify-center">
                                  <span className="text-sm font-medium text-primary/80">Job Title:</span>
                                </div>
                                <p className="text-sm sm:text-base text-foreground font-medium text-center">
                                  {user.job_title || "Not specified"}
                                </p>
                              </div>
                            </div>

                            <div className="bg-white/10 dark:bg-black/20 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                              <div className="space-y-1">
                                <div className="flex items-center justify-center">
                                  <span className="text-sm font-medium text-primary/80">Department:</span>
                                </div>
                                <p className="text-sm sm:text-base text-foreground font-medium text-center">
                                  {user.department || "Not specified"}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap justify-center gap-2 text-xs sm:text-sm text-muted-foreground">
                            {user.country && (
                              <span className="bg-white/20 dark:bg-black/30 backdrop-blur-sm rounded-full px-2 py-1 border border-white/20">
                                📍 {user.country}
                              </span>
                            )}
                          </div>

                          {user.bio && (
                            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                              {user.bio}
                            </p>
                          )}

                          {user.customer_obsession && (
                            <div className="bg-white/10 dark:bg-black/20 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                              <p className="text-xs font-medium text-primary/80 mb-1">Customer Obsession</p>
                              <p className="text-xs sm:text-sm text-foreground/90 italic line-clamp-3">
                                "{user.customer_obsession}"
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="bg-white/20 dark:bg-black/20 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/20">
                          <div className="text-2xl sm:text-3xl font-bold text-foreground">
                            {user.total_points.toLocaleString()}
                          </div>
                          <div className="text-xs text-muted-foreground uppercase tracking-wide">EP</div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}

          {sortedUsers.length > 3 && (
            <Card className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10">
              <CardHeader className="p-4 sm:p-6 border-b border-white/10">
                <CardTitle className="text-lg sm:text-xl text-foreground flex items-center gap-2">
                  <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                  All member rankings
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-white/5">
                  {sortedUsers.slice(3).map((user, index) => {
                    const rank = index + 4

                    return (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-3 sm:p-4 hover:bg-white/5 dark:hover:bg-black/10 transition-all duration-200"
                      >
                        <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                          <div className="bg-white/10 dark:bg-black/20 backdrop-blur-sm border border-white/20 rounded-lg px-2 py-1 min-w-[40px] text-center">
                            <span className="text-sm font-semibold text-foreground">#{rank}</span>
                          </div>

                          <Link href={`/user/${user.id}`} className="flex-shrink-0">
                            <Avatar className="h-10 w-10 sm:h-12 sm:w-12 ring-2 ring-white/10 hover:ring-primary/40 transition-all duration-200 cursor-pointer">
                              <AvatarImage src={user.avatar_url || "/placeholder.svg"} alt={user.name} />
                              <AvatarFallback className="bg-primary/20 text-foreground font-semibold text-sm">
                                {user.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                          </Link>

                          <span className="font-medium text-foreground text-sm sm:text-base truncate">{user.name}</span>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <div className="bg-white/10 dark:bg-black/20 backdrop-blur-sm border border-white/20 rounded-lg px-3 py-1">
                            <span className="text-base sm:text-lg font-bold text-foreground">
                              {user.total_points.toLocaleString()}
                            </span>
                            <p className="text-xs text-muted-foreground">EP</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
