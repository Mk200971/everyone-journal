import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"
import { fetchAllMissions, fetchAllResources, fetchAllQuotes } from "@/lib/admin-actions"
import AdminPageClient from "@/components/admin-page-client"

export default async function AdminPage() {
  try {
    const supabase = await createServerClient()

    console.log("[v0] Admin page: checking authentication...")

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    console.log("[v0] Admin page: user check complete", { hasUser: !!user, error: userError?.message })

    if (!user) {
      console.log("[v0] Admin page: no user, redirecting to login")
      redirect("/login")
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()

    console.log("[v0] Admin page: profile check complete", {
      hasProfile: !!profile,
      isAdmin: profile?.is_admin,
      error: profileError?.message,
    })

    if (!profile?.is_admin) {
      console.log("[v0] Admin page: user is not admin, redirecting to home")
      redirect("/")
    }

    console.log("[v0] Admin page: fetching data...")
    const [missions, resources, quotes] = await Promise.all([fetchAllMissions(), fetchAllResources(), fetchAllQuotes()])

    console.log("[v0] Admin page: data fetched successfully", {
      missionsCount: missions.length,
      resourcesCount: resources.length,
      quotesCount: quotes.length,
    })

    return <AdminPageClient initialMissions={missions} initialResources={resources} initialQuotes={quotes} />
  } catch (error) {
    console.error("[v0] Admin page error:", error)
    // If there's an error, redirect to login
    redirect("/login")
  }
}
