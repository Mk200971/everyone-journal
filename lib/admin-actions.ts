"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { logger } from "@/lib/logger"
import type { UserRole, MissionTypeEntity, MissionAssignment, Profile, UserSubmission, Program } from "@/types/database"

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

export interface UserSubmission {
  id: string
  mission_id: string
  user_id: string
  text_submission: string | null
  media_url: string | null
  status: "pending" | "approved" | "rejected"
  points_awarded: number
  created_at: string
  updated_at: string
  mission: {
    title: string
    points_value: number
  } | null
}

export interface FullExportData {
  profiles: Profile[]
  missions: any[]
  submissions: any[]
  resources: any[]
  programs: Program[]
  mission_programs: any[]
  mission_assignments: any[]
  mission_types: MissionTypeEntity[]
}

async function verifyAdminAccess(): Promise<{ userId: string; isAdmin: boolean }> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    logger.warn("Unauthorized access attempt: Not authenticated", { error: authError })
    throw new Error("Unauthorized: Not authenticated")
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profileError || profile?.role !== "admin") {
    logger.warn("Unauthorized access attempt: User is not admin", { userId: user.id, role: profile?.role })
    throw new Error("Unauthorized: Admin access required")
  }

  return { userId: user.id, isAdmin: true }
}

export async function fetchAllSubmissions(): Promise<AdminSubmission[]> {
  await verifyAdminAccess()
  const supabase = createAdminClient()

  try {
    const [submissionsResult, missionsResult, profilesResult] = await Promise.all([
      supabase.from("submissions").select("*").order("created_at", { ascending: false }),
      supabase.from("missions").select("id, title, description, points_value, submission_schema"),
      supabase.from("profiles").select("id, name, avatar_url").eq("is_deleted", false),
    ])

    if (submissionsResult.error) throw submissionsResult.error
    if (missionsResult.error) throw missionsResult.error
    if (profilesResult.error) throw profilesResult.error

    const missionsMap = new Map(missionsResult.data?.map((m) => [m.id, m]) || [])
    const profilesMap = new Map(profilesResult.data?.map((p) => [p.id, p]) || [])

    const transformedData =
      submissionsResult.data
        ?.filter((submission) => profilesMap.has(submission.user_id))
        .map((submission) => ({
          ...submission,
          mission: missionsMap.get(submission.mission_id) || {
            title: "Unknown Mission",
            description: "",
            points_value: 0,
            submission_schema: null,
          },
          profile: profilesMap.get(submission.user_id)!,
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

    revalidatePath("/admin/submissions", "max")
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

    revalidatePath("/admin/submissions", "max")
    return { success: true }
  } catch (error) {
    logger.error("Error deleting submission", error, { action: "deleteSubmissionAdmin", metadata: { submissionId } })
    throw new Error("Failed to delete submission")
  }
}

/**
 * Fetches all users with their roles
 */
export async function getAllUsers(): Promise<Profile[]> {
  try {
    await verifyAdminAccess()
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("is_deleted", false)
      .order("name", { ascending: true })

    if (error) throw error

    return data || []
  } catch (error) {
    logger.error("Error fetching users", error, { action: "getAllUsers" })
    throw new Error("Failed to fetch users")
  }
}

/**
 * Updates a user's role
 */
export async function updateUserRole(userId: string, role: UserRole): Promise<{ success: boolean }> {
  try {
    await verifyAdminAccess()
    const supabase = createAdminClient()

    const { error } = await supabase.from("profiles").update({ role }).eq("id", userId)

    if (error) throw error

    revalidatePath("/admin/users", "max")
    return { success: true }
  } catch (error) {
    logger.error("Error updating user role", error, { action: "updateUserRole", metadata: { userId, role } })
    throw new Error("Failed to update user role")
  }
}

/**
 * Updates a user's profile information (Admin only)
 */
export async function adminUpdateUserProfile(
  userId: string,
  data: {
    name: string
    job_title?: string
    department?: string
    bio?: string
    country?: string
    customer_obsession?: string
  }
): Promise<{ success: boolean }> {
  try {
    await verifyAdminAccess()
    const supabase = createAdminClient()

    const { error } = await supabase
      .from("profiles")
      .update(data)
      .eq("id", userId)

    if (error) throw error

    revalidatePath("/admin/users", "max")
    return { success: true }
  } catch (error) {
    logger.error("Error updating user profile", error, { action: "adminUpdateUserProfile", metadata: { userId, ...data } })
    throw new Error("Failed to update user profile")
  }
}

/**
 * Fetches all mission types
 */
export async function getMissionTypes(): Promise<MissionTypeEntity[]> {
  try {
    await verifyAdminAccess()
    const supabase = createAdminClient()

    const { data, error } = await supabase.from("mission_types").select("*").order("name", { ascending: true })

    if (error) throw error

    return data || []
  } catch (error) {
    logger.error("Error fetching mission types", error, { action: "getMissionTypes" })
    throw new Error("Failed to fetch mission types")
  }
}

/**
 * Creates a new mission type
 */
export async function createMissionType(name: string, description?: string): Promise<{ success: boolean; data?: MissionTypeEntity }> {
  try {
    await verifyAdminAccess()
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from("mission_types")
      .insert({ name, description: description || null })
      .select()
      .single()

    if (error) throw error

    revalidatePath("/admin", "max")
    return { success: true, data }
  } catch (error) {
    logger.error("Error creating mission type", error, { action: "createMissionType", metadata: { name } })
    throw new Error("Failed to create mission type")
  }
}

/**
 * Assigns a mission to a specific user
 */
export async function assignMissionToUser(missionId: string, userId: string): Promise<{ success: boolean }> {
  try {
    const { userId: adminId } = await verifyAdminAccess()
    const supabase = createAdminClient()

    const { error } = await supabase
      .from("mission_assignments")
      .insert({ mission_id: missionId, user_id: userId, assigned_by: adminId })
      .select()

    if (error) {
      if (error.code === "23505") {
        return { success: true }
      }
      throw error
    }

    revalidatePath("/admin/missions", "max")
    revalidatePath("/missions", "max")
    return { success: true }
  } catch (error) {
    logger.error("Error assigning mission", error, { action: "assignMissionToUser", metadata: { missionId, userId } })
    throw new Error("Failed to assign mission")
  }
}

/**
 * Assigns a mission to all participants
 */
export async function assignMissionToAllParticipants(missionId: string): Promise<{ success: boolean; count: number }> {
  try {
    const { userId: adminId } = await verifyAdminAccess()
    const supabase = createAdminClient()

    const { data: participants, error: fetchError } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "participant")
      .eq("is_deleted", false)

    if (fetchError) throw fetchError

    if (!participants || participants.length === 0) {
      return { success: true, count: 0 }
    }

    const assignments = participants.map((p) => ({
      mission_id: missionId,
      user_id: p.id,
      assigned_by: adminId,
    }))

    const { error: insertError } = await supabase.from("mission_assignments").upsert(assignments, {
      onConflict: "mission_id,user_id",
      ignoreDuplicates: true,
    })

    if (insertError) throw insertError

    revalidatePath("/admin/missions", "max")
    revalidatePath("/missions", "max")
    return { success: true, count: participants.length }
  } catch (error) {
    logger.error("Error assigning mission to all", error, {
      action: "assignMissionToAllParticipants",
      metadata: { missionId },
    })
    throw new Error("Failed to assign mission to all participants")
  }
}

/**
 * Assigns a mission to multiple users
 */
export async function assignMissionToUsers(missionId: string, userIds: string[]): Promise<{ success: boolean; count: number }> {
  try {
    const { userId: adminId } = await verifyAdminAccess()
    const supabase = createAdminClient()

    if (!userIds || userIds.length === 0) {
      return { success: true, count: 0 }
    }

    const assignments = userIds.map((userId) => ({
      mission_id: missionId,
      user_id: userId,
      assigned_by: adminId,
    }))

    const { error } = await supabase.from("mission_assignments").upsert(assignments, {
      onConflict: "mission_id,user_id",
      ignoreDuplicates: true,
    })

    if (error) throw error

    revalidatePath("/admin/missions", "max")
    revalidatePath("/missions", "max")
    return { success: true, count: userIds.length }
  } catch (error) {
    logger.error("Error assigning mission to users", error, {
      action: "assignMissionToUsers",
      metadata: { missionId, userCount: userIds.length },
    })
    throw new Error("Failed to assign mission to users")
  }
}

/**
 * Removes a mission assignment
 */
export async function removeMissionAssignment(missionId: string, userId: string): Promise<{ success: boolean }> {
  try {
    await verifyAdminAccess()
    const supabase = createAdminClient()

    const { error } = await supabase
      .from("mission_assignments")
      .delete()
      .eq("mission_id", missionId)
      .eq("user_id", userId)

    if (error) throw error

    revalidatePath("/admin/missions", "max")
    revalidatePath("/missions", "max")
    return { success: true }
  } catch (error) {
    logger.error("Error removing assignment", error, {
      action: "removeMissionAssignment",
      metadata: { missionId, userId },
    })
    throw new Error("Failed to remove assignment")
  }
}

/**
 * Removes a mission assignment from multiple users
 */
export async function removeMissionFromUsers(missionId: string, userIds: string[]): Promise<{ success: boolean }> {
  try {
    await verifyAdminAccess()
    const supabase = createAdminClient()

    if (!userIds || userIds.length === 0) {
      return { success: true }
    }

    const { error } = await supabase
      .from("mission_assignments")
      .delete()
      .eq("mission_id", missionId)
      .in("user_id", userIds)

    if (error) throw error

    revalidatePath("/admin/missions", "max")
    revalidatePath("/missions", "max")
    return { success: true }
  } catch (error) {
    logger.error("Error removing assignments from users", error, {
      action: "removeMissionFromUsers",
      metadata: { missionId, userCount: userIds.length },
    })
    throw new Error("Failed to remove assignments")
  }
}

/**
 * Gets all assignments for a mission
 */
export async function getMissionAssignments(missionId: string): Promise<Array<MissionAssignment & { profile: { name: string; avatar_url: string | null } }>> {
  try {
    await verifyAdminAccess()
    const supabase = createAdminClient()

    const { data: assignments, error: assignmentsError } = await supabase
      .from("mission_assignments")
      .select("*")
      .eq("mission_id", missionId)

    if (assignmentsError) throw assignmentsError

    if (!assignments || assignments.length === 0) {
      return []
    }

    const userIds = assignments.map((a) => a.user_id)
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, name, avatar_url")
      .in("id", userIds)

    if (profilesError) throw profilesError

    const profilesMap = new Map(profiles?.map((p) => [p.id, p]) || [])

    return assignments.map((assignment) => ({
      ...assignment,
      profile: profilesMap.get(assignment.user_id) || { name: "Unknown User", avatar_url: null },
    }))
  } catch (error) {
    logger.error("Error fetching assignments", error, { action: "getMissionAssignments", metadata: { missionId } })
    throw new Error("Failed to fetch assignments")
  }
}

export async function fetchUserSubmissions(userId: string): Promise<UserSubmission[]> {
  try {
    await verifyAdminAccess()
    const supabase = createAdminClient()

    const { data: submissions, error } = await supabase
      .from("submissions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error) throw error

    if (!submissions || submissions.length === 0) {
      return []
    }

    const missionIds = Array.from(new Set(submissions.map((s) => s.mission_id)))
    const { data: missions, error: missionsError } = await supabase
      .from("missions")
      .select("id, title, points_value")
      .in("id", missionIds)

    if (missionsError) throw missionsError

    const missionsMap = new Map(missions?.map((m) => [m.id, m]) || [])

    return submissions.map((submission) => ({
      ...submission,
      mission: missionsMap.get(submission.mission_id) || null,
    })) as UserSubmission[]
  } catch (error) {
    logger.error("Error fetching user submissions", error, { action: "fetchUserSubmissions", metadata: { userId } })
    throw new Error("Failed to fetch user submissions")
  }
}

/**
 * Deletes a user account (soft delete by marking as deleted)
 */
export async function deleteUser(userId: string): Promise<{ success: boolean }> {
  try {
    await verifyAdminAccess()
    const supabase = createAdminClient()

    const { error: authError } = await supabase.auth.admin.deleteUser(userId)
    
    if (authError) {
       logger.warn("Failed to delete user from Auth, but proceeding with soft delete", { error: authError, userId })
    }

    const { error } = await supabase
      .from("profiles")
      .update({ is_deleted: true })
      .eq("id", userId)

    if (error) throw error

    revalidatePath("/admin/users", "max")
    return { success: true }
  } catch (error) {
    logger.error("Error deleting user", error, { action: "deleteUser", metadata: { userId } })
    throw new Error("Failed to delete user")
  }
}

/**
 * Invites a new user by email
 */
export async function inviteUser(email: string, name: string): Promise<{ success: boolean }> {
  try {
    await verifyAdminAccess()
    const supabase = createAdminClient()

    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: { name },
      redirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || process.env.NEXT_PUBLIC_SITE_URL,
    })

    if (error) throw error

    revalidatePath("/admin/users", "max")
    return { success: true }
  } catch (error) {
    logger.error("Error inviting user", error, { action: "inviteUser", metadata: { email, name } })
    throw new Error("Failed to invite user")
  }
}

/**
 * Fetches all programs
 */
export async function getPrograms(): Promise<Program[]> {
  try {
    await verifyAdminAccess()
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from("programs")
      .select("*")
      .order("created_at", { ascending: true })

    if (error) throw error

    return data || []
  } catch (error) {
    logger.error("Error fetching programs", error, { action: "getPrograms" })
    throw new Error("Failed to fetch programs")
  }
}

/**
 * Creates a new program
 */
export async function createProgram(title: string, description?: string): Promise<{ success: boolean; data?: Program }> {
  try {
    await verifyAdminAccess()
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from("programs")
      .insert({ title, description: description || null })
      .select()
      .single()

    if (error) throw error

    revalidatePath("/admin", "max")
    return { success: true, data }
  } catch (error) {
    logger.error("Error creating program", error, { action: "createProgram", metadata: { title } })
    throw new Error("Failed to create program")
  }
}

/**
 * Updates a program
 */
export async function updateProgram(id: string, title: string, description?: string): Promise<{ success: boolean }> {
  try {
    await verifyAdminAccess()
    const supabase = createAdminClient()

    const { error } = await supabase
      .from("programs")
      .update({ title, description: description || null, updated_at: new Date().toISOString() })
      .eq("id", id)

    if (error) throw error

    revalidatePath("/admin", "max")
    return { success: true }
  } catch (error) {
    logger.error("Error updating program", error, { action: "updateProgram", metadata: { id, title } })
    throw new Error("Failed to update program")
  }
}

/**
 * Deletes a program
 */
export async function deleteProgram(id: string): Promise<{ success: boolean }> {
  try {
    await verifyAdminAccess()
    const supabase = createAdminClient()

    const { error } = await supabase
      .from("programs")
      .delete()
      .eq("id", id)

    if (error) throw error

    revalidatePath("/admin", "max")
    return { success: true }
  } catch (error) {
    logger.error("Error deleting program", error, { action: "deleteProgram", metadata: { id } })
    throw new Error("Failed to delete program")
  }
}

/**
 * Fetches programs for a specific mission
 */
export async function getMissionPrograms(missionId: string): Promise<string[]> {
  try {
    await verifyAdminAccess()
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from("mission_programs")
      .select("program_id")
      .eq("mission_id", missionId)

    if (error) throw error

    return data?.map(p => p.program_id) || []
  } catch (error) {
    logger.error("Error fetching mission programs", error, { action: "getMissionPrograms", metadata: { missionId } })
    return []
  }
}

/**
 * Fetches all missions in a program
 */
export async function getProgramMissions(programId: string): Promise<any[]> {
  try {
    await verifyAdminAccess()
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from("mission_programs")
      .select(`
        mission_id,
        missions (
          id,
          title,
          description,
          points_value,
          type
        )
      `)
      .eq("program_id", programId)

    if (error) throw error

    return data?.map((item: any) => item.missions) || []
  } catch (error) {
    logger.error("Error fetching program missions", error, { action: "getProgramMissions", metadata: { programId } })
    return []
  }
}

/**
 * Adds multiple missions to a program
 */
export async function addMissionsToProgram(programId: string, missionIds: string[]): Promise<{ success: boolean }> {
  try {
    await verifyAdminAccess()
    const supabase = createAdminClient()

    if (!missionIds || missionIds.length === 0) {
      return { success: true }
    }

    const records = missionIds.map(missionId => ({
      program_id: programId,
      mission_id: missionId
    }))

    const { error } = await supabase
      .from("mission_programs")
      .upsert(records, { onConflict: 'mission_id,program_id', ignoreDuplicates: true })

    if (error) throw error

    revalidatePath("/admin/programs", "max")
    return { success: true }
  } catch (error) {
    logger.error("Error adding missions to program", error, { action: "addMissionsToProgram", metadata: { programId, count: missionIds.length } })
    throw new Error("Failed to add missions to program")
  }
}

/**
 * Removes a mission from a program
 */
export async function removeMissionFromProgram(programId: string, missionId: string): Promise<{ success: boolean }> {
  try {
    await verifyAdminAccess()
    const supabase = createAdminClient()

    const { error } = await supabase
      .from("mission_programs")
      .delete()
      .eq("program_id", programId)
      .eq("mission_id", missionId)

    if (error) throw error

    revalidatePath("/admin/programs", "max")
    return { success: true }
  } catch (error) {
    logger.error("Error removing mission from program", error, { action: "removeMissionFromProgram", metadata: { programId, missionId } })
    throw new Error("Failed to remove mission from program")
  }
}

/**
 * Assigns a program to users by email
 * This assigns all missions in the program to the users
 */
export async function assignProgramToUsers(programId: string, emails: string[]): Promise<{ success: boolean; count: number; notFound: string[] }> {
  try {
    const { userId: adminId } = await verifyAdminAccess()
    const supabase = createAdminClient()

    // 1. Get all users to resolve emails (since profiles don't have emails usually)
    // Note: In a large production app, we'd want a better way than fetching all users
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers({ perPage: 1000 })
    
    if (usersError) throw usersError

    const emailMap = new Map(users.map(u => [u.email?.toLowerCase(), u.id]))
    
    const userIds: string[] = []
    const notFound: string[] = []
    
    for (const email of emails) {
      const cleanEmail = email.toLowerCase().trim()
      if (!cleanEmail) continue
      
      const id = emailMap.get(cleanEmail)
      if (id) {
        userIds.push(id)
      } else {
        notFound.push(email)
      }
    }

    if (userIds.length === 0) {
      return { success: true, count: 0, notFound }
    }

    // 2. Get all missions in the program
    const { data: programMissions, error: missionsError } = await supabase
      .from("mission_programs")
      .select("mission_id")
      .eq("program_id", programId)

    if (missionsError) throw missionsError

    if (!programMissions || programMissions.length === 0) {
      return { success: true, count: 0, notFound } // No missions to assign
    }

    const missionIds = programMissions.map(pm => pm.mission_id)

    // 3. Create assignments for each user and each mission
    const assignments = []
    for (const userId of userIds) {
      for (const missionId of missionIds) {
        assignments.push({
          mission_id: missionId,
          user_id: userId,
          assigned_by: adminId
        })
      }
    }

    // Batch insert/upsert assignments
    // Supabase has a limit on request size, so we might need to chunk if very large
    const chunkSize = 1000
    for (let i = 0; i < assignments.length; i += chunkSize) {
      const chunk = assignments.slice(i, i + chunkSize)
      const { error: assignError } = await supabase
        .from("mission_assignments")
        .upsert(chunk, { onConflict: 'mission_id,user_id', ignoreDuplicates: true })
      
      if (assignError) throw assignError
    }

    revalidatePath("/admin/missions", "max")
    revalidatePath("/missions", "max")
    
    return { success: true, count: userIds.length, notFound }
  } catch (error) {
    logger.error("Error assigning program to users", error, { action: "assignProgramToUsers", metadata: { programId, emailCount: emails.length } })
    throw new Error("Failed to assign program to users")
  }
}

export async function getFullExportData(): Promise<FullExportData> {
  try {
    await verifyAdminAccess()
    const supabase = createAdminClient()

    const [
      profiles,
      missions,
      submissions,
      resources,
      programs,
      missionPrograms,
      missionAssignments,
      missionTypes
    ] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("missions").select("*").order("created_at", { ascending: false }),
      supabase.from("submissions").select("*").order("created_at", { ascending: false }),
      supabase.from("resources").select("*").order("created_at", { ascending: false }),
      supabase.from("programs").select("*").order("created_at", { ascending: false }),
      supabase.from("mission_programs").select("*"),
      supabase.from("mission_assignments").select("*"),
      supabase.from("mission_types").select("*").order("name", { ascending: true })
    ])

    // Check for errors
    if (profiles.error) throw profiles.error
    if (missions.error) throw missions.error
    if (submissions.error) throw submissions.error
    if (resources.error) throw resources.error
    if (programs.error) throw programs.error
    if (missionPrograms.error) throw missionPrograms.error
    if (missionAssignments.error) throw missionAssignments.error
    if (missionTypes.error) throw missionTypes.error

    return {
      profiles: profiles.data || [],
      missions: missions.data || [],
      submissions: submissions.data || [],
      resources: resources.data || [],
      programs: programs.data || [],
      mission_programs: missionPrograms.data || [],
      mission_assignments: missionAssignments.data || [],
      mission_types: missionTypes.data || []
    }
  } catch (error) {
    logger.error("Error fetching full export data", error, { action: "getFullExportData" })
    throw new Error("Failed to fetch export data")
  }
}

/**
 * Fetches all missions (for admin use)
 */
export async function getAllMissions(): Promise<any[]> {
  try {
    await verifyAdminAccess()
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from("missions")
      .select("id, title, type, points_value")
      .order("created_at", { ascending: false })

    if (error) throw error

    return data || []
  } catch (error) {
    logger.error("Error fetching all missions", error, { action: "getAllMissions" })
    throw new Error("Failed to fetch missions")
  }
}
