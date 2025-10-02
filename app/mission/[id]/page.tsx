import { Suspense } from "react"
import { notFound } from "next/navigation"
import { MissionClient } from "./mission-client"
import { Navbar } from "@/components/navbar"
import { createClient } from "@/lib/supabase/server"

interface MissionDetailPageProps {
  params: Promise<{
    id: string
  }>
}

async function getMissionData(id: string) {
  const supabase = await createClient()

  const { data: missionData, error } = await supabase.from("missions").select("*").eq("id", id).single()

  if (error || !missionData) {
    console.log("[v0] Mission not found:", id, error?.message)
    notFound()
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    console.log("[v0] Error getting user:", userError.message)
  }

  let profile = null
  if (user) {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("id, name, avatar_url, total_points")
      .eq("id", user.id)
      .single()
    profile = profileData
  }

  let existingSubmissions = []
  if (user) {
    const { data: submissions } = await supabase
      .from("submissions")
      .select("*")
      .eq("mission_id", id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    existingSubmissions = submissions || []
  }

  let linkedResource = null
  if (missionData.resource_id) {
    const { data: resource, error } = await supabase
      .from("resources")
      .select("*")
      .eq("id", missionData.resource_id)
      .single()
    if (!error && resource) {
      linkedResource = resource
    }
  }

  let inspirationalQuote = null
  if (missionData.quote_id) {
    const { data: linkedQuote } = await supabase
      .from("noticeboard_items")
      .select("*")
      .eq("id", missionData.quote_id)
      .eq("is_active", true)
      .single()

    if (linkedQuote) {
      inspirationalQuote = linkedQuote
    }
  }

  return {
    mission: missionData,
    existingSubmissions,
    linkedResource,
    inspirationalQuote,
    user,
    profile,
  }
}

export default async function MissionDetailPage({ params }: MissionDetailPageProps) {
  const { id } = await params

  const missionData = await getMissionData(id)

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-48 h-48 sm:w-72 sm:h-72 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute top-40 right-20 w-64 h-64 sm:w-96 sm:h-96 bg-secondary/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "2s" }}
        ></div>
        <div
          className="absolute bottom-20 left-1/3 w-56 h-56 sm:w-80 sm:h-80 bg-accent/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "4s" }}
        ></div>
      </div>

      <div className="container mx-auto px-3 sm:px-4 relative z-10">
        <Navbar />

        <Suspense
          fallback={
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading mission...</p>
              </div>
            </div>
          }
        >
          <MissionClient {...missionData} />
        </Suspense>
      </div>
    </div>
  )
}
