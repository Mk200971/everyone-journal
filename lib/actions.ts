"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import type { Mission, Profile, Submission, Resource, NoticeboardItem, JsonValue } from "@/types/database"
import { logger } from "@/lib/logger"
import {
  createMissionSchema,
  updateMissionSchema,
  deleteMissionSchema,
  submitMissionSchema,
  saveDraftSchema,
  updateSubmissionSchema,
  deleteDraftSchema,
  updateProfileSchema,
  updateAvatarSchema,
  signUpSchema,
  updateMissionOrderSchema,
  paginationSchema,
  validateFormData,
} from "@/lib/validation-schemas"

export enum ActionErrorCode {
  AUTH_ERROR = "AUTH_ERROR",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  DATABASE_ERROR = "DATABASE_ERROR",
  STORAGE_ERROR = "STORAGE_ERROR",
  NOT_FOUND = "NOT_FOUND",
  PERMISSION_DENIED = "PERMISSION_DENIED",
  RATE_LIMIT = "RATE_LIMIT",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

type PaginationMetadata = {
  page: number
  limit: number
  total: number
  hasMore: boolean
}

type ActionResponse<T = void> =
  | {
      success: true
      data: T
      pagination?: PaginationMetadata
    }
  | {
      success: false
      error: string
      errorCode: ActionErrorCode
    }

type SubmissionResponse = ActionResponse<void>
type ProfileUpdateResponse = ActionResponse<void>
type SignOutResponse = ActionResponse<{ redirectTo: string }>
type MissionResponse = ActionResponse<{ id: string }>
type AvatarUpdateResponse = ActionResponse<{ avatar_url: string }>
type ExportDataResponse = ActionResponse<{
  missions: Mission[]
  profiles: Profile[]
  submissions: Array<
    Submission & {
      user_name: string
      user_email: string
      mission_title: string
      answers_raw: string | null
      [key: string]: JsonValue
    }
  >
  resources: Resource[]
  noticeboard_items: NoticeboardItem[]
}>

type CommunityActivityResponse = ActionResponse<
  Array<{
    id: string
    created_at: string
    points_awarded: number
    user_name: string
    mission_title: string
    mission_id?: string
    user_avatar_url: string | null
    user_id: string
    status: string
    type: "submission" | "profile_update"
    changed_fields?: string[]
  }>
>
type DraftResponse = ActionResponse<void>
type UpdateSubmissionResponse = ActionResponse<{ wasApproved: boolean }>
type SubmitDraftResponse = ActionResponse<{ missionId: string }>

function handleActionError(
  error: unknown,
  context: string,
  userId?: string,
): { success: false; error: string; errorCode: ActionErrorCode } {
  logger.error(context, error, { userId, action: context })

  if (error instanceof Error) {
    // Detect specific error types
    if (error.message.includes("not authenticated") || error.message.includes("Unauthorized")) {
      return {
        success: false,
        error: "You must be logged in to perform this action",
        errorCode: ActionErrorCode.AUTH_ERROR,
      }
    }

    if (error.message.includes("not found") || error.message.includes("does not exist")) {
      return {
        success: false,
        error: "The requested resource was not found",
        errorCode: ActionErrorCode.NOT_FOUND,
      }
    }

    if (error.message.includes("permission") || error.message.includes("access denied")) {
      return {
        success: false,
        error: "You don't have permission to perform this action",
        errorCode: ActionErrorCode.PERMISSION_DENIED,
      }
    }

    if (error.message.includes("rate limit") || error.message.includes("Too Many Requests")) {
      return {
        success: false,
        error: "Too many requests. Please try again in a moment",
        errorCode: ActionErrorCode.RATE_LIMIT,
      }
    }

    if (error.message.includes("storage") || error.message.includes("upload")) {
      return {
        success: false,
        error: "File upload failed. Please check your file and try again",
        errorCode: ActionErrorCode.STORAGE_ERROR,
      }
    }

    if (error.message.includes("database") || error.message.includes("query")) {
      return {
        success: false,
        error: "Database error. Please try again",
        errorCode: ActionErrorCode.DATABASE_ERROR,
      }
    }

    return {
      success: false,
      error: error.message,
      errorCode: ActionErrorCode.UNKNOWN_ERROR,
    }
  }

  return {
    success: false,
    error: `${context} failed. Please try again`,
    errorCode: ActionErrorCode.UNKNOWN_ERROR,
  }
}

/**
 * Verifies admin authentication and returns authorized client
 * @throws {Error} If user is not authenticated or not an admin
 * @returns {Promise<{userId: string, adminClient: ReturnType<typeof createAdminClient>}>} User ID and admin client instance
 */
async function getAuthorizedAdminClient(): Promise<{
  userId: string
  adminClient: ReturnType<typeof createAdminClient>
}> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error("Unauthorized: Not authenticated")
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single()

  if (profileError || !profile?.is_admin) {
    throw new Error("Unauthorized: Admin access required")
  }

  return { userId: user.id, adminClient: createAdminClient() }
}

/**
 * Submits a mission with text and optional media
 * @param {FormData} formData - Form data containing mission submission details
 * @returns {Promise<SubmissionResponse>} Success status and any error details
 */
export async function submitMission(formData: FormData): Promise<SubmissionResponse> {
  let userId: string | undefined
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        success: false,
        error: "You must be logged in to submit a mission",
        errorCode: ActionErrorCode.AUTH_ERROR,
      }
    }

    userId = user.id

    const validation = validateFormData(formData, submitMissionSchema)
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.errors[0]?.message || "Invalid submission data",
        errorCode: ActionErrorCode.VALIDATION_ERROR,
      }
    }

    const { missionId, textSubmission, mediaFile } = validation.data

    const { data: mission } = await supabase.from("missions").select("points_value").eq("id", missionId).single()

    if (!mission) {
      return { success: false, error: "Mission not found", errorCode: ActionErrorCode.NOT_FOUND }
    }

    let mediaUrl = null
    if (mediaFile && mediaFile.size > 0) {
      const fileExt = mediaFile.name.split(".").pop()
      const fileName = `${user.id}/${Date.now()}.${fileExt}`
      const { error: uploadError } = await supabase.storage.from("submissions").upload(fileName, mediaFile)

      if (uploadError) {
        logger.error("submitMission - media upload", uploadError, { userId })
        return { success: false, error: "Failed to upload media file", errorCode: ActionErrorCode.STORAGE_ERROR }
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("submissions").getPublicUrl(fileName)
      mediaUrl = publicUrl
    }

    const { error } = await supabase.from("submissions").insert({
      mission_id: missionId,
      user_id: user.id,
      text_submission: textSubmission || null,
      media_url: mediaUrl,
      status: "pending",
      points_awarded: 0,
    })

    if (error) {
      logger.error("submitMission - database insert", error, { userId })
      return {
        success: false,
        error: "Failed to submit mission. Please try again",
        errorCode: ActionErrorCode.DATABASE_ERROR,
      }
    }

    revalidatePath(`/mission/${missionId}`)
    revalidatePath("/")

    return { success: true, data: undefined }
  } catch (error) {
    return handleActionError(error, "submitMission", userId)
  }
}

/**
 * Updates user profile information
 * @param {FormData} formData - Form data containing profile fields
 * @returns {Promise<ProfileUpdateResponse>} Success status and any error details
 */
export async function updateProfile(formData: FormData): Promise<ProfileUpdateResponse> {
  let userId: string | undefined
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        success: false,
        error: "You must be logged in to update your profile",
        errorCode: ActionErrorCode.AUTH_ERROR,
      }
    }

    userId = user.id

    const validation = validateFormData(formData, updateProfileSchema)
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.errors[0]?.message || "Invalid profile data",
        errorCode: ActionErrorCode.VALIDATION_ERROR,
      }
    }

    const { name, job_title, department, bio, country, customer_obsession } = validation.data

    const { data: currentProfile } = await supabase
      .from("profiles")
      .select("name, job_title, department, bio, country, customer_obsession")
      .eq("id", user.id)
      .single()

    const updateData: Partial<Profile> = { name }
    const changedFields: string[] = []

    if (currentProfile) {
      if (name !== currentProfile.name) changedFields.push("name")
      if (job_title && job_title !== currentProfile.job_title) {
        updateData.job_title = job_title
        changedFields.push("job title")
      }
      if (department && department !== currentProfile.department) {
        updateData.department = department
        changedFields.push("department")
      }
      if (bio && bio !== currentProfile.bio) {
        updateData.bio = bio
        changedFields.push("bio")
      }
      if (country && country !== currentProfile.country) {
        updateData.country = country
        changedFields.push("country")
      }
      if (customer_obsession && customer_obsession !== currentProfile.customer_obsession) {
        updateData.customer_obsession = customer_obsession
        changedFields.push("customer obsession")
      }
    } else {
      if (job_title) updateData.job_title = job_title
      if (department) updateData.department = department
      if (bio) updateData.bio = bio
      if (country) updateData.country = country
      if (customer_obsession) updateData.customer_obsession = customer_obsession
    }

    const { error } = await supabase.from("profiles").update(updateData).eq("id", user.id)

    if (error) {
      logger.error("updateProfile - database update", error, { userId })
      return {
        success: false,
        error: "Failed to update profile. Please try again",
        errorCode: ActionErrorCode.DATABASE_ERROR,
      }
    }

    if (changedFields.length > 0) {
      const adminSupabase = createAdminClient()
      await adminSupabase.from("profile_activities").insert({
        user_id: user.id,
        activity_type: "profile_updated",
        changed_fields: changedFields,
        created_at: new Date().toISOString(),
      })
    }

    revalidatePath("/account")
    revalidatePath("/activity")
    revalidatePath("/")

    return { success: true, data: undefined }
  } catch (error) {
    return handleActionError(error, "updateProfile", userId)
  }
}

/**
 * Signs out the current user
 * @returns {Promise<SignOutResponse>} Redirect URL on success
 */
export async function signOut(): Promise<SignOutResponse> {
  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.signOut({ scope: "global" })

    if (error) {
      logger.error("signOut", error)
      return { success: false, error: "Failed to sign out. Please try again", errorCode: ActionErrorCode.AUTH_ERROR }
    }

    return { success: true, data: { redirectTo: "/auth/login" } }
  } catch (error) {
    return handleActionError(error, "signOut")
  }
}

export async function createMission(formData: FormData) {
  let userId: string | undefined
  try {
    const { userId: adminUserId, adminClient } = await getAuthorizedAdminClient()
    userId = adminUserId

    const validation = validateFormData(formData, createMissionSchema)
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.errors[0]?.message || "Invalid mission data",
        errorCode: ActionErrorCode.VALIDATION_ERROR,
      }
    }

    const validatedData = validation.data
    const missionImageFile = formData.get("mission_image") as File | null

    let imageUrl = null
    if (missionImageFile && missionImageFile.size > 0) {
      const { data: buckets, error: bucketsError } = await adminClient.storage.listBuckets()
      if (bucketsError) {
        logger.error("createMission - list buckets", bucketsError, { userId })
        return { success: false, error: "Unable to access storage", errorCode: ActionErrorCode.STORAGE_ERROR }
      }

      const missionsBucket = buckets?.find((bucket) => bucket.id === "missions-media")
      if (!missionsBucket) {
        return { success: false, error: "missions-media bucket not found", errorCode: ActionErrorCode.STORAGE_ERROR }
      }

      const fileExt = missionImageFile.name.split(".").pop()
      const fileName = `mission-${Date.now()}.${fileExt}`
      const { error: uploadError } = await adminClient.storage.from("missions-media").upload(fileName, missionImageFile)

      if (uploadError) {
        logger.error("createMission - image upload", uploadError, { userId })
        return {
          success: false,
          error: `Image upload failed: ${uploadError.message}`,
          errorCode: ActionErrorCode.STORAGE_ERROR,
        }
      }

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
      imageUrl = `${supabaseUrl}/storage/v1/object/public/missions-media/${fileName}`
    }

    const missionData: Partial<Mission> = {
      ...validatedData,
      image_url: imageUrl,
    }

    const { data, error } = await adminClient.from("missions").insert(missionData).select()

    if (error) {
      logger.error("createMission - database insert", error, { userId })
      return { success: false, error: `Database error: ${error.message}`, errorCode: ActionErrorCode.DATABASE_ERROR }
    }

    revalidatePath("/admin")
    revalidatePath("/")

    return { success: true, data }
  } catch (error) {
    return handleActionError(error, "createMission", userId)
  }
}

export async function updateMission(formData: FormData) {
  let userId: string | undefined
  try {
    const { userId: adminUserId, adminClient } = await getAuthorizedAdminClient()
    userId = adminUserId

    const validation = validateFormData(formData, updateMissionSchema)
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.errors[0]?.message || "Invalid mission data",
        errorCode: ActionErrorCode.VALIDATION_ERROR,
      }
    }

    const validatedData = validation.data
    const missionImageFile = formData.get("mission_image") as File | null

    let imageUrl = null
    if (missionImageFile && missionImageFile.size > 0) {
      const { data: buckets, error: bucketsError } = await adminClient.storage.listBuckets()
      if (bucketsError) {
        logger.error("updateMission - list buckets", bucketsError, { userId })
        return { success: false, error: "Unable to access storage", errorCode: ActionErrorCode.STORAGE_ERROR }
      }

      const missionsBucket = buckets?.find((bucket) => bucket.id === "missions-media")
      if (!missionsBucket) {
        return { success: false, error: "missions-media bucket not found", errorCode: ActionErrorCode.STORAGE_ERROR }
      }

      const fileExt = missionImageFile.name.split(".").pop()
      const fileName = `mission-${validatedData.id}-${Date.now()}.${fileExt}`
      const filePath = `${userId}/${fileName}`
      const { error: uploadError } = await adminClient.storage.from("missions-media").upload(filePath, missionImageFile)

      if (uploadError) {
        logger.error("updateMission - image upload", uploadError, { userId })
        return {
          success: false,
          error: `Image upload failed: ${uploadError.message}`,
          errorCode: ActionErrorCode.STORAGE_ERROR,
        }
      }

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
      imageUrl = `${supabaseUrl}/storage/v1/object/public/missions-media/${fileName}`
    }

    const updateData: Partial<Mission> = {
      ...validatedData,
    }

    if (imageUrl) updateData.image_url = imageUrl

    const { error } = await adminClient.from("missions").update(updateData).eq("id", validatedData.id)

    if (error) {
      logger.error("updateMission - database update", error, { userId })
      return {
        success: false,
        error: `Failed to update mission: ${error.message}`,
        errorCode: ActionErrorCode.DATABASE_ERROR,
      }
    }

    revalidatePath("/admin")
    revalidatePath("/")

    return { success: true }
  } catch (error) {
    return handleActionError(error, "updateMission", userId)
  }
}

export async function deleteMission(formData: FormData) {
  let userId: string | undefined
  try {
    const { userId: adminUserId, adminClient } = await getAuthorizedAdminClient()
    userId = adminUserId

    const validation = validateFormData(formData, deleteMissionSchema)
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.errors[0]?.message || "Invalid mission ID",
        errorCode: ActionErrorCode.VALIDATION_ERROR,
      }
    }

    const { id } = validation.data

    const { error } = await adminClient.from("missions").delete().eq("id", id)

    if (error) {
      logger.error("deleteMission - database delete", error, { userId })
      return {
        success: false,
        error: "Failed to delete mission. Please try again",
        errorCode: ActionErrorCode.DATABASE_ERROR,
      }
    }

    revalidatePath("/admin")
    revalidatePath("/")

    return { success: true }
  } catch (error) {
    return handleActionError(error, "deleteMission", userId)
  }
}

/**
 * Updates user avatar
 * @param {FormData} formData - Form data containing avatar file
 * @returns {Promise<AvatarUpdateResponse>} Success status and new avatar URL
 */
export async function updateAvatar(formData: FormData): Promise<AvatarUpdateResponse> {
  let userId: string | undefined
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        success: false,
        error: "You must be logged in to update your avatar",
        errorCode: ActionErrorCode.AUTH_ERROR,
      }
    }

    userId = user.id

    const validation = validateFormData(formData, updateAvatarSchema)
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.errors[0]?.message || "Invalid avatar file",
        errorCode: ActionErrorCode.VALIDATION_ERROR,
      }
    }

    const { avatar: file } = validation.data

    const fileExt = file.name.split(".").pop()
    const fileName = `${user.id}/avatar.${fileExt}`

    const { error: uploadError } = await supabase.storage.from("avatars").upload(fileName, file, { upsert: true })

    if (uploadError) {
      logger.error("updateAvatar - storage upload", uploadError, { userId })
      return {
        success: false,
        error: `Upload failed: ${uploadError.message}`,
        errorCode: ActionErrorCode.STORAGE_ERROR,
      }
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(fileName)

    const { error: updateError } = await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", user.id)

    if (updateError) {
      logger.error("updateAvatar - profile update", updateError, { userId })
      return {
        success: false,
        error: `Profile update failed: ${updateError.message}`,
        errorCode: ActionErrorCode.DATABASE_ERROR,
      }
    }

    revalidatePath("/account")
    return { success: true, data: { avatar_url: publicUrl } }
  } catch (error) {
    return handleActionError(error, "updateAvatar", userId)
  }
}

/**
 * Exports all data from the application
 * @returns {Promise<ExportDataResponse>} Exported data on success
 */
export async function exportAllData(): Promise<ExportDataResponse> {
  let userId: string | undefined
  try {
    const { userId: adminUserId, adminClient } = await getAuthorizedAdminClient()
    userId = adminUserId

    const [missionsResult, profilesResult, submissionsResult, resourcesResult, noticeboardResult] = await Promise.all([
      adminClient.from("missions").select("*"),
      adminClient.from("profiles").select("*"),
      adminClient.from("submissions").select("*"),
      adminClient.from("resources").select("*"),
      adminClient.from("noticeboard_items").select("*"),
    ])

    if (missionsResult.error)
      return {
        success: false,
        error: `Missions fetch error: ${missionsResult.error.message}`,
        errorCode: ActionErrorCode.DATABASE_ERROR,
      }
    if (profilesResult.error)
      return {
        success: false,
        error: `Profiles fetch error: ${profilesResult.error.message}`,
        errorCode: ActionErrorCode.DATABASE_ERROR,
      }
    if (submissionsResult.error)
      return {
        success: false,
        error: `Submissions fetch error: ${submissionsResult.error.message}`,
        errorCode: ActionErrorCode.DATABASE_ERROR,
      }
    if (resourcesResult.error)
      return {
        success: false,
        error: `Resources fetch error: ${resourcesResult.error.message}`,
        errorCode: ActionErrorCode.DATABASE_ERROR,
      }
    if (noticeboardResult.error)
      return {
        success: false,
        error: `Noticeboard fetch error: ${noticeboardResult.error.message}`,
        errorCode: ActionErrorCode.DATABASE_ERROR,
      }

    const missionsMap = new Map(missionsResult.data?.map((m) => [m.id, m]) || [])
    const profilesMap = new Map(profilesResult.data?.map((p) => [p.id, p]) || [])

    const processedSubmissions =
      submissionsResult.data?.map((submission) => {
        const mission = missionsMap.get(submission.mission_id)
        const profile = profilesMap.get(submission.user_id)

        const baseSubmission: Record<string, JsonValue> = {
          id: submission.id,
          created_at: submission.created_at,
          user_name: profile?.name || "Unknown User",
          user_email: profile?.email || "Unknown Email",
          mission_title: mission?.title || "Unknown Mission",
          text_submission: submission.text_submission,
          media_url: submission.media_url,
          status: submission.status,
          points_awarded: submission.points_awarded,
          answers_raw: submission.answers ? JSON.stringify(submission.answers) : null,
        }

        if (submission.answers && mission?.submission_schema) {
          const schema = mission.submission_schema
          const answers = submission.answers as Record<string, JsonValue>

          if (Array.isArray(schema)) {
            schema.forEach((field, index: number) => {
              const fieldKey = field.name || field.label || `question_${index + 1}`
              const answerKey = `answer_${index + 1}_${fieldKey.replace(/[^a-zA-Z0-9]/g, "_")}`
              const questionKey = `question_${index + 1}_${fieldKey.replace(/[^a-zA-Z0-9]/g, "_")}`

              baseSubmission[questionKey] = field.label || field.name || `Question ${index + 1}`
              baseSubmission[answerKey] = answers[fieldKey] || answers[field.name] || ""
            })
          }
        }

        return baseSubmission as Submission & {
          user_name: string
          user_email: string
          mission_title: string
          answers_raw: string | null
          [key: string]: JsonValue
        }
      }) || []

    return {
      success: true,
      data: {
        missions: missionsResult.data || [],
        profiles: profilesResult.data || [],
        submissions: processedSubmissions,
        resources: resourcesResult.data || [],
        noticeboard_items: noticeboardResult.data || [],
      },
    }
  } catch (error) {
    return handleActionError(error, "exportAllData", userId)
  }
}

/**
 * Fetches recent community activity with pagination
 * @param {number} page - Page number (default: 1)
 * @param {number} limit - Items per page (default: 10)
 * @returns {Promise<CommunityActivityResponse>} List of recent activities with pagination metadata
 */
export async function fetchAllCommunityActivity(page = 1, limit = 10): Promise<CommunityActivityResponse> {
  let userId: string | undefined
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        success: false,
        error: "You must be logged in to view community activity",
        errorCode: ActionErrorCode.AUTH_ERROR,
      }
    }
    userId = user.id

    const validation = paginationSchema.safeParse({ page, limit })
    if (!validation.success) {
      return {
        success: false,
        error: "Invalid pagination parameters",
        errorCode: ActionErrorCode.VALIDATION_ERROR,
      }
    }

    const { page: validPage, limit: validLimit } = validation.data
    const offset = (validPage - 1) * validLimit

    const {
      data: submissions,
      error: submissionsError,
      count: totalSubmissions,
    } = await supabase
      .from("submissions")
      .select("id, created_at, points_awarded, status, user_id, mission_id", { count: "exact" })
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .range(offset, offset + validLimit - 1)

    if (submissionsError) {
      if (submissionsError.message?.includes("Too Many Requests") || submissionsError.message?.includes("rate limit")) {
        return {
          success: true,
          data: [],
          pagination: {
            page: validPage,
            limit: validLimit,
            total: 0,
            hasMore: false,
          },
        }
      }
      logger.error("fetchAllCommunityActivity - submissions fetch", submissionsError, { userId })
      return { success: false, error: "Failed to fetch activity", errorCode: ActionErrorCode.DATABASE_ERROR }
    }

    const { data: profileActivities, error: profileActivitiesError } = await supabase
      .from("profile_activities")
      .select("id, created_at, user_id, changed_fields")
      .eq("activity_type", "profile_updated")
      .order("created_at", { ascending: false })
      .range(0, Math.min(5, validLimit) - 1)

    if (profileActivitiesError) {
      if (
        profileActivitiesError.message?.includes("Too Many Requests") ||
        profileActivitiesError.message?.includes("rate limit")
      ) {
        // Silently ignore rate limit errors for this part
      } else {
        logger.error("fetchAllCommunityActivity - profile activities fetch", profileActivitiesError, { userId })
      }
    }

    const allActivities = []

    if (submissions && submissions.length > 0) {
      const userIds = [...new Set(submissions.map((s) => s.user_id))]
      const missionIds = [...new Set(submissions.map((s) => s.mission_id))]

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, avatar_url")
        .in("id", userIds)
        .eq("is_deleted", false)

      const { data: missions } = await supabase.from("missions").select("id, title").in("id", missionIds)

      const profilesMap = new Map(profiles?.map((p) => [p.id, p]) || [])
      const missionsMap = new Map(missions?.map((m) => [m.id, m]) || [])

      submissions.forEach((submission) => {
        const profile = profilesMap.get(submission.user_id)
        const mission = missionsMap.get(submission.mission_id)

        allActivities.push({
          id: submission.id,
          created_at: submission.created_at,
          points_awarded: submission.points_awarded || 0,
          user_name: profile?.name || "Unknown User",
          mission_title: mission?.title || "Unknown Mission",
          mission_id: submission.mission_id,
          user_avatar_url: profile?.avatar_url || null,
          user_id: submission.user_id,
          status: submission.status,
          type: "submission" as const,
        })
      })
    }

    if (profileActivities && profileActivities.length > 0) {
      const profileUserIds = [...new Set(profileActivities.map((a) => a.user_id))]

      const { data: profileUsers } = await supabase
        .from("profiles")
        .select("id, name, avatar_url")
        .in("id", profileUserIds)
        .eq("is_deleted", false)

      if (profileUsers) {
        const profileUsersMap = new Map(profileUsers.map((p) => [p.id, p]))

        profileActivities.forEach((activity) => {
          const profile = profileUsersMap.get(activity.user_id)

          allActivities.push({
            id: `profile-${activity.id}`,
            created_at: activity.created_at,
            points_awarded: 0,
            user_name: profile?.name || "Unknown User",
            mission_title: "",
            user_avatar_url: profile?.avatar_url || null,
            user_id: activity.user_id,
            status: "profile_updated",
            type: "profile_update" as const,
            changed_fields: activity.changed_fields || undefined,
          })
        })
      }
    }

    const sortedActivities = allActivities
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, validLimit)

    return {
      success: true,
      data: sortedActivities,
      pagination: {
        page: validPage,
        limit: validLimit,
        total: totalSubmissions || 0,
        hasMore: (totalSubmissions || 0) > offset + validLimit,
      },
    }
  } catch (error) {
    return handleActionError(error, "fetchAllCommunityActivity", userId)
  }
}

/**
 * Handles user sign up
 * @param {FormData} formData - Form data containing user credentials and profile info
 * @returns {Promise<ActionResponse>} Success status and any error details
 */
export async function signUp(formData: FormData) {
  try {
    const supabase = await createClient()

    const validation = validateFormData(formData, signUpSchema)
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.errors[0]?.message || "Invalid sign up data",
        errorCode: ActionErrorCode.VALIDATION_ERROR,
      }
    }

    const { email, password, name, job_title, department, bio, country } = validation.data

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL,
      },
    })

    if (error) {
      logger.error("signUp - auth signup", error)
      return { success: false, error: error.message, errorCode: ActionErrorCode.AUTH_ERROR }
    }

    if (data.user) {
      const adminSupabase = createAdminClient()

      const { error: profileError } = await adminSupabase.from("profiles").upsert(
        {
          id: data.user.id,
          name,
          email,
          job_title,
          department,
          bio,
          country,
          total_points: 0,
        },
        {
          onConflict: "id",
        },
      )

      if (profileError) {
        logger.error("signUp - profile upsert", profileError)
        return {
          success: false,
          error: "Profile creation error: " + profileError.message,
          errorCode: ActionErrorCode.DATABASE_ERROR,
        }
      }
    }

    return { success: true, data: undefined }
  } catch (error) {
    return handleActionError(error, "signUp")
  }
}

/**
 * Updates the display order of missions
 * @param {Array<{id: string, display_order: number}>} missions - Array of missions with their new display order
 * @returns {Promise<ActionResponse>} Success status and any error details
 */
export async function updateMissionOrder(missions: Array<{ id: string; display_order: number }>) {
  let userId: string | undefined
  try {
    const { userId: adminUserId, adminClient } = await getAuthorizedAdminClient()
    userId = adminUserId

    const validation = updateMissionOrderSchema.safeParse(missions)
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.errors[0]?.message || "Invalid mission order data",
        errorCode: ActionErrorCode.VALIDATION_ERROR,
      }
    }

    const updatePromises = validation.data.map(async (mission) => {
      const { error } = await adminClient
        .from("missions")
        .update({ display_order: mission.display_order })
        .eq("id", mission.id)

      if (error) throw error
      return mission
    })

    await Promise.all(updatePromises)

    revalidatePath("/admin")
    return { success: true, data: undefined }
  } catch (error) {
    return handleActionError(error, "updateMissionOrder", userId)
  }
}

/**
 * Saves or updates a draft submission
 * @param {FormData} formData - Form data containing draft details
 * @returns {Promise<DraftResponse>} Success status and any error details
 */
export async function saveDraft(formData: FormData): Promise<DraftResponse> {
  let userId: string | undefined
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: "You must be logged in to save a draft", errorCode: ActionErrorCode.AUTH_ERROR }
    }

    userId = user.id

    const validation = validateFormData(formData, saveDraftSchema)
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.errors[0]?.message || "Invalid draft data",
        errorCode: ActionErrorCode.VALIDATION_ERROR,
      }
    }

    const { missionId, textSubmission, answers, mediaFile, existingDraftId } = validation.data

    const { data: existingDraft } = await supabase
      .from("submissions")
      .select("id, media_url")
      .eq("mission_id", missionId)
      .eq("user_id", user.id)
      .eq("status", "draft")
      .maybeSingle()

    const draftIdToUse = existingDraftId || existingDraft?.id
    const oldMediaUrl = existingDraft?.media_url

    let mediaUrl = oldMediaUrl

    if (mediaFile && mediaFile.size > 0) {
      const fileExt = mediaFile.name.split(".").pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `${user.id}/${fileName}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("submissions-media")
        .upload(filePath, mediaFile)

      if (uploadError) {
        logger.error("saveDraft - media upload", uploadError, { userId })
        return {
          success: false,
          error: "Failed to upload media. Please try again",
          errorCode: ActionErrorCode.STORAGE_ERROR,
        }
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("submissions-media").getPublicUrl(uploadData.path)

      mediaUrl = publicUrl

      if (oldMediaUrl && oldMediaUrl !== mediaUrl) {
        try {
          const oldPath = oldMediaUrl.split("/submissions-media/")[1]
          if (oldPath) {
            await supabase.storage.from("submissions-media").remove([oldPath])
          }
        } catch (cleanupError) {
          logger.error("saveDraft - media cleanup", cleanupError, { userId })
        }
      }
    }

    const draftData: Partial<Submission> = {
      mission_id: missionId,
      user_id: user.id,
      status: "draft",
      updated_at: new Date().toISOString(),
    }

    if (answers) {
      draftData.answers = answers as Record<string, JsonValue>
    } else if (textSubmission) {
      draftData.text_submission = textSubmission
    }

    if (mediaUrl) {
      draftData.media_url = mediaUrl
    }

    if (draftIdToUse) {
      const { error } = await supabase
        .from("submissions")
        .update(draftData)
        .eq("id", draftIdToUse)
        .eq("user_id", user.id)

      if (error) {
        logger.error("saveDraft - database update", error, { userId })
        return {
          success: false,
          error: "Failed to save progress. Please try again",
          errorCode: ActionErrorCode.DATABASE_ERROR,
        }
      }
    } else {
      draftData.created_at = new Date().toISOString()
      const { error } = await supabase.from("submissions").insert(draftData)

      if (error) {
        logger.error("saveDraft - database insert", error, { userId })
        return {
          success: false,
          error: "Failed to save progress. Please try again",
          errorCode: ActionErrorCode.DATABASE_ERROR,
        }
      }
    }

    revalidatePath(`/mission/${missionId}`)
    return { success: true, data: undefined }
  } catch (error) {
    return handleActionError(error, "saveDraft", userId)
  }
}

/**
 * Deletes a draft submission
 * @param {string} draftId - ID of the draft to delete
 * @returns {Promise<DraftResponse>} Success status and any error details
 */
export async function deleteDraft(draftId: string): Promise<DraftResponse> {
  let userId: string | undefined
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: "You must be logged in to delete a draft", errorCode: ActionErrorCode.AUTH_ERROR }
    }

    userId = user.id

    const validation = deleteDraftSchema.safeParse({ draftId })
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.errors[0]?.message || "Invalid draft ID",
        errorCode: ActionErrorCode.VALIDATION_ERROR,
      }
    }

    const { data: draft } = await supabase
      .from("submissions")
      .select("mission_id")
      .eq("id", draftId)
      .eq("user_id", user.id)
      .maybeSingle()

    if (!draft) {
      return { success: false, error: "Draft not found or already deleted", errorCode: ActionErrorCode.NOT_FOUND }
    }

    const { error } = await supabase.from("submissions").delete().eq("id", draftId).eq("user_id", user.id)

    if (error) {
      logger.error("deleteDraft - database delete", error, { userId })
      return {
        success: false,
        error: "Failed to delete draft. Please try again",
        errorCode: ActionErrorCode.DATABASE_ERROR,
      }
    }

    if (draft?.mission_id) {
      revalidatePath(`/mission/${draft.mission_id}`)
    }

    return { success: true, data: undefined }
  } catch (error) {
    return handleActionError(error, "deleteDraft", userId)
  }
}

/**
 * Updates an existing submission
 * @param {FormData} formData - Form data containing updated submission details
 * @returns {Promise<UpdateSubmissionResponse>} Success status and whether submission was previously approved
 */
export async function updateSubmission(formData: FormData): Promise<UpdateSubmissionResponse> {
  let userId: string | undefined
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        success: false,
        error: "You must be logged in to update a submission",
        errorCode: ActionErrorCode.AUTH_ERROR,
      }
    }

    userId = user.id

    const validation = validateFormData(formData, updateSubmissionSchema)
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.errors[0]?.message || "Invalid submission data",
        errorCode: ActionErrorCode.VALIDATION_ERROR,
      }
    }

    const { submissionId, textSubmission, answers, mediaFile, removedMediaUrls } = validation.data

    const { data: currentSubmission, error: fetchError } = await supabase
      .from("submissions")
      .select("status, media_url, mission_id")
      .eq("id", submissionId)
      .eq("user_id", user.id)
      .maybeSingle()

    if (fetchError || !currentSubmission) {
      return {
        success: false,
        error: "Submission not found or you don't have permission to edit it",
        errorCode: ActionErrorCode.NOT_FOUND,
      }
    }

    let finalMediaUrl = currentSubmission.media_url
    const oldMediaUrl = currentSubmission.media_url

    if (removedMediaUrls && removedMediaUrls.includes(currentSubmission.media_url || "")) {
      finalMediaUrl = null

      if (oldMediaUrl) {
        try {
          const oldPath = oldMediaUrl.split("/submissions-media/")[1]
          if (oldPath) {
            await supabase.storage.from("submissions-media").remove([oldPath])
          }
        } catch (cleanupError) {
          logger.error("updateSubmission - media cleanup", cleanupError, { userId })
        }
      }
    }

    if (mediaFile && mediaFile.size > 0) {
      const fileExt = mediaFile.name.split(".").pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `${user.id}/${fileName}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("submissions-media")
        .upload(filePath, mediaFile)

      if (uploadError) {
        logger.error("updateSubmission - media upload", uploadError, { userId })
        return {
          success: false,
          error: "Failed to upload media. Please try again",
          errorCode: ActionErrorCode.STORAGE_ERROR,
        }
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("submissions-media").getPublicUrl(uploadData.path)

      finalMediaUrl = publicUrl

      if (oldMediaUrl && oldMediaUrl !== finalMediaUrl) {
        try {
          const oldPath = oldMediaUrl.split("/submissions-media/")[1]
          if (oldPath) {
            await supabase.storage.from("submissions-media").remove([oldPath])
          }
        } catch (cleanupError) {
          logger.error("updateSubmission - old media cleanup", cleanupError, { userId })
        }
      }
    }

    const updateData: Partial<Submission> = {
      media_url: finalMediaUrl,
      updated_at: new Date().toISOString(),
    }

    if (answers) {
      updateData.answers = answers as Record<string, JsonValue>
    } else if (textSubmission) {
      updateData.text_submission = textSubmission
    }

    if (currentSubmission.status === "approved" || currentSubmission.status === "rejected") {
      updateData.status = "pending"
      if (currentSubmission.status === "approved") {
        updateData.points_awarded = 0
      }
    }

    const { error } = await supabase
      .from("submissions")
      .update(updateData)
      .eq("id", submissionId)
      .eq("user_id", user.id)

    if (error) {
      logger.error("updateSubmission - database update", error, { userId })
      return {
        success: false,
        error: "Failed to update submission. Please try again",
        errorCode: ActionErrorCode.DATABASE_ERROR,
      }
    }

    revalidatePath(`/mission/${currentSubmission.mission_id}`)
    return { success: true, data: { wasApproved: currentSubmission.status === "approved" } }
  } catch (error) {
    return handleActionError(error, "updateSubmission", userId)
  }
}

/**
 * Submits a draft as a final submission
 * @param {FormData} formData - Form data containing draft ID and any final changes
 * @returns {Promise<SubmitDraftResponse>} Success status and mission ID
 */
export async function submitDraftAsFinal(formData: FormData): Promise<SubmitDraftResponse> {
  let userId: string | undefined
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: "You must be logged in to submit", errorCode: ActionErrorCode.AUTH_ERROR }
    }

    userId = user.id

    const draftId = formData.get("draftId") as string
    const answersString = formData.get("answers") as string | null
    const textSubmission = formData.get("textSubmission") as string | null
    const mediaFile = formData.get("mediaFile") as File | null

    if (!draftId) {
      return { success: false, error: "Draft ID is required", errorCode: ActionErrorCode.VALIDATION_ERROR }
    }

    const { data: draft, error: fetchError } = await supabase
      .from("submissions")
      .select("mission_id, media_url")
      .eq("id", draftId)
      .eq("user_id", user.id)
      .eq("status", "draft")
      .maybeSingle()

    if (fetchError || !draft) {
      return { success: false, error: "Draft not found or already submitted", errorCode: ActionErrorCode.NOT_FOUND }
    }

    let finalMediaUrl = draft.media_url
    const oldMediaUrl = draft.media_url

    if (mediaFile && mediaFile.size > 0) {
      const fileExt = mediaFile.name.split(".").pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `${user.id}/${fileName}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("submissions-media")
        .upload(filePath, mediaFile)

      if (uploadError) {
        logger.error("submitDraftAsFinal - media upload", uploadError, { userId })
        return {
          success: false,
          error: "Failed to upload media. Please try again",
          errorCode: ActionErrorCode.STORAGE_ERROR,
        }
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("submissions-media").getPublicUrl(uploadData.path)

      finalMediaUrl = publicUrl

      if (oldMediaUrl && oldMediaUrl !== finalMediaUrl) {
        try {
          const oldPath = oldMediaUrl.split("/submissions-media/")[1]
          if (oldPath) {
            await supabase.storage.from("submissions-media").remove([oldPath])
          }
        } catch (cleanupError) {
          logger.error("submitDraftAsFinal - media cleanup", cleanupError, { userId })
        }
      }
    }

    const updateData: Partial<Submission> = {
      status: "pending",
      media_url: finalMediaUrl,
      updated_at: new Date().toISOString(),
    }

    if (answersString) {
      try {
        updateData.answers = JSON.parse(answersString) as Record<string, JsonValue>
      } catch (error) {
        return { success: false, error: "Invalid form data format", errorCode: ActionErrorCode.VALIDATION_ERROR }
      }
    } else if (textSubmission) {
      updateData.text_submission = textSubmission
    }

    const { error } = await supabase.from("submissions").update(updateData).eq("id", draftId).eq("user_id", user.id)

    if (error) {
      logger.error("submitDraftAsFinal - database update", error, { userId })
      return { success: false, error: "Failed to submit. Please try again", errorCode: ActionErrorCode.DATABASE_ERROR }
    }

    revalidatePath(`/mission/${draft.mission_id}`)
    return { success: true, data: { missionId: draft.mission_id } }
  } catch (error) {
    return handleActionError(error, "submitDraftAsFinal", userId)
  }
}

/**
 * Creates a new submission
 * @param {FormData} formData - Form data containing submission details
 * @returns {Promise<SubmissionResponse>} Success status and any error details
 */
export async function createNewSubmission(formData: FormData): Promise<SubmissionResponse> {
  let userId: string | undefined
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: "You must be logged in to submit", errorCode: ActionErrorCode.AUTH_ERROR }
    }

    userId = user.id

    const missionId = formData.get("missionId") as string
    const answersString = formData.get("answers") as string | null
    const textSubmission = formData.get("textSubmission") as string | null
    const mediaFile = formData.get("mediaFile") as File | null

    if (!missionId) {
      return { success: false, error: "Mission ID is required", errorCode: ActionErrorCode.VALIDATION_ERROR }
    }

    let mediaUrl = null

    if (mediaFile && mediaFile.size > 0) {
      const fileExt = mediaFile.name.split(".").pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `${user.id}/${fileName}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("submissions-media")
        .upload(filePath, mediaFile)

      if (uploadError) {
        logger.error("createNewSubmission - media upload", uploadError, { userId })
        return {
          success: false,
          error: "Failed to upload media. Please try again",
          errorCode: ActionErrorCode.STORAGE_ERROR,
        }
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("submissions-media").getPublicUrl(uploadData.path)

      mediaUrl = publicUrl
    }

    const submissionData: Partial<Submission> = {
      mission_id: missionId,
      user_id: user.id,
      status: "pending",
      media_url: mediaUrl,
      created_at: new Date().toISOString(),
    }

    if (answersString) {
      try {
        submissionData.answers = JSON.parse(answersString) as Record<string, JsonValue>
      } catch (error) {
        return { success: false, error: "Invalid form data format", errorCode: ActionErrorCode.VALIDATION_ERROR }
      }
    } else if (textSubmission) {
      submissionData.text_submission = textSubmission
    }

    const { error } = await supabase.from("submissions").insert(submissionData)

    if (error) {
      logger.error("createNewSubmission - database insert", error, { userId })
      return {
        success: false,
        error: "Failed to create submission. Please try again",
        errorCode: ActionErrorCode.DATABASE_ERROR,
      }
    }

    revalidatePath(`/mission/${missionId}`)
    return { success: true, data: undefined }
  } catch (error) {
    return handleActionError(error, "createNewSubmission", userId)
  }
}
