/**
 * Database Type Definitions
 * Comprehensive TypeScript interfaces for all database tables and relationships
 */

// ============================================================================
// Core Database Tables
// ============================================================================

export interface Profile {
  id: string
  name: string
  email: string
  avatar_url: string | null
  job_title: string | null
  department: string | null
  country: string | null
  bio: string | null
  customer_obsession: string | null
  total_points: number
  is_admin: boolean
  is_deleted: boolean
  role: UserRole
  created_at: string
  updated_at: string
}

export interface Mission {
  id: string
  title: string
  description: string
  instructions: string | null
  tips_inspiration: string | null
  type: string
  mission_type_id: string | null
  points_value: number
  image_url: string | null
  resource_id: string | null
  quote_id: string | null
  duration: string | null
  coordinator: string | null
  support_status: string | null
  due_date: string | null
  mission_number: number | null
  display_order: number | null
  max_submissions_per_user: number | null
  submission_schema: SubmissionSchema | null
  created_at: string
  updated_at: string
}

export interface MissionTypeEntity {
  id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

export interface MissionAssignment {
  id: string
  mission_id: string
  user_id: string
  assigned_by: string | null
  created_at: string
}

export interface Submission {
  id: string
  user_id: string
  mission_id: string
  text_submission: string | null
  media_url: string | string[] | null // Supports TEXT (string), JSONB array, or null
  answers: Record<string, JsonValue> | null
  status: SubmissionStatus
  points_awarded: number
  admin_feedback: string | null
  created_at: string
  updated_at: string
}

export type SubmissionStatus = "draft" | "pending" | "approved" | "rejected"

export interface Resource {
  id: string
  title: string
  description: string
  url: string
  category: string
  created_at: string
}

export interface Like {
  id: string
  user_id: string
  submission_id: string
  created_at: string
}

export interface Feedback {
  id: string
  user_id: string
  feedback_text: string
  created_at: string
}

export interface NoticeboardItem {
  id: string
  title: string
  content: string
  created_at: string
  updated_at: string
}

export interface ProfileActivity {
  id: string
  user_id: string
  activity_type: string
  changed_fields: string[] | null
  created_at: string
}

export type ActivityType = "submission_created" | "submission_approved" | "profile_updated" | "level_up"

// ============================================================================
// Dynamic Form Schema Types
// ============================================================================

export type SubmissionSchema = FormField[]

export type FormField = {
  name: string
  label: string
  type: "text" | "textarea" | "select" | "radio" | "checkbox" | "date" | "number" | "rating" | "file"
  required?: boolean
  placeholder?: string
  helperText?: string
  options?: Array<{ label: string; value: string }>
  min?: number
  max?: number
  accept?: string
  multiple?: boolean
}

// JSON value type for dynamic data
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

// ============================================================================
// Extended Types with Relations
// ============================================================================

export interface SubmissionWithRelations extends Submission {
  profiles: Profile
  missions: Mission
  likes?: Like[]
  like_count?: number
}

export interface MissionWithSubmissions extends Mission {
  submissions?: Submission[]
  user_submissions?: Submission[]
}

export interface ProfileWithStats extends Profile {
  submission_count?: number
  approved_count?: number
  total_likes?: number
  rank?: number
}

// ============================================================================
// API Response Types
// ============================================================================

export interface LeaderboardEntry {
  id: string
  name: string
  avatar_url: string | null
  total_points: number
  job_title: string | null
  department: string | null
  country: string | null
  bio: string | null
  rank: number
}

export interface CommunityActivity {
  type: "submission" | "profile_update"
  data: SubmissionWithRelations | ProfileActivity
  created_at: string
}

export interface PaginationMetadata {
  page: number
  limit: number
  total: number
  hasMore: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: PaginationMetadata
}

// ============================================================================
// Form Data Types
// ============================================================================

export interface LegacySubmissionForm {
  id: number
  textSubmission: string
  mediaFile: File | null
  mediaPreview: string | null
}

export interface DraftSubmission {
  id: string
  mission_id: string
  text_submission: string | null
  media_url: string | null
  answers: Record<string, JsonValue> | null
  created_at: string
}

// ============================================================================
// Utility Types
// ============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

export type Nullable<T> = T | null

export type Optional<T> = T | undefined

export type UserRole = "admin" | "participant" | "view_only"

export type MissionCategory = "Action" | "Core" | "Lite" | "Elevate"
