"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"

export interface AdminSubmission {
  id: string
  mission_id: string
  user_id: string
  text_submission: string | null
  media_url: string | null
  status: "pending" | "approved" | "rejected"
  points_awarded: number
  created_at: string
  updated_at: string
  answers: any
  mission: {
    title: string
    description: string
    points_value: number
    submission_schema?: any // Added submission_schema to interface
  }
  profile: {
    name: string
    avatar_url: string | null
  }
}

export async function fetchAllSubmissions(): Promise<AdminSubmission[]> {
  const supabase = createAdminClient()

  try {
    const [submissionsResult, missionsResult, profilesResult] = await Promise.all([
      supabase.from("submissions").select("*").order("created_at", { ascending: false }),
      supabase.from("missions").select("id, title, description, points_value, submission_schema"),
      supabase.from("profiles").select("id, name, avatar_url"),
    ])

    if (submissionsResult.error) throw submissionsResult.error
    if (missionsResult.error) throw missionsResult.error
    if (profilesResult.error) throw profilesResult.error

    // Create lookup maps for efficient joining
    const missionsMap = new Map(missionsResult.data?.map((m) => [m.id, m]) || [])
    const profilesMap = new Map(profilesResult.data?.map((p) => [p.id, p]) || [])

    // Join the data manually
    const transformedData =
      submissionsResult.data?.map((submission) => ({
        ...submission,
        mission: missionsMap.get(submission.mission_id) || {
          title: "Unknown Mission",
          description: "",
          points_value: 0,
          submission_schema: null, // Added default submission_schema
        },
        profile: profilesMap.get(submission.user_id) || {
          name: "Unknown User",
          avatar_url: null,
        },
      })) || []

    return transformedData
  } catch (error) {
    console.error("Error fetching all submissions:", error)
    throw new Error("Failed to fetch submissions")
  }
}

export async function updateSubmissionStatusAdmin(
  submissionId: string,
  status: "pending" | "approved" | "rejected",
  pointsAwarded?: number,
) {
  const supabase = createAdminClient()

  try {
    const updateData: any = { status }
    if (status === "approved" && pointsAwarded !== undefined) {
      updateData.points_awarded = pointsAwarded
    }

    const { error } = await supabase.from("submissions").update(updateData).eq("id", submissionId)

    if (error) throw error

    revalidatePath("/admin/submissions")
    return { success: true }
  } catch (error) {
    console.error("Error updating submission:", error)
    throw new Error("Failed to update submission")
  }
}

export async function deleteSubmissionAdmin(submissionId: string) {
  const supabase = createAdminClient()

  try {
    const { error } = await supabase.from("submissions").delete().eq("id", submissionId)

    if (error) throw error

    revalidatePath("/admin/submissions")
    return { success: true }
  } catch (error) {
    console.error("Error deleting submission:", error)
    throw new Error("Failed to delete submission")
  }
}

export async function fetchAllMissions() {
  const supabase = createAdminClient()

  try {
    const { data, error } = await supabase.from("missions").select("*").order("display_order", { ascending: true })

    if (error) throw error

    return data || []
  } catch (error) {
    console.error("Error fetching missions:", error)
    throw new Error("Failed to fetch missions")
  }
}

export async function fetchAllResources() {
  const supabase = createAdminClient()

  try {
    const { data, error } = await supabase.from("resources").select("*").order("created_at", { ascending: false })

    if (error) throw error

    return data || []
  } catch (error) {
    console.error("Error fetching resources:", error)
    throw new Error("Failed to fetch resources")
  }
}

export async function fetchAllQuotes() {
  const supabase = createAdminClient()

  try {
    const { data, error } = await supabase.from("quotes").select("*").order("created_at", { ascending: false })

    if (error) throw error

    return data || []
  } catch (error) {
    console.error("Error fetching quotes:", error)
    throw new Error("Failed to fetch quotes")
  }
}
