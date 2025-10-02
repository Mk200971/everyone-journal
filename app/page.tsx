import { QuoteCarousel } from "@/components/quote-carousel"
import { Navbar } from "@/components/navbar"
import { fetchAllCommunityActivity } from "@/lib/actions"
import { createClient } from "@/lib/supabase/server"
import { HomePageClient } from "@/components/home-page-client"

interface Mission {
  id: string
  title: string
  description: string
  points_value: number
  type?: string
  image_url?: string
  duration?: string
  coordinator?: string
  support_status?: string
  due_date?: string
  mission_number?: number
  resources?: Resource[]
}

interface Resource {
  id: string
  title: string
  description: string
  type: string
  url: string
  created_at: string
}

interface RecentActivity {
  id: string
  created_at: string
  points_awarded: number
  user_name: string
  mission_title: string
  user_avatar_url: string | null
  user_id?: string
  status: string
  type?: string
  changed_fields?: string[]
}

interface LeaderboardEntry {
  id: string
  name: string
  avatar_url: string | null
  total_points: number
  rank: number
  job_title?: string
  department?: string
  activityCount?: number
}

interface NoticeboardItem {
  id: string
  title: string
  content: string
  author: string
  author_title: string
  year: string
  image_url: string
  is_active: boolean
  display_order: number
}

interface HomePageData {
  missions: Mission[]
  resources: Resource[]
  recentActivity: RecentActivity[]
  topUsers: LeaderboardEntry[]
  user: any
  userProfile: { name: string } | null
  quotes: NoticeboardItem[]
}

async function getHomePageData(): Promise<HomePageData> {
  const supabase = await createClient()

  // Get user from server-side authentication
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  console.log("[v0] Server-side user authentication:", user ? "authenticated" : "not authenticated", user?.id)

  let userProfile = null
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, name, avatar_url, total_points")
      .eq("id", user.id)
      .single()
    userProfile = profile
    console.log("[v0] User profile loaded:", profile?.name)
  }

  const [missionsResult, resourcesResult, activityResult, topUsersResult, quotesResult] = await Promise.allSettled([
    supabase
      .from("missions")
      .select(`
        id,
        title,
        description,
        points_value,
        type,
        image_url,
        duration,
        coordinator,
        support_status,
        due_date,
        mission_number,
        resources (
          id,
          title,
          description,
          type,
          url
        )
      `)
      .order("display_order", { ascending: true, nullsLast: true })
      .order("created_at", { ascending: true }),

    supabase
      .from("resources")
      .select("id, title, description, type, url, created_at")
      .order("created_at", { ascending: false }),

    // Fetch recent activity
    fetchAllCommunityActivity(),

    supabase
      .from("profiles")
      .select("id, name, avatar_url, total_points, job_title, department")
      .order("total_points", { ascending: false })
      .limit(3),

    supabase
      .from("noticeboard_items")
      .select("id, title, content, author, author_title, year, image_url, is_active, display_order")
      .eq("is_active", true)
      .order("display_order", { ascending: true }),
  ])

  const missions = missionsResult.status === "fulfilled" && missionsResult.value.data ? missionsResult.value.data : []
  const resources =
    resourcesResult.status === "fulfilled" && resourcesResult.value.data ? resourcesResult.value.data : []
  const recentActivity =
    activityResult.status === "fulfilled" && activityResult.value.success ? activityResult.value.data : []
  const topUsersData =
    topUsersResult.status === "fulfilled" && topUsersResult.value.data ? topUsersResult.value.data : []

  const quotes = quotesResult.status === "fulfilled" && quotesResult.value.data ? quotesResult.value.data : []
  console.log("[v0] Server-side quotes loaded:", quotes.length, "items")
  if (quotesResult.status === "rejected") {
    console.error("[v0] Server-side quotes error:", quotesResult.reason)
  }

  const topUsers = await Promise.all(
    topUsersData.map(async (profile, index) => {
      const { count } = await supabase
        .from("submissions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", profile.id)
        .eq("status", "approved")

      return {
        ...profile,
        rank: index + 1,
        activityCount: count || 0,
      }
    }),
  )

  return {
    missions,
    resources,
    recentActivity,
    topUsers,
    user,
    userProfile,
    quotes,
  }
}

export default async function HomePage() {
  const data = await getHomePageData()

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
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
          <div className="mb-8 sm:mb-10"></div>
          <QuoteCarousel initialQuotes={data.quotes} />

          <HomePageClient initialData={data} />
        </main>
      </div>
    </div>
  )
}
