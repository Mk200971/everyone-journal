import { Target } from 'lucide-react'
import { Navbar } from "@/components/navbar"
import { createClient } from "@/lib/supabase/server"
import { redirect } from 'next/navigation'
import { MissionsPageClient } from "@/components/missions-page-client"

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
  display_order?: number
  created_at?: string
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

async function getMissionsData() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Get user profile to check role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  let query = supabase
    .from("missions")
    .select(
      `
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
      display_order,
      created_at,
      resources (
        id,
        title,
        description,
        type,
        url
      )
    `,
    )

  // If not admin, filter by assignments
  if (profile?.role !== "admin") {
    const { data: assignments } = await supabase
      .from("mission_assignments")
      .select("mission_id")
      .eq("user_id", user.id)

    const assignedMissionIds = assignments?.map((a) => a.mission_id) || []
    
    if (assignedMissionIds.length === 0) {
      return []
    }

    query = query.in("id", assignedMissionIds)
  }

  const { data: missions, error } = await query
    .order("display_order", { ascending: true, nullsLast: true })
    .order("created_at", { ascending: true })

  if (error) {
    console.error("Error fetching missions:", error)
    return []
  }

  return missions || []
}

export default async function MissionsPage() {
  const missions = await getMissionsData()

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
          <div className="text-center mb-8 sm:mb-10">
            <div className="bg-gradient-to-r from-primary/10 via-accent/5 to-secondary/10 backdrop-blur-lg border border-white/20 dark:border-white/10 rounded-xl p-6 sm:p-8 mb-6 sm:mb-8">
              <div className="flex flex-col items-center gap-4 mb-4">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-primary/20 rounded-full flex items-center justify-center">
                  <Target className="h-6 w-6 sm:h-8 sm:w-8 text-primary" aria-hidden="true" />
                </div>
                <div>
                  <h1 className="everyone-heading text-2xl sm:text-3xl lg:text-4xl xl:text-5xl mb-4 text-balance">
                    My Activities
                  </h1>
                  <p className="everyone-subheading text-base sm:text-lg lg:text-xl text-muted-foreground text-balance">
                    Complete activities to grow your skills, deepen your customer obsession mindset, and earn EP in the
                    process
                  </p>
                </div>
              </div>
            </div>
          </div>

          <MissionsPageClient missions={missions} />
        </main>
      </div>
    </div>
  )
}
