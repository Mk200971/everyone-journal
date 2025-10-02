"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"

async function getAuthorizedAdminClient() {
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

export async function submitMission(formData: FormData) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: "Not authenticated" }
    }

    const missionId = formData.get("missionId") as string
    const textSubmission = formData.get("textSubmission") as string
    const mediaFile = formData.get("mediaFile") as File

    if (!missionId || !textSubmission) {
      return { success: false, error: "Mission ID and text submission are required" }
    }

    const { data: mission } = await supabase.from("missions").select("points_value").eq("id", missionId).single()

    if (!mission) {
      return { success: false, error: "Mission not found" }
    }

    let mediaUrl = null
    if (mediaFile && mediaFile.size > 0) {
      const fileExt = mediaFile.name.split(".").pop()
      const fileName = `${user.id}/${Date.now()}.${fileExt}`
      const { error: uploadError } = await supabase.storage.from("submissions").upload(fileName, mediaFile)

      if (!uploadError) {
        const {
          data: { publicUrl },
        } = supabase.storage.from("submissions").getPublicUrl(fileName)
        mediaUrl = publicUrl
      }
    }

    const { error } = await supabase.from("submissions").insert({
      mission_id: missionId,
      user_id: user.id,
      text_submission: textSubmission,
      media_url: mediaUrl,
      status: "pending",
      points_awarded: 0,
    })

    if (error) {
      return { success: false, error: "Failed to submit mission" }
    }

    revalidatePath(`/mission/${missionId}`)
    revalidatePath("/")

    return { success: true }
  } catch (error) {
    console.error("[Action] submitMission error:", error)
    return { success: false, error: "An error occurred" }
  }
}

export async function updateProfile(formData: FormData) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: "Not authenticated" }
    }

    const name = formData.get("name") as string
    const jobTitle = formData.get("job_title") as string
    const department = formData.get("department") as string
    const bio = formData.get("bio") as string
    const country = formData.get("country") as string
    const customerObsession = formData.get("customer_obsession") as string

    if (!name) {
      return { success: false, error: "Name is required" }
    }

    const { data: currentProfile } = await supabase
      .from("profiles")
      .select("name, job_title, department, bio, country, customer_obsession")
      .eq("id", user.id)
      .single()

    const updateData: any = { name }
    const changedFields: string[] = []

    if (currentProfile) {
      if (name !== currentProfile.name) changedFields.push("name")
      if (jobTitle && jobTitle !== currentProfile.job_title) {
        updateData.job_title = jobTitle
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
      if (customerObsession && customerObsession !== currentProfile.customer_obsession) {
        updateData.customer_obsession = customerObsession
        changedFields.push("customer obsession")
      }
    } else {
      if (jobTitle) updateData.job_title = jobTitle
      if (department) updateData.department = department
      if (bio) updateData.bio = bio
      if (country) updateData.country = country
      if (customerObsession) updateData.customer_obsession = customerObsession
    }

    const { error } = await supabase.from("profiles").update(updateData).eq("id", user.id)

    if (error) {
      return { success: false, error: "Failed to update profile" }
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

    return { success: true }
  } catch (error) {
    console.error("[Action] updateProfile error:", error)
    return { success: false, error: "An error occurred" }
  }
}

export async function signOut() {
  try {
    const supabase = await createClient()
    await supabase.auth.signOut({ scope: "global" })
    return { success: true, redirectTo: "/auth/login" }
  } catch (error) {
    return { success: false, error: "Failed to sign out" }
  }
}

export async function createMission(formData: FormData) {
  try {
    const { userId, adminClient } = await getAuthorizedAdminClient()

    const title = formData.get("title") as string
    const description = formData.get("description") as string
    const instructions = formData.get("instructions") as string
    const tipsInspiration = formData.get("tips_inspiration") as string
    const pointsValue = Number.parseInt(formData.get("points_value") as string)
    const typeRaw = formData.get("type") as string
    const type = typeRaw.charAt(0).toUpperCase() + typeRaw.slice(1)
    const resourceId = formData.get("resource_id") as string
    const finalResourceId = resourceId === "none" || resourceId === "" ? null : resourceId
    const quoteId = formData.get("quote_id") as string
    const finalQuoteId = quoteId === "none" || quoteId === "" ? null : quoteId
    const missionImageFile = formData.get("mission_image") as File
    const duration = formData.get("duration") as string
    const coordinator = formData.get("coordinator") as string
    const supportStatus = formData.get("support_status") as string
    const dueDate = formData.get("due_date") as string
    const submissionSchemaString = formData.get("submission_schema") as string
    const maxSubmissions = formData.get("max_submissions_per_user") as string
    const missionNumber = formData.get("mission_number") as string
    const displayOrder = formData.get("display_order") as string

    if (!title || !description || !pointsValue || !type) {
      return { success: false, error: "All required fields must be filled" }
    }

    let imageUrl = null
    if (missionImageFile && missionImageFile.size > 0) {
      const { data: buckets, error: bucketsError } = await adminClient.storage.listBuckets()
      if (bucketsError) {
        return { success: false, error: "Unable to access storage" }
      }

      const missionsBucket = buckets?.find((bucket) => bucket.id === "missions-media")
      if (!missionsBucket) {
        return { success: false, error: "missions-media bucket not found" }
      }

      const fileExt = missionImageFile.name.split(".").pop()
      const fileName = `mission-${Date.now()}.${fileExt}`
      const { error: uploadError } = await adminClient.storage.from("missions-media").upload(fileName, missionImageFile)

      if (uploadError) {
        return { success: false, error: `Image upload failed: ${uploadError.message}` }
      }

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
      imageUrl = `${supabaseUrl}/storage/v1/object/public/missions-media/${fileName}`
    }

    const missionData: any = {
      title,
      description,
      instructions: instructions || null,
      tips_inspiration: tipsInspiration || null,
      points_value: pointsValue,
      type,
      resource_id: finalResourceId,
      quote_id: finalQuoteId,
      image_url: imageUrl,
      duration: duration || null,
      coordinator: coordinator || null,
      support_status: supportStatus || null,
      due_date: dueDate || null,
    }

    if (missionNumber) missionData.mission_number = Number.parseInt(missionNumber)
    if (displayOrder) missionData.display_order = Number.parseInt(displayOrder)
    if (submissionSchemaString) {
      try {
        missionData.submission_schema = JSON.parse(submissionSchemaString)
      } catch {
        return { success: false, error: "Invalid submission schema format" }
      }
    }
    if (maxSubmissions) missionData.max_submissions_per_user = Number.parseInt(maxSubmissions)

    const { data, error } = await adminClient.from("missions").insert(missionData).select()

    if (error) {
      return { success: false, error: `Database error: ${error.message}` }
    }

    revalidatePath("/admin")
    revalidatePath("/")

    return { success: true, data }
  } catch (error) {
    console.error("[Action] createMission error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "An error occurred",
    }
  }
}

export async function updateMission(formData: FormData) {
  try {
    const { userId, adminClient } = await getAuthorizedAdminClient()

    const id = formData.get("id") as string
    const title = formData.get("title") as string
    const description = formData.get("description") as string
    const instructions = formData.get("instructions") as string
    const tipsInspiration = formData.get("tips_inspiration") as string
    const pointsValue = Number.parseInt(formData.get("points_value") as string)
    const typeRaw = formData.get("type") as string
    const type = typeRaw.charAt(0).toUpperCase() + typeRaw.slice(1)
    const resourceId = formData.get("resource_id") as string
    const finalResourceId = resourceId === "none" || resourceId === "" ? null : resourceId
    const quoteId = formData.get("quote_id") as string
    const finalQuoteId = quoteId === "none" || quoteId === "" ? null : quoteId
    const missionImageFile = formData.get("mission_image") as File
    const duration = formData.get("duration") as string
    const coordinator = formData.get("coordinator") as string
    const supportStatus = formData.get("support_status") as string
    const dueDate = formData.get("due_date") as string
    const submissionSchemaString = formData.get("submission_schema") as string
    const maxSubmissions = formData.get("max_submissions_per_user") as string
    const missionNumber = formData.get("mission_number") as string
    const displayOrder = formData.get("display_order") as string

    if (!id || !title || !description || !pointsValue || !type) {
      return { success: false, error: "All required fields must be filled" }
    }

    let imageUrl = null
    if (missionImageFile && missionImageFile.size > 0) {
      const { data: buckets, error: bucketsError } = await adminClient.storage.listBuckets()
      if (bucketsError) {
        return { success: false, error: "Unable to access storage" }
      }

      const missionsBucket = buckets?.find((bucket) => bucket.id === "missions-media")
      if (!missionsBucket) {
        return { success: false, error: "missions-media bucket not found" }
      }

      const fileExt = missionImageFile.name.split(".").pop()
      const fileName = `mission-${id}-${Date.now()}.${fileExt}`
      const { error: uploadError } = await adminClient.storage.from("missions-media").upload(fileName, missionImageFile)

      if (uploadError) {
        return { success: false, error: `Image upload failed: ${uploadError.message}` }
      }

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
      imageUrl = `${supabaseUrl}/storage/v1/object/public/missions-media/${fileName}`
    }

    const updateData: any = {
      title,
      description,
      instructions: instructions || null,
      tips_inspiration: tipsInspiration || null,
      points_value: pointsValue,
      type,
      resource_id: finalResourceId,
      quote_id: finalQuoteId,
      duration: duration || null,
      coordinator: coordinator || null,
      support_status: supportStatus || null,
      due_date: dueDate || null,
    }

    if (missionNumber) updateData.mission_number = Number.parseInt(missionNumber)
    if (displayOrder) updateData.display_order = Number.parseInt(displayOrder)
    if (submissionSchemaString) {
      try {
        updateData.submission_schema = JSON.parse(submissionSchemaString)
      } catch {
        return { success: false, error: "Invalid submission schema format" }
      }
    }
    if (maxSubmissions) updateData.max_submissions_per_user = Number.parseInt(maxSubmissions)
    if (imageUrl) updateData.image_url = imageUrl

    const { error } = await adminClient.from("missions").update(updateData).eq("id", id)

    if (error) {
      return { success: false, error: `Failed to update mission: ${error.message}` }
    }

    revalidatePath("/admin")
    revalidatePath("/")

    return { success: true }
  } catch (error) {
    console.error("[Action] updateMission error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "An error occurred",
    }
  }
}

export async function deleteMission(formData: FormData) {
  try {
    const { userId, adminClient } = await getAuthorizedAdminClient()

    const id = formData.get("id") as string
    if (!id) {
      return { success: false, error: "Mission ID is required" }
    }

    const { error } = await adminClient.from("missions").delete().eq("id", id)

    if (error) {
      return { success: false, error: "Failed to delete mission" }
    }

    revalidatePath("/admin")
    revalidatePath("/")

    return { success: true }
  } catch (error) {
    console.error("[Action] deleteMission error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "An error occurred",
    }
  }
}

export async function updateAvatar(formData: FormData) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: "Not authenticated" }
    }

    const file = formData.get("avatar") as File

    if (!file || file.size === 0) {
      return { success: false, error: "No file provided" }
    }

    if (!file.type.startsWith("image/")) {
      return { success: false, error: "File must be an image" }
    }

    if (file.size > 5 * 1024 * 1024) {
      return { success: false, error: "File size must be less than 5MB" }
    }

    const fileExt = file.name.split(".").pop()
    const fileName = `${user.id}/avatar.${fileExt}`

    const { error: uploadError } = await supabase.storage.from("avatars").upload(fileName, file, { upsert: true })

    if (uploadError) {
      return { success: false, error: `Upload failed: ${uploadError.message}` }
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(fileName)

    const { error: updateError } = await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", user.id)

    if (updateError) {
      return { success: false, error: `Profile update failed: ${updateError.message}` }
    }

    revalidatePath("/account")
    return { success: true, avatar_url: publicUrl }
  } catch (error) {
    console.error("[Action] updateAvatar error:", error)
    return { success: false, error: "An error occurred" }
  }
}

export async function exportAllData() {
  try {
    const { userId, adminClient } = await getAuthorizedAdminClient()

    const [missionsResult, profilesResult, submissionsResult, resourcesResult, noticeboardResult] = await Promise.all([
      adminClient.from("missions").select("*"),
      adminClient.from("profiles").select("*"),
      adminClient.from("submissions").select("*"),
      adminClient.from("resources").select("*"),
      adminClient.from("noticeboard_items").select("*"),
    ])

    if (missionsResult.error) return { success: false, error: `Missions fetch error: ${missionsResult.error.message}` }
    if (profilesResult.error) return { success: false, error: `Profiles fetch error: ${profilesResult.error.message}` }
    if (submissionsResult.error)
      return { success: false, error: `Submissions fetch error: ${submissionsResult.error.message}` }
    if (resourcesResult.error)
      return { success: false, error: `Resources fetch error: ${resourcesResult.error.message}` }
    if (noticeboardResult.error)
      return { success: false, error: `Noticeboard fetch error: ${noticeboardResult.error.message}` }

    const missionsMap = new Map(missionsResult.data?.map((m) => [m.id, m]) || [])
    const profilesMap = new Map(profilesResult.data?.map((p) => [p.id, p]) || [])

    const processedSubmissions =
      submissionsResult.data?.map((submission) => {
        const mission = missionsMap.get(submission.mission_id)
        const profile = profilesMap.get(submission.user_id)

        const baseSubmission = {
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
          const answers = submission.answers

          if (Array.isArray(schema)) {
            schema.forEach((field: any, index: number) => {
              const fieldKey = field.name || field.label || `question_${index + 1}`
              const answerKey = `answer_${index + 1}_${fieldKey.replace(/[^a-zA-Z0-9]/g, "_")}`
              const questionKey = `question_${index + 1}_${fieldKey.replace(/[^a-zA-Z0-9]/g, "_")}`

              baseSubmission[questionKey] = field.label || field.name || `Question ${index + 1}`
              baseSubmission[answerKey] = answers[fieldKey] || answers[field.name] || ""
            })
          }
        }

        return baseSubmission
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
    console.error("[Action] exportAllData error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}

export async function fetchAllCommunityActivity() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: "Not authenticated", data: [] }
    }

    const { data: submissions, error: submissionsError } = await supabase
      .from("submissions")
      .select("id, created_at, points_awarded, status, user_id, mission_id")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(10)

    if (submissionsError) {
      if (submissionsError.message?.includes("Too Many Requests") || submissionsError.message?.includes("rate limit")) {
        return { success: true, data: [] }
      }
      return { success: false, error: "Failed to fetch activity", data: [] }
    }

    const { data: profileActivities, error: profileActivitiesError } = await supabase
      .from("profile_activities")
      .select("id, created_at, user_id, changed_fields")
      .eq("activity_type", "profile_updated")
      .order("created_at", { ascending: false })
      .limit(5)

    const allActivities = []

    if (submissions && submissions.length > 0) {
      const userIds = [...new Set(submissions.map((s) => s.user_id))]
      const missionIds = [...new Set(submissions.map((s) => s.mission_id))]

      const { data: profiles } = await supabase.from("profiles").select("id, name, avatar_url").in("id", userIds)

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
          type: "submission",
        })
      })
    }

    if (profileActivities && profileActivities.length > 0) {
      const profileUserIds = [...new Set(profileActivities.map((a) => a.user_id))]

      const { data: profileUsers } = await supabase
        .from("profiles")
        .select("id, name, avatar_url")
        .in("id", profileUserIds)

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
            type: "profile_update",
            changed_fields: activity.changed_fields,
          })
        })
      }
    }

    const sortedActivities = allActivities
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10)

    return { success: true, data: sortedActivities }
  } catch (error) {
    console.error("[Action] fetchAllCommunityActivity error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
      data: [],
    }
  }
}

export async function signUp(formData: FormData) {
  try {
    const supabase = await createClient()

    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const name = formData.get("name") as string
    const jobTitle = formData.get("job_title") as string
    const department = formData.get("department") as string
    const bio = formData.get("bio") as string
    const country = formData.get("country") as string

    if (!email || !password || !name || !jobTitle || !department || !bio || !country) {
      return { success: false, error: "All fields are required" }
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL,
      },
    })

    if (error) {
      return { success: false, error: error.message }
    }

    if (data.user) {
      const adminSupabase = createAdminClient()

      const { error: profileError } = await adminSupabase.from("profiles").upsert(
        {
          id: data.user.id,
          name,
          email,
          job_title: jobTitle,
          department,
          bio: bio,
          country: country,
          total_points: 0,
        },
        {
          onConflict: "id",
        },
      )

      if (profileError) {
        return { success: false, error: "Profile creation error: " + profileError.message }
      }
    }

    return { success: true }
  } catch (error) {
    console.error("[Action] signUp error:", error)
    return { success: false, error: "An error occurred" }
  }
}

export async function updateMissionOrder(missions: Array<{ id: string; display_order: number }>) {
  try {
    const { userId, adminClient } = await getAuthorizedAdminClient()

    const updatePromises = missions.map(async (mission) => {
      const { error } = await adminClient
        .from("missions")
        .update({ display_order: mission.display_order })
        .eq("id", mission.id)

      if (error) throw error
      return mission
    })

    await Promise.all(updatePromises)

    revalidatePath("/admin")
    return { success: true }
  } catch (error) {
    console.error("[Action] updateMissionOrder error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update mission order",
    }
  }
}

export async function saveDraft(formData: FormData) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: "User not authenticated" }
    }

    const missionId = formData.get("missionId") as string
    const answersString = formData.get("answers") as string
    const textSubmission = formData.get("textSubmission") as string
    const existingDraftId = formData.get("existingDraftId") as string | null
    const mediaFile = formData.get("mediaFile") as File | null

    if (!missionId) {
      return { success: false, error: "Mission ID is required" }
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
        return { success: false, error: "Failed to upload media" }
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("submissions-media").getPublicUrl(uploadData.path)

      mediaUrl = publicUrl
    }

    const draftData: any = {
      mission_id: missionId,
      user_id: user.id,
      status: "draft",
      updated_at: new Date().toISOString(),
    }

    if (answersString) {
      try {
        draftData.answers = JSON.parse(answersString)
      } catch (error) {
        return { success: false, error: "Invalid answers format" }
      }
    } else if (textSubmission) {
      draftData.text_submission = textSubmission
    }

    if (mediaUrl) {
      draftData.media_url = mediaUrl
    }

    if (existingDraftId) {
      const { error } = await supabase
        .from("submissions")
        .update(draftData)
        .eq("id", existingDraftId)
        .eq("user_id", user.id)

      if (error) {
        return { success: false, error: "Failed to update draft" }
      }
    } else {
      draftData.created_at = new Date().toISOString()
      const { error } = await supabase.from("submissions").insert(draftData)

      if (error) {
        return { success: false, error: "Failed to create draft" }
      }
    }

    revalidatePath(`/mission/${missionId}`)
    return { success: true }
  } catch (error) {
    console.error("[Action] saveDraft error:", error)
    return { success: false, error: "An error occurred" }
  }
}

export async function deleteDraft(draftId: string) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: "User not authenticated" }
    }

    const { data: draft } = await supabase
      .from("submissions")
      .select("mission_id")
      .eq("id", draftId)
      .eq("user_id", user.id)
      .single()

    const { error } = await supabase.from("submissions").delete().eq("id", draftId).eq("user_id", user.id)

    if (error) {
      return { success: false, error: "Failed to delete draft" }
    }

    if (draft?.mission_id) {
      revalidatePath(`/mission/${draft.mission_id}`)
    }

    return { success: true }
  } catch (error) {
    console.error("[Action] deleteDraft error:", error)
    return { success: false, error: "An error occurred" }
  }
}

export async function updateSubmission(formData: FormData) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: "User not authenticated" }
    }

    const submissionId = formData.get("submissionId") as string
    const answersString = formData.get("answers") as string | null
    const textSubmission = formData.get("textSubmission") as string | null
    const mediaFile = formData.get("mediaFile") as File | null
    const removedMediaUrls = formData.get("removedMediaUrls") as string | null

    if (!submissionId) {
      return { success: false, error: "Submission ID is required" }
    }

    const { data: currentSubmission, error: fetchError } = await supabase
      .from("submissions")
      .select("status, media_url, mission_id")
      .eq("id", submissionId)
      .eq("user_id", user.id)
      .single()

    if (fetchError || !currentSubmission) {
      return { success: false, error: "Submission not found" }
    }

    let finalMediaUrl = currentSubmission.media_url

    if (removedMediaUrls) {
      try {
        const removedUrls = JSON.parse(removedMediaUrls)
        if (Array.isArray(removedUrls) && removedUrls.includes(currentSubmission.media_url)) {
          finalMediaUrl = null
        }
      } catch (error) {
        console.error("[Action] Error parsing removed media URLs:", error)
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
        return { success: false, error: "Failed to upload media" }
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("submissions-media").getPublicUrl(uploadData.path)

      finalMediaUrl = publicUrl
    }

    const updateData: any = {
      media_url: finalMediaUrl,
      updated_at: new Date().toISOString(),
    }

    if (answersString) {
      try {
        updateData.answers = JSON.parse(answersString)
      } catch (error) {
        return { success: false, error: "Invalid answers format" }
      }
    } else if (textSubmission) {
      updateData.text_submission = textSubmission
    }

    if (currentSubmission.status === "approved") {
      updateData.status = "pending"
      updateData.points_awarded = 0
    }

    const { error } = await supabase
      .from("submissions")
      .update(updateData)
      .eq("id", submissionId)
      .eq("user_id", user.id)

    if (error) {
      return { success: false, error: "Failed to update submission" }
    }

    revalidatePath(`/mission/${currentSubmission.mission_id}`)
    return { success: true, wasApproved: currentSubmission.status === "approved" }
  } catch (error) {
    console.error("[Action] updateSubmission error:", error)
    return { success: false, error: "An error occurred" }
  }
}

export async function submitDraftAsFinal(formData: FormData) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: "User not authenticated" }
    }

    const draftId = formData.get("draftId") as string
    const answersString = formData.get("answers") as string | null
    const textSubmission = formData.get("textSubmission") as string | null
    const mediaFile = formData.get("mediaFile") as File | null

    if (!draftId) {
      return { success: false, error: "Draft ID is required" }
    }

    const { data: draft, error: fetchError } = await supabase
      .from("submissions")
      .select("mission_id, media_url")
      .eq("id", draftId)
      .eq("user_id", user.id)
      .eq("status", "draft")
      .single()

    if (fetchError || !draft) {
      return { success: false, error: "Draft not found" }
    }

    let finalMediaUrl = draft.media_url

    if (mediaFile && mediaFile.size > 0) {
      const fileExt = mediaFile.name.split(".").pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `${user.id}/${fileName}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("submissions-media")
        .upload(filePath, mediaFile)

      if (uploadError) {
        return { success: false, error: "Failed to upload media" }
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("submissions-media").getPublicUrl(uploadData.path)

      finalMediaUrl = publicUrl
    }

    const updateData: any = {
      status: "pending",
      media_url: finalMediaUrl,
      updated_at: new Date().toISOString(),
    }

    if (answersString) {
      try {
        updateData.answers = JSON.parse(answersString)
      } catch (error) {
        return { success: false, error: "Invalid answers format" }
      }
    } else if (textSubmission) {
      updateData.text_submission = textSubmission
    }

    const { error } = await supabase.from("submissions").update(updateData).eq("id", draftId).eq("user_id", user.id)

    if (error) {
      return { success: false, error: "Failed to submit draft" }
    }

    revalidatePath(`/mission/${draft.mission_id}`)
    return { success: true, missionId: draft.mission_id }
  } catch (error) {
    console.error("[Action] submitDraftAsFinal error:", error)
    return { success: false, error: "An error occurred" }
  }
}

export async function createNewSubmission(formData: FormData) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: "User not authenticated" }
    }

    const missionId = formData.get("missionId") as string
    const answersString = formData.get("answers") as string | null
    const textSubmission = formData.get("textSubmission") as string | null
    const mediaFile = formData.get("mediaFile") as File | null

    if (!missionId) {
      return { success: false, error: "Mission ID is required" }
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
        return { success: false, error: "Failed to upload media" }
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("submissions-media").getPublicUrl(uploadData.path)

      mediaUrl = publicUrl
    }

    const submissionData: any = {
      mission_id: missionId,
      user_id: user.id,
      status: "pending",
      media_url: mediaUrl,
      created_at: new Date().toISOString(),
    }

    if (answersString) {
      try {
        submissionData.answers = JSON.parse(answersString)
      } catch (error) {
        return { success: false, error: "Invalid answers format" }
      }
    } else if (textSubmission) {
      submissionData.text_submission = textSubmission
    }

    const { error } = await supabase.from("submissions").insert(submissionData)

    if (error) {
      return { success: false, error: "Failed to create submission" }
    }

    revalidatePath(`/mission/${missionId}`)
    return { success: true }
  } catch (error) {
    console.error("[Action] createNewSubmission error:", error)
    return { success: false, error: "An error occurred" }
  }
}
