/**
 * Server Action Type Definitions
 * Type-safe interfaces for all server action responses
 */

import type {
  Profile,
  Mission,
  Submission,
  SubmissionWithRelations,
  DynamicFormAnswers,
  PaginationMetadata,
} from "./database"

// ============================================================================
// Action Response Base Types
// ============================================================================

export type ActionResponse<T = void> =
  | { success: true; data: T; error?: never; code?: never }
  | { success: false; error: string; code: ActionErrorCode; data?: never }

export enum ActionErrorCode {
  // Authentication & Authorization
  AUTH_ERROR = "AUTH_ERROR",
  PERMISSION_DENIED = "PERMISSION_DENIED",

  // Validation
  VALIDATION_ERROR = "VALIDATION_ERROR",
  INVALID_INPUT = "INVALID_INPUT",

  // Database
  DATABASE_ERROR = "DATABASE_ERROR",
  NOT_FOUND = "NOT_FOUND",
  DUPLICATE_ENTRY = "DUPLICATE_ENTRY",

  // Storage
  STORAGE_ERROR = "STORAGE_ERROR",
  FILE_TOO_LARGE = "FILE_TOO_LARGE",
  INVALID_FILE_TYPE = "INVALID_FILE_TYPE",

  // Rate Limiting
  RATE_LIMIT = "RATE_LIMIT",

  // Unknown
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

// ============================================================================
// Specific Action Response Types
// ============================================================================

export type SubmissionResponse = ActionResponse<{
  submissionId: string
  missionId: string
  pointsAwarded?: number
}>

export type ProfileUpdateResponse = ActionResponse<{
  profile: Profile
}>

export type AvatarUpdateResponse = ActionResponse<{
  avatarUrl: string
}>

export type MissionResponse = ActionResponse<{
  mission: Mission
}>

export type MissionListResponse = ActionResponse<{
  missions: Mission[]
}>

export type DraftResponse = ActionResponse<{
  draftId: string
  missionId: string
}>

export type DeleteResponse = ActionResponse<void>

export type ExportDataResponse = ActionResponse<{
  exportData: ExportData
}>

export type CommunityActivityResponse = ActionResponse<{
  activities: SubmissionWithRelations[]
  pagination: PaginationMetadata
}>

export type LeaderboardResponse = ActionResponse<{
  leaderboard: Array<{
    id: string
    name: string
    avatar_url: string | null
    points: number
    job_title: string | null
    department: string | null
    country: string | null
    bio: string | null
    rank: number
  }>
}>

export type SignUpResponse = ActionResponse<{
  userId: string
  email: string
}>

// ============================================================================
// Form Data Types
// ============================================================================

export interface SubmissionFormData {
  missionId: string
  textSubmission?: string
  mediaFile?: File
  answers?: DynamicFormAnswers
}

export interface DraftFormData {
  missionId: string
  textSubmission?: string
  mediaFile?: File
  answers?: DynamicFormAnswers
  removedMediaUrls?: string[]
}

export interface ProfileFormData {
  name?: string
  jobTitle?: string
  department?: string
  country?: string
  bio?: string
}

export interface MissionFormData {
  title: string
  description: string
  instructions?: string
  tips?: string
  missionType: string
  points: number
  imageFile?: File
  maxSubmissions: number
  submissionSchema?: string // JSON string
}

// ============================================================================
// Export Data Types
// ============================================================================

export interface ExportData {
  profile: Profile
  submissions: Submission[]
  likes: Array<{ submission_id: string; created_at: string }>
  feedback: Array<{ feedback_text: string; created_at: string }>
}

// ============================================================================
// Admin Action Types
// ============================================================================

export interface AdminMissionUpdate {
  title?: string
  description?: string
  instructions?: string
  tips?: string
  mission_type?: string
  points?: number
  image_url?: string
  max_submissions?: number
  submission_schema?: object
}

export interface AdminSubmissionUpdate {
  status: "approved" | "rejected"
  adminFeedback?: string
  pointsAwarded?: number
}

// ============================================================================
// Utility Types for Actions
// ============================================================================

export type AsyncActionResult<T> = Promise<ActionResponse<T>>

export type FormAction<T = void> = (formData: FormData) => AsyncActionResult<T>

export type TypedAction<TInput, TOutput = void> = (input: TInput) => AsyncActionResult<TOutput>
