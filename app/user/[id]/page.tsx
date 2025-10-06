import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Trophy, MapPin, Briefcase, Calendar, ArrowLeft, Users, Target, Globe } from "lucide-react"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { notFound } from "next/navigation"
import { getAvatarColor } from "@/lib/utils"

interface UserProfile {
  id: string
  name: string
  avatar_url?: string
  bio?: string
  job_title?: string
  department?: string
  location?: string
  country?: string
  customer_obsession?: string
  created_at: string
  total_points: number
  completed_missions: number
  rank: number
}

interface UserSubmission {
  id: string
  mission_title: string
  mission_id: string
  points_awarded: number
  created_at: string
  status: string
}

async function getUserProfile(userId: string): Promise<{ profile: UserProfile; submissions: UserSubmission[] } | null> {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {}
        },
      },
    },
  )

  console.log("[v0] Fetching profile for user ID:", userId)

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*, customer_obsession")
    .eq("id", userId)
    .single()

  console.log("[v0] Profile data:", profile)
  console.log("[v0] Profile error:", profileError)

  if (profileError || !profile) {
    console.log("[v0] Profile not found or error occurred")
    return null
  }

  const { data: submissions, error: submissionsError } = await supabase
    .from("submissions")
    .select("id, points_awarded, created_at, status, mission_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  console.log("[v0] User submissions:", submissions?.length || 0)
  console.log("[v0] Submissions error:", submissionsError)

  let missionsData: any[] = []
  if (submissions && submissions.length > 0) {
    const missionIds = submissions.map((s) => s.mission_id)
    const { data: missions } = await supabase.from("missions").select("id, title").in("id", missionIds)

    missionsData = missions || []
    console.log("[v0] Fetched missions:", missionsData.length)
  }

  const totalPoints = profile.total_points || 0
  const completedMissions = submissions?.length || 0

  const { data: allUsers } = await supabase
    .from("profiles")
    .select("id, total_points")
    .order("total_points", { ascending: false })

  console.log("[v0] All users for ranking:", allUsers?.slice(0, 5))

  const userRank = allUsers?.findIndex((user) => user.id === userId) + 1 || 0

  console.log("[v0] User rank calculated:", userRank)

  const userProfile: UserProfile = {
    ...profile,
    total_points: totalPoints,
    completed_missions: completedMissions,
    rank: userRank,
  }

  console.log("[v0] Final user profile:", userProfile)

  const userSubmissions: UserSubmission[] =
    submissions?.map((sub) => {
      const mission = missionsData.find((m) => m.id === sub.mission_id)
      return {
        id: sub.id,
        mission_title: mission?.title || "Unknown Mission",
        mission_id: sub.mission_id,
        points_awarded: sub.points_awarded || 0,
        created_at: sub.created_at,
        status: sub.status,
      }
    }) || []

  return { profile: userProfile, submissions: userSubmissions }
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export default async function UserProfilePage({ params }: { params: { id: string } }) {
  const data = await getUserProfile(params.id)

  if (!data) {
    notFound()
  }

  const { profile, submissions } = data

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-4 sm:left-10 w-48 h-48 sm:w-72 sm:h-72 bg-primary/5 sm:bg-primary/10 rounded-full blur-2xl sm:blur-3xl animate-pulse"></div>
        <div
          className="absolute top-40 right-4 sm:right-20 w-64 h-64 sm:w-96 sm:h-96 bg-secondary/5 sm:bg-secondary/10 rounded-full blur-2xl sm:blur-3xl animate-pulse"
          style={{ animationDelay: "2s" }}
        ></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 max-w-7xl">
        <Navbar />

        <main className="pb-8 sm:pb-12">
          <div className="max-w-4xl mx-auto">
            {/* Back button moved here */}
            <div className="mb-6">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/activity" className="flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Link>
              </Button>
            </div>

            {/* Profile Header with Core Beliefs */}
            <Card className="mb-8">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                  <Avatar className="h-24 w-24 flex-shrink-0">
                    <AvatarImage src={profile.avatar_url || undefined} />
                    <AvatarFallback className={`text-2xl ${getAvatarColor(profile.id, profile.name)}`}>
                      {profile.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <h1 className="text-3xl font-bold mb-2">{profile.name}</h1>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
                      {profile.job_title && (
                        <div className="flex items-center gap-1">
                          <Briefcase className="h-4 w-4" />
                          {profile.job_title}
                        </div>
                      )}
                      {profile.department && (
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {profile.department}
                        </div>
                      )}
                      {profile.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {profile.location}
                        </div>
                      )}
                      {profile.country && (
                        <div className="flex items-center gap-1">
                          <Globe className="h-4 w-4" />
                          {profile.country}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Joined {formatDate(profile.created_at)}
                      </div>
                    </div>

                    {profile.bio && <p className="text-muted-foreground mb-4">{profile.bio}</p>}

                    {profile.customer_obsession && (
                      <div className="mb-4 p-4 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Target className="h-4 w-4 text-primary" />
                          <h3 className="font-medium text-sm">Customer Obsession Belief</h3>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
                          <div>
                            <h4 className="font-medium text-sm">I believe that Customer Obsession is...</h4>
                            <p className="text-xs text-muted-foreground">{profile.customer_obsession}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-3">
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Trophy className="h-4 w-4" />
                        Rank #{profile.rank}
                      </Badge>
                      <Badge variant="outline">{profile.total_points} EP</Badge>
                      <Badge variant="outline">{profile.completed_missions} Activities completed</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-8">
              <Card>
                <CardContent className="p-3 sm:p-4 text-center">
                  <Trophy className="h-6 w-6 sm:h-8 sm:w-8 text-accent mx-auto mb-2" />
                  <div className="text-lg sm:text-2xl font-bold">{profile.total_points}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Total EP</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-3 sm:p-4 text-center">
                  <Target className="h-6 w-6 sm:h-8 sm:w-8 text-accent mx-auto mb-2" />
                  <div className="text-lg sm:text-2xl font-bold">{profile.completed_missions}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Activities Submitted</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-3 sm:p-4 text-center">
                  <Users className="h-6 w-6 sm:h-8 sm:w-8 text-accent mx-auto mb-2" />
                  <div className="text-lg sm:text-2xl font-bold">#{profile.rank}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Leaderboard Rank</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Activities by {profile.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {submissions.length > 0 ? (
                  <div className="space-y-4">
                    {submissions.slice(0, 10).map((submission) => (
                      <div key={submission.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                        <div className="flex-1">
                          <Link
                            href={`/mission/${submission.mission_id}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {submission.mission_title}
                          </Link>
                          <p className="text-sm text-muted-foreground">
                            {submission.status === "approved" ? "Completed" : submission.status} on{" "}
                            {formatDate(submission.created_at)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {submission.status === "approved" && (
                            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                              Approved
                            </Badge>
                          )}
                          {submission.status === "pending" && (
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                              Pending
                            </Badge>
                          )}
                          {submission.status === "rejected" && (
                            <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">
                              Rejected
                            </Badge>
                          )}
                          {submission.status === "draft" && (
                            <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                              Draft
                            </Badge>
                          )}
                          <Badge variant="secondary">
                            {submission.status === "approved" ? "+" : ""}
                            {submission.points_awarded} EP
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No activities yet</h3>
                    <p className="text-muted-foreground">{profile.name} hasn't submitted any activities yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
