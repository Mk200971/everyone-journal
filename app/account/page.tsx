import { redirect } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { createClient } from "@/lib/supabase/server"
import { AccountPageClient } from "@/components/account-page-client"

async function getAccountData() {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/auth")
  }

  // Fetch all data in parallel on the server
  const [profileResult, submissionsResult, allProfilesResult, submissionHistoryResult] = await Promise.allSettled([
    supabase.from("profiles").select("*").eq("id", user.id).single(),

    supabase.from("submissions").select("points_awarded").eq("user_id", user.id).eq("status", "approved"),

    supabase.from("profiles").select("id, total_points").order("total_points", { ascending: false }),

    supabase
      .from("submissions")
      .select(`
        id,
        points_awarded,
        created_at,
        mission_id,
        text_submission,
        answers,
        media_url,
        status
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ])

  const profile = profileResult.status === "fulfilled" ? profileResult.value.data : null
  const userSubmissions = submissionsResult.status === "fulfilled" ? submissionsResult.value.data || [] : []
  const allProfiles = allProfilesResult.status === "fulfilled" ? allProfilesResult.value.data || [] : []
  const submissionHistory =
    submissionHistoryResult.status === "fulfilled" ? submissionHistoryResult.value.data || [] : []

  // Fetch mission titles for submission history
  const missionIds = submissionHistory.map((s) => s.mission_id)
  const { data: missions } = await supabase.from("missions").select("id, title").in("id", missionIds)

  const submissionHistoryWithTitles = submissionHistory.map((submission) => ({
    ...submission,
    missions: { title: missions?.find((m) => m.id === submission.mission_id)?.title || "Unknown Mission" },
  }))

  const totalPoints = userSubmissions.reduce((sum, submission) => sum + (submission.points_awarded || 0), 0)
  const missionsCompleted = userSubmissions.length
  const userRank = allProfiles.findIndex((p) => p.id === user.id) + 1

  return {
    user,
    profile,
    totalPoints,
    missionsCompleted,
    userRank,
    submissionHistoryWithTitles,
  }
}

export default async function AccountPage() {
  const data = await getAccountData()

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

        <div className="max-w-2xl mx-auto space-y-6 sm:space-y-8 pb-6 sm:pb-8">
          <div className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 rounded-xl p-4 sm:p-8 text-center">
            <h1 className="text-2xl sm:text-4xl font-bold mb-2 sm:mb-3 text-foreground text-balance">My Profile</h1>
            <p className="text-muted-foreground text-sm sm:text-lg leading-relaxed text-pretty">
              Manage your profile and view your progress
            </p>
          </div>

          <AccountPageClient initialData={data} />
        </div>
      </div>
    </div>
  )
}
