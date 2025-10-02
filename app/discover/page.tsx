import { createClient } from "@/lib/supabase/server"
import { Navbar } from "@/components/navbar"
import { DiscoverClient } from "@/components/discover-client"
import { Compass } from "lucide-react"

interface Submission {
  id: string
  created_at: string
  text_submission: string | null
  media_url: string | null
  answers: any
  mission_id: string
  user_id: string
  points_awarded: number
}

interface Mission {
  id: string
  title: string
  type: string
}

interface Profile {
  id: string
  name: string
  avatar_url: string | null
  job_title: string | null
  department: string | null
}

async function getDiscoverData() {
  const supabase = await createClient()

  // Fetch approved submissions
  const { data: submissions, error: submissionsError } = await supabase
    .from("submissions")
    .select("id, created_at, text_submission, media_url, answers, mission_id, user_id, points_awarded")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(50)

  if (submissionsError) {
    console.error("[v0] Error fetching submissions:", submissionsError)
    return { submissions: [], missions: [], profiles: [] }
  }

  if (!submissions || submissions.length === 0) {
    return { submissions: [], missions: [], profiles: [] }
  }

  // Get unique mission IDs and user IDs
  const missionIds = [...new Set(submissions.map((s) => s.mission_id))]
  const userIds = [...new Set(submissions.map((s) => s.user_id))]

  // Fetch missions
  const { data: missions, error: missionsError } = await supabase
    .from("missions")
    .select("id, title, type")
    .in("id", missionIds)

  // Fetch profiles
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, name, avatar_url, job_title, department")
    .in("id", userIds)

  return {
    submissions: submissions || [],
    missions: missions || [],
    profiles: profiles || [],
  }
}

export default async function DiscoverPage() {
  const data = await getDiscoverData()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-4 sm:left-10 w-48 h-48 sm:w-72 sm:h-72 bg-primary/5 sm:bg-primary/10 rounded-full blur-2xl sm:blur-3xl animate-pulse"></div>
        <div
          className="absolute top-40 right-4 sm:right-20 w-64 h-64 sm:w-96 sm:h-96 bg-secondary/5 sm:bg-secondary/10 rounded-full blur-2xl sm:blur-3xl animate-pulse"
          style={{ animationDelay: "2s" }}
        ></div>
        <div
          className="absolute bottom-20 left-1/4 sm:left-1/3 w-56 h-56 sm:w-80 sm:h-80 bg-accent/5 sm:bg-accent/10 rounded-full blur-2xl sm:blur-3xl animate-pulse"
          style={{ animationDelay: "4s" }}
        ></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 max-w-7xl">
        <Navbar />
        <main className="pb-8 sm:pb-12">
          <div className="mb-8 sm:mb-10">
            <div className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 rounded-xl p-6 sm:p-8">
              <h1 className="everyone-heading text-2xl sm:text-3xl lg:text-4xl xl:text-5xl text-balance leading-tight flex items-center gap-3 mb-3">
                <Compass className="h-6 w-6 sm:h-8 sm:w-8 text-primary flex-shrink-0" />
                <span>Discover</span>
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base lg:text-lg text-pretty leading-relaxed">
                Explore journal entries from the EVERYONE community. Get inspired by others' reflections and
                experiences.
              </p>
            </div>
          </div>

          <DiscoverClient initialData={data} currentUserId={user?.id || null} />
        </main>
      </div>
    </div>
  )
}
