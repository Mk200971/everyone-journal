import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"
import { fetchAllMissions, fetchAllResources, fetchAllQuotes } from "@/lib/admin-actions"
import AdminPageClient from "@/components/admin-page-client"

export default async function AdminPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  if (!profile?.is_admin) {
    redirect("/")
  }

  const [missions, resources, quotes] = await Promise.all([fetchAllMissions(), fetchAllResources(), fetchAllQuotes()])

  return <AdminPageClient initialMissions={missions} initialResources={resources} initialQuotes={quotes} />
}
