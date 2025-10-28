"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import { logger } from "@/lib/logger"

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
  answers: Record<string, unknown> | null
  mission: {
    title: string
    description: string
    points_value: number
    submission_schema?: {
      fields?: Array<{
        name?: string
        label?: string
      }>
    } | null
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

    const missionsMap = new Map(missionsResult.data?.map((m) => [m.id, m]) || [])
    const profilesMap = new Map(profilesResult.data?.map((p) => [p.id, p]) || [])

    const transformedData =
      submissionsResult.data?.map((submission) => ({
        ...submission,
        mission: missionsMap.get(submission.mission_id) || {
          title: "Unknown Mission",
          description: "",
          points_value: 0,
          submission_schema: null,
        },
        profile: profilesMap.get(submission.user_id) || {
          name: "Unknown User",
          avatar_url: null,
        },
      })) || []

    return transformedData
  } catch (error) {
    logger.error("Error fetching all submissions", error, { action: "fetchAllSubmissions" })
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
    const updateData: Record<string, unknown> = { status }
    if (status === "approved" && pointsAwarded !== undefined) {
      updateData.points_awarded = pointsAwarded
    }

    const { error } = await supabase.from("submissions").update(updateData).eq("id", submissionId)

    if (error) throw error

    revalidatePath("/admin/submissions")
    return { success: true }
  } catch (error) {
    logger.error("Error updating submission", error, {
      action: "updateSubmissionStatusAdmin",
      metadata: { submissionId, status },
    })
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
    logger.error("Error deleting submission", error, { action: "deleteSubmissionAdmin", metadata: { submissionId } })
    throw new Error("Failed to delete submission")
  }
}
