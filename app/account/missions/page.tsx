import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { ArrowLeft, ExternalLink, Calendar, Award } from "lucide-react"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export default async function AccountMissionsPage() {
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
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    },
  )

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/auth/login")
  }

  console.log("[v0] Fetching submissions for user:", user.id)

  const { data: submissionHistory } = await supabase
    .from("submissions")
    .select(`
      id,
      points_awarded,
      created_at,
      mission_id,
      text_submission,
      status
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  console.log("[v0] Server-side submission history:", submissionHistory)

  const missionIds = submissionHistory?.map((s) => s.mission_id) || []
  console.log("[v0] Mission IDs:", missionIds)

  const { data: missions } = await supabase.from("missions").select("id, title, description").in("id", missionIds)
  console.log("[v0] Missions data:", missions)

  const submissionHistoryWithTitles =
    submissionHistory?.map((submission) => {
      const mission = missions?.find((m) => m.id === submission.mission_id)
      return {
        ...submission,
        missions: {
          title: mission?.title || "Unknown Mission",
          description: mission?.description || "",
        },
      }
    }) || []

  console.log("[v0] Final submission history with titles:", submissionHistoryWithTitles)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-500/20 text-green-600 dark:text-green-400"
      case "pending":
        return "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400"
      case "rejected":
        return "bg-red-500/20 text-red-600 dark:text-red-400"
      default:
        return "bg-gray-500/20 text-gray-600 dark:text-gray-400"
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute top-40 right-20 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "2s" }}
        ></div>
        <div
          className="absolute bottom-20 left-1/3 w-80 h-80 bg-accent/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "4s" }}
        ></div>
      </div>

      <div className="container mx-auto px-3 sm:px-6 lg:px-8 relative z-10">
        <Navbar />

        <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 pb-6 sm:pb-8">
          <div className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 rounded-xl p-4 sm:p-8">
            <div className="flex items-center gap-4 mb-4">
              <Link href="/account">
                <Button variant="ghost" size="sm" className="hover:bg-white/10 dark:hover:bg-black/20">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Profile
                </Button>
              </Link>
            </div>
            <h1 className="text-2xl sm:text-4xl font-bold mb-2 sm:mb-3 text-foreground text-balance">My activities</h1>
            <p className="text-muted-foreground text-sm sm:text-lg leading-relaxed text-pretty">
              View all your submitted activities and their details
            </p>
          </div>

          {submissionHistoryWithTitles.length === 0 ? (
            <Card className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10">
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground text-lg">No missions submitted yet.</p>
                <Link href="/missions">
                  <Button className="mt-4 bg-primary hover:bg-primary/90 text-primary-foreground">
                    Browse Missions
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:gap-6">
              {submissionHistoryWithTitles.map((submission) => (
                <Card
                  key={submission.id}
                  className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 hover:scale-[1.01] transition-all duration-300"
                >
                  <CardHeader className="p-4 sm:p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle className="text-lg sm:text-xl text-foreground mb-2">
                          {submission.missions.title}
                        </CardTitle>
                        {submission.missions.description && (
                          <p className="text-muted-foreground text-sm line-clamp-2">
                            {submission.missions.description}
                          </p>
                        )}
                      </div>
                      <Badge className={`${getStatusColor(submission.status)} border-0`}>
                        {submission.status === "approved"
                          ? "Approved"
                          : submission.status === "pending"
                            ? "Pending"
                            : submission.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 pt-0">
                    <div className="space-y-4">
                      <div className="bg-white/5 dark:bg-black/10 rounded-lg p-4 border border-white/10 dark:border-white/5">
                        <h4 className="font-medium text-foreground mb-2">Your Submission</h4>
                        <p className="text-muted-foreground text-sm line-clamp-3">
                          {submission.text_submission || "No content available"}
                        </p>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {formatDate(submission.created_at)}
                          </div>
                          {submission.status === "approved" && (
                            <div className="flex items-center gap-1">
                              <Award className="h-4 w-4" />+{submission.points_awarded} EP
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Link href={`/mission/${submission.mission_id}`}>
                            <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                              <ExternalLink className="h-4 w-4 mr-2" />
                              View Activity
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
