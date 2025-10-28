import type { Mission, Profile, Submission, Resource, NoticeboardItem, JsonValue } from "@/types/database"

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

export type PaginationMetadata = {
  page: number
  limit: number
  total: number
  hasMore: boolean
}

export type ActionResponse<T = void> =
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

export type SubmissionResponse = ActionResponse<void>
export type ProfileUpdateResponse = ActionResponse<void>
export type SignOutResponse = ActionResponse<{ redirectTo: string }>
export type MissionResponse = ActionResponse<{ id: string }>
export type AvatarUpdateResponse = ActionResponse<{ avatar_url: string }>
export type ExportDataResponse = ActionResponse<{
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

export type CommunityActivityResponse = ActionResponse<
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
export type DraftResponse = ActionResponse<void>
export type UpdateSubmissionResponse = ActionResponse<{ wasApproved: boolean }>
export type SubmitDraftResponse = ActionResponse<{ missionId: string }>
