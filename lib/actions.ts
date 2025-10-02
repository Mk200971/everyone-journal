"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function submitMission(formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const missionId = formData.get("missionId") as string
  const textSubmission = formData.get("textSubmission") as string
  const mediaFile = formData.get("mediaFile") as File

  if (!missionId || !textSubmission) {
    throw new Error("Mission ID and text submission are required")
  }

  // Get mission details to determine points
  const { data: mission } = await supabase.from("missions").select("points_value").eq("id", missionId).single()

  if (!mission) {
    throw new Error("Mission not found")
  }

  let mediaUrl = null

  // Handle file upload if provided
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

  // Insert submission
  const { error } = await supabase.from("submissions").insert({
    mission_id: missionId,
    user_id: user.id,
    text_submission: textSubmission,
    media_url: mediaUrl,
    status: "approved", // Auto-approve for demo purposes
    points_awarded: mission.points_value,
  })

  if (error) {
    throw new Error("Failed to submit mission")
  }

  const { error: rpcError } = await supabase.rpc("add_points_to_profile", {
    user_id_input: user.id,
    points_to_add: mission.points_value,
  })

  if (rpcError) {
    console.error("Failed to update points:", rpcError)
    // Note: Submission was successful, but points update failed
  }

  revalidatePath("/")
  revalidatePath("/leaderboard")
  revalidatePath("/account")
}

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const name = formData.get("name") as string
  const jobTitle = formData.get("job_title") as string
  const department = formData.get("department") as string
  const bio = formData.get("bio") as string
  const country = formData.get("country") as string
  const customerObsession = formData.get("customer_obsession") as string

  if (!name) {
    throw new Error("Name is required")
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
    // If no current profile, add all provided fields
    if (jobTitle) {
      updateData.job_title = jobTitle
      changedFields.push("job title")
    }
    if (department) {
      updateData.department = department
      changedFields.push("department")
    }
    if (bio) {
      updateData.bio = bio
      changedFields.push("bio")
    }
    if (country) {
      updateData.country = country
      changedFields.push("country")
    }
    if (customerObsession) {
      updateData.customer_obsession = customerObsession
      changedFields.push("customer obsession")
    }
  }

  console.log("[v0] Profile update - changed fields:", changedFields)

  const { error } = await supabase.from("profiles").update(updateData).eq("id", user.id)

  if (error) {
    console.log("[v0] Profile update error:", error)
    throw new Error("Failed to update profile")
  }

  if (changedFields.length > 0) {
    console.log("[v0] Attempting to log profile activity for user:", user.id)
    const adminSupabase = createAdminClient()

    const { data: activityData, error: activityError } = await adminSupabase
      .from("profile_activities")
      .insert({
        user_id: user.id,
        activity_type: "profile_updated",
        changed_fields: changedFields,
        created_at: new Date().toISOString(),
      })
      .select()

    if (activityError) {
      console.log("[v0] Profile activity insertion error:", activityError)
      // Don't throw error here - profile update was successful, activity logging is secondary
    } else {
      console.log("[v0] Profile activity logged successfully:", activityData)
    }
  } else {
    console.log("[v0] No fields changed, skipping activity log")
  }

  revalidatePath("/account")
  revalidatePath("/activity")
  revalidatePath("/")
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut({ scope: "global" })
  redirect("/auth/login")
}

export async function createMission(formData: FormData) {
  console.log("[v0] Starting createMission function")

  const supabase = createAdminClient()
  console.log("[v0] Admin client created")

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

  console.log("[v0] Form data extracted:", {
    title,
    description,
    instructions,
    tipsInspiration,
    pointsValue,
    type,
    resourceId: finalResourceId,
    quoteId: finalQuoteId,
    duration,
    coordinator,
    supportStatus,
    dueDate,
    submissionSchema: submissionSchemaString ? "present" : "not present",
    maxSubmissions,
    missionNumber,
    displayOrder,
  })

  if (!title || !description || !pointsValue || !type) {
    console.log("[v0] Validation failed - missing required fields")
    throw new Error("All fields are required")
  }

  let imageUrl = null
  if (missionImageFile && missionImageFile.size > 0) {
    console.log("[v0] Processing mission image upload")

    try {
      // Check if bucket exists first
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
      if (bucketsError) {
        console.log("[v0] Error checking buckets:", bucketsError)
        throw new Error("Unable to access storage")
      }

      const missionsBucket = buckets?.find((bucket) => bucket.id === "missions-media")
      if (!missionsBucket) {
        console.log(
          "[v0] Available buckets:",
          buckets?.map((b) => b.id),
        )
        throw new Error("missions-media bucket not found. Please run the database setup script.")
      }

      const fileExt = missionImageFile.name.split(".").pop()
      const fileName = `mission-${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage.from("missions-media").upload(fileName, missionImageFile)

      if (uploadError) {
        console.log("[v0] Image upload error:", uploadError)
        throw new Error(`Image upload failed: ${uploadError.message}`)
      }

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
      imageUrl = `${supabaseUrl}/storage/v1/object/public/missions-media/${fileName}`
      console.log("[v0] Image uploaded successfully:", imageUrl)
    } catch (error) {
      console.log("[v0] Image upload process failed:", error)
      throw error
    }
  }

  try {
    console.log("[v0] Attempting to insert mission into database")

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

    if (missionNumber) {
      missionData.mission_number = Number.parseInt(missionNumber)
    }

    if (displayOrder) {
      missionData.display_order = Number.parseInt(displayOrder)
    }

    if (submissionSchemaString !== undefined && submissionSchemaString !== null) {
      try {
        const parsedSchema = submissionSchemaString ? JSON.parse(submissionSchemaString) : null
        missionData.submission_schema = parsedSchema
        console.log("[v0] Parsed submission schema for create:", parsedSchema ? "valid JSON" : "null")
      } catch (error) {
        console.log("[v0] Error parsing submission schema:", error)
        throw new Error("Invalid submission schema format")
      }
    }

    if (maxSubmissions) {
      missionData.max_submissions_per_user = Number.parseInt(maxSubmissions)
    }

    const { data, error } = await supabase.from("missions").insert(missionData).select()

    if (error) {
      console.log("[v0] Supabase error details:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      })
      throw new Error(`Database error: ${error.message}`)
    }

    console.log("[v0] Mission created successfully:", data)
    revalidatePath("/admin")
    return { success: true, data }
  } catch (err) {
    console.log("[v0] Caught error in createMission:", err)
    throw err
  }
}

export async function updateMission(formData: FormData) {
  console.log("[v0] Starting updateMission function")
  const supabase = createAdminClient()

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

  console.log("[v0] Form data extracted:", {
    id,
    title,
    description,
    instructions,
    tipsInspiration,
    pointsValue,
    type,
    resourceId: finalResourceId,
    quoteId: finalQuoteId,
    duration,
    coordinator,
    supportStatus,
    dueDate,
    submissionSchema: submissionSchemaString ? "present" : "not present",
    maxSubmissions,
    missionNumber,
    displayOrder,
  })

  if (!id || !title || !description || !pointsValue || !type) {
    throw new Error("All fields are required")
  }

  let imageUrl = null
  if (missionImageFile && missionImageFile.size > 0) {
    console.log("[v0] Processing mission image upload for update")

    try {
      // Check if bucket exists first
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
      if (bucketsError) {
        console.log("[v0] Error checking buckets:", bucketsError)
        throw new Error("Unable to access storage")
      }

      const missionsBucket = buckets?.find((bucket) => bucket.id === "missions-media")
      if (!missionsBucket) {
        console.log(
          "[v0] Available buckets:",
          buckets?.map((b) => b.id),
        )
        throw new Error("missions-media bucket not found. Please run the database setup script.")
      }

      const fileExt = missionImageFile.name.split(".").pop()
      const fileName = `mission-${id}-${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage.from("missions-media").upload(fileName, missionImageFile)

      if (uploadError) {
        console.log("[v0] Image upload error:", uploadError)
        throw new Error(`Image upload failed: ${uploadError.message}`)
      }

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
      imageUrl = `${supabaseUrl}/storage/v1/object/public/missions-media/${fileName}`
      console.log("[v0] Image uploaded successfully:", imageUrl)
    } catch (error) {
      console.log("[v0] Image upload process failed:", error)
      throw error
    }
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

  if (missionNumber) {
    updateData.mission_number = Number.parseInt(missionNumber)
  }

  if (displayOrder) {
    updateData.display_order = Number.parseInt(displayOrder)
  }

  if (submissionSchemaString !== undefined && submissionSchemaString !== null) {
    try {
      const parsedSchema = submissionSchemaString ? JSON.parse(submissionSchemaString) : null
      updateData.submission_schema = parsedSchema
      console.log("[v0] Parsed submission schema:", parsedSchema ? "valid JSON" : "null")
    } catch (error) {
      console.log("[v0] Error parsing submission schema:", error)
      throw new Error("Invalid submission schema format")
    }
  }

  if (maxSubmissions) {
    updateData.max_submissions_per_user = Number.parseInt(maxSubmissions)
  }

  if (imageUrl) {
    updateData.image_url = imageUrl
  }

  const { error } = await supabase.from("missions").update(updateData).eq("id", id)

  if (error) {
    console.log("[v0] Update mission error:", error)
    throw new Error(`Failed to update mission: ${error.message}`)
  }

  console.log("[v0] Mission updated successfully")
  revalidatePath("/admin")
}

export async function deleteMission(formData: FormData) {
  const supabase = createAdminClient()

  const id = formData.get("id") as string

  if (!id) {
    throw new Error("Mission ID is required")
  }

  const { error } = await supabase.from("missions").delete().eq("id", id)

  if (error) {
    throw new Error("Failed to delete mission")
  }

  revalidatePath("/admin")
}

export async function updateAvatar(formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const file = formData.get("avatar") as File

  if (!file || file.size === 0) {
    throw new Error("No file provided")
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("File must be an image")
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("File size must be less than 5MB")
  }

  try {
    const fileExt = file.name.split(".").pop()
    const fileName = `${user.id}/avatar.${fileExt}`

    const { error: uploadError } = await supabase.storage.from("avatars").upload(fileName, file, { upsert: true })

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`)
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(fileName)

    const { error: updateError } = await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", user.id)

    if (updateError) {
      throw new Error(`Profile update failed: ${updateError.message}`)
    }

    revalidatePath("/account")
    return { success: true, avatar_url: publicUrl }
  } catch (error) {
    console.error("Avatar upload error:", error)
    throw error
  }
}

export async function exportAllData() {
  console.log("[v0] Starting server-side comprehensive Excel export...")

  const supabase = createAdminClient()
  console.log("[v0] Admin client created for export")

  try {
    console.log("[v0] Fetching data from all tables with admin privileges...")

    // Fetch all tables data with admin client that bypasses RLS
    const [missionsResult, profilesResult, submissionsResult, resourcesResult, noticeboardResult] = await Promise.all([
      supabase.from("missions").select("*"),
      supabase.from("profiles").select("*"),
      supabase
        .from("submissions")
        .select("*"), // Fetch submissions without joins first
      supabase.from("resources").select("*"),
      supabase.from("noticeboard_items").select("*"),
    ])

    console.log("[v0] Missions fetched:", missionsResult.data?.length || 0, "records")
    console.log("[v0] Profiles fetched:", profilesResult.data?.length || 0, "records")
    console.log("[v0] Submissions fetched:", submissionsResult.data?.length || 0, "records")
    console.log("[v0] Resources fetched:", resourcesResult.data?.length || 0, "records")
    console.log("[v0] Noticeboard items fetched:", noticeboardResult.data?.length || 0, "records")

    // Check for errors
    if (missionsResult.error) throw new Error(`Missions fetch error: ${missionsResult.error.message}`)
    if (profilesResult.error) throw new Error(`Profiles fetch error: ${profilesResult.error.message}`)
    if (submissionsResult.error) throw new Error(`Submissions fetch error: ${submissionsResult.error.message}`)
    if (resourcesResult.error) throw new Error(`Resources fetch error: ${resourcesResult.error.message}`)
    if (noticeboardResult.error) throw new Error(`Noticeboard fetch error: ${noticeboardResult.error.message}`)

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

        // Process structured answers if they exist
        if (submission.answers && mission?.submission_schema) {
          const schema = mission.submission_schema
          const answers = submission.answers

          // Add each question-answer pair as separate columns
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
    console.error("[v0] Export error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}

export async function fetchAllCommunityActivity() {
  console.log("[v0] Starting server-side community activity fetch...")

  const supabase = createAdminClient()
  console.log("[v0] Admin client created for community activity")

  try {
    // Fetch recent submissions from all users using admin client
    const { data: submissions, error: submissionsError } = await supabase
      .from("submissions")
      .select("id, created_at, points_awarded, status, user_id, mission_id")
      .order("created_at", { ascending: false })
      .limit(10)

    if (submissionsError) {
      console.error("[v0] Error fetching submissions:", submissionsError)
      if (submissionsError.message?.includes("Too Many Requests") || submissionsError.message?.includes("rate limit")) {
        console.log("[v0] Rate limit detected, returning empty data")
        return { success: true, data: [] }
      }
      throw new Error(`Submissions fetch error: ${submissionsError.message}`)
    }

    const { data: profileActivities, error: profileActivitiesError } = await supabase
      .from("profile_activities")
      .select("id, created_at, user_id, changed_fields")
      .eq("activity_type", "profile_updated")
      .order("created_at", { ascending: false })
      .limit(5)

    if (profileActivitiesError) {
      console.error("[v0] Error fetching profile activities:", profileActivitiesError)
      if (
        profileActivitiesError.message?.includes("Too Many Requests") ||
        profileActivitiesError.message?.includes("rate limit")
      ) {
        console.log("[v0] Rate limit detected on profile activities")
      }
    }

    console.log("[v0] Raw submissions from database:", submissions?.length || 0, "items")
    console.log("[v0] Profile activities from database:", profileActivities?.length || 0, "items")

    // Combine all activities
    const allActivities = []

    if (submissions && submissions.length > 0) {
      // Get unique user IDs and mission IDs
      const userIds = [...new Set(submissions.map((s) => s.user_id))]
      const missionIds = [...new Set(submissions.map((s) => s.mission_id))]

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, name, avatar_url")
        .in("id", userIds)

      if (profilesError) {
        console.error("[v0] Error fetching profiles:", profilesError)
      }

      const { data: missions, error: missionsError } = await supabase
        .from("missions")
        .select("id, title")
        .in("id", missionIds)

      if (missionsError) {
        console.error("[v0] Error fetching missions:", missionsError)
      }

      // Create lookup maps for efficient data joining
      const profilesMap = new Map(profiles?.map((p) => [p.id, p]) || [])
      const missionsMap = new Map(missions?.map((m) => [m.id, m]) || [])

      // Transform submission data
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

      const { data: profileUsers, error: profileUsersError } = await supabase
        .from("profiles")
        .select("id, name, avatar_url")
        .in("id", profileUserIds)

      if (!profileUsersError && profileUsers) {
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

    // Sort all activities by date and limit to 10
    const sortedActivities = allActivities
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10)

    console.log("[v0] Formatted community activity:", sortedActivities.length, "items")
    console.log(
      "[v0] Activity users:",
      sortedActivities.map((a) => a.user_name),
    )

    return { success: true, data: sortedActivities }
  } catch (error) {
    console.error("[v0] Community activity fetch error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
      data: [],
    }
  }
}

export async function signUp(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const name = formData.get("name") as string
  const jobTitle = formData.get("job_title") as string
  const department = formData.get("department") as string
  const bio = formData.get("bio") as string
  const country = formData.get("country") as string

  if (!email || !password || !name || !jobTitle || !department || !bio || !country) {
    throw new Error("All fields are required")
  }

  // Create the user account
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL,
    },
  })

  if (error) {
    throw new Error(error.message)
  }

  if (data.user) {
    const adminSupabase = createAdminClient()

    // The trigger creates a basic profile, so we update it with the additional fields
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
      console.error("Profile creation error:", profileError)
      throw new Error("Profile creation error: " + profileError.message)
    }
  }

  return { success: true }
}

export async function updateMissionOrder(missions: Array<{ id: string; display_order: number }>) {
  console.log("[v0] Starting updateMissionOrder server action")
  const supabase = createAdminClient()

  try {
    // Update all missions with new display_order using admin client
    const updatePromises = missions.map(async (mission) => {
      console.log("[v0] Updating mission:", mission.id, "to order:", mission.display_order)
      const { error } = await supabase
        .from("missions")
        .update({ display_order: mission.display_order })
        .eq("id", mission.id)

      if (error) throw error
      return mission
    })

    await Promise.all(updatePromises)

    console.log("[v0] All mission order updates completed successfully")
    revalidatePath("/admin")
    return { success: true }
  } catch (error) {
    console.error("[v0] Failed to update mission order:", error)
    throw new Error(`Failed to update mission order: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

export async function saveDraft(formData: FormData) {
  console.log("[v0] saveDraft server action called")
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("User not authenticated")
  }

  const missionId = formData.get("missionId") as string
  const answersString = formData.get("answers") as string
  const textSubmission = formData.get("textSubmission") as string
  const existingDraftId = formData.get("existingDraftId") as string | null
  const mediaFile = formData.get("mediaFile") as File | null

  if (!missionId) {
    throw new Error("Mission ID is required")
  }

  let mediaUrl = null

  // Handle media upload if provided
  if (mediaFile && mediaFile.size > 0) {
    const fileExt = mediaFile.name.split(".").pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `${user.id}/${fileName}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("submissions-media")
      .upload(filePath, mediaFile)

    if (uploadError) {
      console.error("[v0] Upload error:", uploadError)
      throw new Error("Failed to upload media")
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

  // Handle structured answers or legacy text submission
  if (answersString) {
    try {
      draftData.answers = JSON.parse(answersString)
    } catch (error) {
      console.error("[v0] Error parsing answers:", error)
      throw new Error("Invalid answers format")
    }
  } else if (textSubmission) {
    draftData.text_submission = textSubmission
  }

  if (mediaUrl) {
    draftData.media_url = mediaUrl
  }

  // Update existing draft or create new one
  if (existingDraftId) {
    console.log("[v0] Updating existing draft:", existingDraftId)
    const { error } = await supabase
      .from("submissions")
      .update(draftData)
      .eq("id", existingDraftId)
      .eq("user_id", user.id)

    if (error) {
      console.error("[v0] Update draft error:", error)
      throw new Error("Failed to update draft")
    }
  } else {
    console.log("[v0] Creating new draft")
    draftData.created_at = new Date().toISOString()
    const { error } = await supabase.from("submissions").insert(draftData)

    if (error) {
      console.error("[v0] Insert draft error:", error)
      throw new Error("Failed to create draft")
    }
  }

  revalidatePath(`/mission/${missionId}`)
  return { success: true }
}

export async function deleteDraft(draftId: string) {
  console.log("[v0] deleteDraft server action called for:", draftId)
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("User not authenticated")
  }

  // Get mission ID before deleting for revalidation
  const { data: draft } = await supabase
    .from("submissions")
    .select("mission_id")
    .eq("id", draftId)
    .eq("user_id", user.id)
    .single()

  const { error } = await supabase.from("submissions").delete().eq("id", draftId).eq("user_id", user.id)

  if (error) {
    console.error("[v0] Delete draft error:", error)
    throw new Error("Failed to delete draft")
  }

  if (draft?.mission_id) {
    revalidatePath(`/mission/${draft.mission_id}`)
  }

  return { success: true }
}

export async function updateSubmission(formData: FormData) {
  console.log("[v0] updateSubmission server action called")
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("User not authenticated")
  }

  const submissionId = formData.get("submissionId") as string
  const answersString = formData.get("answers") as string | null
  const textSubmission = formData.get("textSubmission") as string | null
  const mediaFile = formData.get("mediaFile") as File | null
  const removedMediaUrls = formData.get("removedMediaUrls") as string | null

  if (!submissionId) {
    throw new Error("Submission ID is required")
  }

  // Get current submission to check status and media
  const { data: currentSubmission, error: fetchError } = await supabase
    .from("submissions")
    .select("status, media_url, mission_id")
    .eq("id", submissionId)
    .eq("user_id", user.id)
    .single()

  if (fetchError || !currentSubmission) {
    console.error("[v0] Fetch submission error:", fetchError)
    throw new Error("Submission not found")
  }

  let finalMediaUrl = currentSubmission.media_url

  // Handle media removal
  if (removedMediaUrls) {
    try {
      const removedUrls = JSON.parse(removedMediaUrls)
      if (Array.isArray(removedUrls) && removedUrls.includes(currentSubmission.media_url)) {
        finalMediaUrl = null
      }
    } catch (error) {
      console.error("[v0] Error parsing removed media URLs:", error)
    }
  }

  // Handle new media upload
  if (mediaFile && mediaFile.size > 0) {
    const fileExt = mediaFile.name.split(".").pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `${user.id}/${fileName}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("submissions-media")
      .upload(filePath, mediaFile)

    if (uploadError) {
      console.error("[v0] Upload error:", uploadError)
      throw new Error("Failed to upload media")
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

  // Handle structured answers or legacy text submission
  if (answersString) {
    try {
      updateData.answers = JSON.parse(answersString)
    } catch (error) {
      console.error("[v0] Error parsing answers:", error)
      throw new Error("Invalid answers format")
    }
  } else if (textSubmission) {
    updateData.text_submission = textSubmission
  }

  // If submission was approved, reset to pending for re-review
  if (currentSubmission.status === "approved") {
    updateData.status = "pending"
    updateData.points_awarded = 0
  }

  const { error } = await supabase.from("submissions").update(updateData).eq("id", submissionId).eq("user_id", user.id)

  if (error) {
    console.error("[v0] Update submission error:", error)
    throw new Error("Failed to update submission")
  }

  revalidatePath(`/mission/${currentSubmission.mission_id}`)
  return { success: true, wasApproved: currentSubmission.status === "approved" }
}

export async function submitDraftAsFinal(formData: FormData) {
  console.log("[v0] submitDraftAsFinal server action called")
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("User not authenticated")
  }

  const draftId = formData.get("draftId") as string
  const answersString = formData.get("answers") as string | null
  const textSubmission = formData.get("textSubmission") as string | null
  const mediaFile = formData.get("mediaFile") as File | null

  if (!draftId) {
    throw new Error("Draft ID is required")
  }

  // Get draft to check mission_id
  const { data: draft, error: fetchError } = await supabase
    .from("submissions")
    .select("mission_id, media_url")
    .eq("id", draftId)
    .eq("user_id", user.id)
    .eq("status", "draft")
    .single()

  if (fetchError || !draft) {
    console.error("[v0] Fetch draft error:", fetchError)
    throw new Error("Draft not found")
  }

  let finalMediaUrl = draft.media_url

  // Handle new media upload
  if (mediaFile && mediaFile.size > 0) {
    const fileExt = mediaFile.name.split(".").pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `${user.id}/${fileName}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("submissions-media")
      .upload(filePath, mediaFile)

    if (uploadError) {
      console.error("[v0] Upload error:", uploadError)
      throw new Error("Failed to upload media")
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

  // Handle structured answers or legacy text submission
  if (answersString) {
    try {
      updateData.answers = JSON.parse(answersString)
    } catch (error) {
      console.error("[v0] Error parsing answers:", error)
      throw new Error("Invalid answers format")
    }
  } else if (textSubmission) {
    updateData.text_submission = textSubmission
  }

  const { error } = await supabase.from("submissions").update(updateData).eq("id", draftId).eq("user_id", user.id)

  if (error) {
    console.error("[v0] Submit draft error:", error)
    throw new Error("Failed to submit draft")
  }

  revalidatePath(`/mission/${draft.mission_id}`)
  return { success: true, missionId: draft.mission_id }
}

export async function createNewSubmission(formData: FormData) {
  console.log("[v0] createNewSubmission server action called")
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("User not authenticated")
  }

  const missionId = formData.get("missionId") as string
  const answersString = formData.get("answers") as string | null
  const textSubmission = formData.get("textSubmission") as string | null
  const mediaFile = formData.get("mediaFile") as File | null

  if (!missionId) {
    throw new Error("Mission ID is required")
  }

  let mediaUrl = null

  // Handle media upload if provided
  if (mediaFile && mediaFile.size > 0) {
    const fileExt = mediaFile.name.split(".").pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `${user.id}/${fileName}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("submissions-media")
      .upload(filePath, mediaFile)

    if (uploadError) {
      console.error("[v0] Upload error:", uploadError)
      throw new Error("Failed to upload media")
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

  // Handle structured answers or legacy text submission
  if (answersString) {
    try {
      submissionData.answers = JSON.parse(answersString)
    } catch (error) {
      console.error("[v0] Error parsing answers:", error)
      throw new Error("Invalid answers format")
    }
  } else if (textSubmission) {
    submissionData.text_submission = textSubmission
  }

  const { error } = await supabase.from("submissions").insert(submissionData)

  if (error) {
    console.error("[v0] Insert submission error:", error)
    throw new Error("Failed to create submission")
  }

  revalidatePath(`/mission/${missionId}`)
  return { success: true }
}
