import type React from "react"
/**
 * Component Prop Type Definitions
 * Reusable prop interfaces for React components
 */

import type {
  Mission,
  Profile,
  Submission,
  SubmissionWithRelations,
  DynamicFormAnswers,
  SubmissionSchema,
  FormField,
  LegacySubmissionForm,
  DraftSubmission,
} from "./database"

// ============================================================================
// Page Component Props
// ============================================================================

export interface HomePageProps {
  user: Profile | null
  missions: Mission[]
  recentActivity: SubmissionWithRelations[]
  topUsers: Profile[]
}

export interface MissionPageProps {
  mission: Mission
  user: Profile
  profile: Profile
  userSubmissions: Submission[]
  draftSubmissions: DraftSubmission[]
  linkedResource: {
    title: string
    description: string
    url: string
  } | null
  inspirationalQuote: {
    text: string
    author: string
  } | null
}

export interface ActivityPageProps {
  initialActivities: SubmissionWithRelations[]
  initialPage: number
  initialHasMore: boolean
}

export interface LeaderboardPageProps {
  leaderboard: Profile[]
}

export interface AccountPageProps {
  user: Profile
  profile: Profile
  submissionHistory: Submission[]
  submissionHistoryWithTitles: Array<Submission & { mission_title: string }>
}

// ============================================================================
// Component Props
// ============================================================================

export interface MissionCardProps {
  mission: Mission
  userSubmissions?: Submission[]
  showStatus?: boolean
}

export interface DynamicFormRendererProps {
  schema: SubmissionSchema
  onSubmit: (answers: DynamicFormAnswers, mediaFiles: File[], removedMediaUrls?: string[]) => void | Promise<void>
  onSaveProgress?: (
    answers: DynamicFormAnswers,
    mediaFiles: File[],
    removedMediaUrls?: string[],
  ) => void | Promise<void>
  isSubmitting?: boolean
  isSavingProgress?: boolean
  initialAnswers?: DynamicFormAnswers
  initialMediaUrls?: string[]
  submitButtonText?: string
  saveProgressButtonText?: string
}

export interface LegacySubmissionFormProps {
  missionId: string
  maxSubmissions: number
  onSubmit: (submissions: LegacySubmissionForm[]) => void | Promise<void>
  isSubmitting: boolean
}

export interface SubmissionCardProps {
  submission: SubmissionWithRelations
  showActions?: boolean
  onLike?: (submissionId: string) => void | Promise<void>
  onUnlike?: (submissionId: string) => void | Promise<void>
}

export interface QuoteCarouselProps {
  quotes: Array<{
    id: string
    text: string
    author: string
    image_url: string | null
  }>
  autoPlayInterval?: number
}

export interface SkeletonLoaderProps {
  count?: number
  className?: string
}

// ============================================================================
// Form Field Component Props
// ============================================================================

export interface FormFieldProps {
  field: FormField
  value: unknown
  onChange: (value: unknown) => void
  error?: string
}

export interface FileUploadProps {
  accept?: string
  maxSize?: number
  multiple?: boolean
  value: File[]
  onChange: (files: File[]) => void
  onRemove?: (index: number) => void
  error?: string
}

export interface RatingInputProps {
  max: number
  value: number
  onChange: (value: number) => void
  icon?: "star" | "heart" | "thumb"
  size?: "sm" | "md" | "lg"
}

// ============================================================================
// Modal & Dialog Props
// ============================================================================

export interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void | Promise<void>
  variant?: "default" | "destructive"
}

export interface SuccessModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  message: string
  pointsEarned?: number
  onContinue?: () => void
}

// ============================================================================
// Admin Component Props
// ============================================================================

export interface AdminMissionFormProps {
  mission?: Mission
  onSubmit: (data: FormData) => void | Promise<void>
  onCancel: () => void
  isSubmitting: boolean
}

export interface AdminSubmissionReviewProps {
  submission: SubmissionWithRelations
  onApprove: (feedback?: string, points?: number) => void | Promise<void>
  onReject: (feedback?: string) => void | Promise<void>
  isProcessing: boolean
}

// ============================================================================
// Utility Component Props
// ============================================================================

export interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

export interface LoadingStateProps {
  message?: string
  fullScreen?: boolean
}

export interface EmptyStateProps {
  title: string
  description?: string
  icon?: React.ReactNode
  action?: {
    label: string
    onClick: () => void
  }
}
