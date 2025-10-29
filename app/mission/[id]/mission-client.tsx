"use client"

import type React from "react"
import { useMemo, useState, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import {
  Upload,
  FileText,
  ExternalLink,
  ArrowLeft,
  CheckCircle,
  Plus,
  Trash2,
  Save,
  Loader2,
  AlertCircle,
} from "lucide-react"
import {
  submitMission,
  saveDraft,
  deleteDraft as deleteDraftAction,
  updateSubmission,
  submitDraftAsFinal,
  createNewSubmission,
} from "@/lib/actions"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { DynamicFormRenderer } from "@/components/dynamic-form-renderer"
import type { JsonValue } from "type-fest" // Import JsonValue

interface SubmissionSchema {
  fields?: Array<{
    name?: string
    label?: string
    type?: string
  }>
  [key: string]: JsonValue
}

// Assume these types are imported from your types/database.ts
// interface Mission { ... }
// interface Submission { ... }
// interface Resource { ... }
// interface Quote { ... }
// interface User { ... }
// interface Profile { ... }

// Placeholder types for demonstration, replace with actual imports
interface Mission {
  id: string
  title: string
  description: string
  instructions?: string
  tips_inspiration?: string
  image_url?: string
  type?: string
  points_value: number
  max_submissions_per_user?: number
  submission_schema?: SubmissionSchema
  mission_number?: number
}

interface Submission {
  id: string
  text_submission: string
  media_url?: string
  status: string
  created_at: string
  answers?: Record<string, JsonValue> | null
}

interface Resource {
  url: string
  description: string
}

interface Quote {
  text: string
  author: string
}

interface User {
  id: string
  name: string
}

interface Profile {
  id: string
  bio: string
}

interface MissionClientProps {
  mission: Mission
  existingSubmissions: Submission[]
  linkedResource: Resource | null
  inspirationalQuote: Quote | null
  user: User
  profile: Profile
}

export function MissionClient({
  mission,
  existingSubmissions: initialSubmissions,
  linkedResource,
  inspirationalQuote,
  user,
  profile, // Destructure profile prop
}: MissionClientProps) {
  const existingSubmissions = useMemo(
    () => initialSubmissions.filter((s) => s.status !== "draft"),
    [initialSubmissions],
  )

  const draftSubmissions = useMemo(() => initialSubmissions.filter((s) => s.status === "draft"), [initialSubmissions])

  const missionSchema = useMemo(() => mission.submission_schema, [mission.submission_schema])

  const [submissionForms, setSubmissionForms] = useState([
    { id: 1, textSubmission: "", mediaFile: null as File | null },
  ])
  const [editingSubmission, setEditingSubmission] = useState<string | null>(null)
  const [editFormData, setEditFormData] = useState<{ textSubmission: string; mediaFile: File | null }>({
    textSubmission: "",
    mediaFile: null,
  })
  const [editDynamicAnswers, setEditDynamicAnswers] = useState<Record<string, JsonValue> | null>(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [useDynamicForm] = useState(!!mission.submission_schema)
  const [isSavingProgress, startSaveTransition] = useTransition()
  const [isSubmitting, startSubmitTransition] = useTransition()
  const [isEditingSubmission, startEditTransition] = useTransition()
  const [isDeletingDraft, startDeleteTransition] = useTransition()
  const { toast } = useToast()
  const router = useRouter()

  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number>(0)

  const handleSaveProgress = async (
    answers?: Record<string, JsonValue>,
    mediaFiles?: File[],
    removedMediaUrls?: string[],
  ) => {
    if (isSavingProgress) {
      toast({
        title: "⏳ Save in Progress",
        description: "Please wait while we save your current changes.",
        variant: "default",
      })
      return
    }

    toast({
      title: "💾 Saving...",
      description: "Your progress is being saved.",
    })

    startSaveTransition(async () => {
      try {
        const formData = new FormData()
        formData.append("missionId", mission.id)

        if (draftSubmissions.length > 0) {
          formData.append("existingDraftId", draftSubmissions[0].id)
        }

        if (useDynamicForm && answers) {
          formData.append("answers", JSON.stringify(answers))
          if (mediaFiles && mediaFiles.length > 0) {
            formData.append("mediaFile", mediaFiles[0])
          }
        } else {
          const form = submissionForms[0]
          if (!form.textSubmission.trim()) {
            toast({
              title: "Nothing to Save",
              description: "Please write something before saving your progress.",
              variant: "destructive",
            })
            return
          }
          formData.append("textSubmission", form.textSubmission)
          if (form.mediaFile) {
            formData.append("mediaFile", form.mediaFile)
          }
        }

        await saveDraft(formData)

        toast({
          title: "✓ Progress Saved",
          description: "Your work has been saved as a draft. You can continue later!",
        })

        // Refresh the page to get updated data
        router.refresh()
      } catch (error) {
        toast({
          title: "❌ Save Failed",
          description: "Unable to save your progress. Please check your connection and try again.",
          variant: "destructive",
        })
      }
    })
  }

  const handleDynamicSubmit = async (answers: Record<string, JsonValue>, mediaFiles: File[]) => {
    if (isSubmitting) {
      toast({
        title: "⏳ Submission in Progress",
        description: "Please wait while we process your submission.",
        variant: "default",
      })
      return
    }

    startSubmitTransition(async () => {
      try {
        toast({
          title: "📤 Submitting...",
          description: "Your mission is being submitted.",
        })

        const formData = new FormData()
        formData.append("missionId", mission.id)
        formData.append("answers", JSON.stringify(answers))

        if (mediaFiles.length > 0) {
          formData.append("mediaFile", mediaFiles[0])
        }

        if (draftSubmissions.length > 0) {
          formData.append("draftId", draftSubmissions[0].id)
          await submitDraftAsFinal(formData)
        } else {
          await createNewSubmission(formData)
        }

        setShowSuccessModal(true)
      } catch (error) {
        toast({
          title: "❌ Submission Failed",
          description: "Unable to submit your mission. Please check your connection and try again.",
          variant: "destructive",
        })
      }
    })
  }

  const formatFieldLabel = (key: string): string => {
    // Map of common field keys to user-friendly labels
    const labelMap: Record<string, string> = {
      brainstorming: "Brainstorming",
      impact: "Impact",
      reflection: "Reflection",
      action_steps: "Action Steps",
      goals: "Goals",
      challenges: "Challenges",
      learnings: "Learnings",
      insights: "Insights",
      observations: "Observations",
      outcomes: "Outcomes",
      next_steps: "Next Steps",
      key_takeaways: "Key Takeaways",
      summary: "Summary",
      notes: "Notes",
      thoughts: "Thoughts",
      ideas: "Ideas",
      plans: "Plans",
      strategies: "Strategies",
      solutions: "Solutions",
      improvements: "Improvements",
    }

    // Check if we have a custom label for this key
    const lowerKey = key.toLowerCase()
    if (labelMap[lowerKey]) {
      return labelMap[lowerKey]
    }

    // Fallback: capitalize and replace underscores with spaces
    return key
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  }

  const renderSubmissionContent = (submission: Submission) => {
    // If submission has structured answers, render them nicely
    if (submission.answers && typeof submission.answers === "object") {
      return (
        <div className="space-y-3">
          {Object.entries(submission.answers).map(([key, value]) => {
            if (Array.isArray(value)) {
              return (
                <div key={key} className="space-y-2">
                  <h5 className="font-medium text-foreground">{formatFieldLabel(key)}</h5>
                  {value.map((item, index) => (
                    <div key={index} className="bg-white/5 rounded-lg p-3 ml-4">
                      <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>
                      {typeof item === "object" && item !== null ? ( // Added null check
                        <div className="mt-1 space-y-1">
                          {Object.entries(item as Record<string, JsonValue>).map(([subKey, subValue]) => (
                            <div key={subKey}>
                              <span className="text-xs text-muted-foreground">{formatFieldLabel(subKey)}:</span>
                              <p className="text-sm text-foreground">{String(subValue)}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-foreground mt-1">{String(item)}</p>
                      )}
                    </div>
                  ))}
                </div>
              )
            } else {
              return (
                <div key={key} className="space-y-1">
                  <h5 className="font-medium text-foreground">{formatFieldLabel(key)}</h5>
                  <p className="text-sm text-muted-foreground">{String(value)}</p>
                </div>
              )
            }
          })}
        </div>
      )
    }

    // Fallback to legacy text submission
    return <p className="text-sm text-muted-foreground">{submission.text_submission}</p>
  }

  const addSubmissionForm = () => {
    const newId = Math.max(0, ...submissionForms.map((f) => f.id)) + 1
    setSubmissionForms([...submissionForms, { id: newId, textSubmission: "", mediaFile: null }])

    toast({
      title: "Form Added",
      description: "A new submission form has been added.",
    })
  }

  const removeSubmissionForm = (id: number) => {
    if (submissionForms.length > 1) {
      setSubmissionForms(submissionForms.filter((form) => form.id !== id))

      toast({
        title: "Form Removed",
        description: "The submission form has been removed.",
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (isSubmitting) {
      return
    }

    startSubmitTransition(async () => {
      try {
        const maxSubmissions = mission?.max_submissions_per_user || 1
        const currentSubmissions = existingSubmissions.length
        const newSubmissions = submissionForms.filter((form) => form.textSubmission.trim()).length

        if (currentSubmissions + newSubmissions > maxSubmissions) {
          toast({
            title: "Submission Limit Exceeded",
            description: `This mission allows a maximum of ${maxSubmissions} submission(s). You have ${currentSubmissions} existing submission(s).`,
            variant: "destructive",
          })
          return
        }

        if (draftSubmissions.length > 0) {
          const form = submissionForms[0]
          const formData = new FormData()
          formData.append("draftId", draftSubmissions[0].id)
          formData.append("textSubmission", form.textSubmission)

          if (form.mediaFile) {
            formData.append("mediaFile", form.mediaFile)
          }

          await submitDraftAsFinal(formData)
        } else {
          // Original submission logic
          for (const form of submissionForms) {
            if (form.textSubmission.trim()) {
              const formData = new FormData()
              formData.append("missionId", mission.id)
              formData.append("textSubmission", form.textSubmission)
              if (form.mediaFile) {
                formData.append("mediaFile", form.mediaFile)
              }

              await submitMission(formData)
            }
          }
        }

        setShowSuccessModal(true)
      } catch (error) {
        toast({
          title: "Submission Failed",
          description: "There was an error submitting your mission. Please try again.",
          variant: "destructive",
        })
      }
    })
  }

  const handleBackToHome = () => {
    setShowSuccessModal(false)
    router.refresh()
    router.push("/")
  }

  const updateSubmissionForm = (id: number, field: string, value: string | File | null) => {
    setSubmissionForms((forms) => forms.map((form) => (form.id === id ? { ...form, [field]: value } : form)))
  }

  const startEditing = (submission: Submission) => {
    setEditingSubmission(submission.id)
    if (submission.answers && typeof submission.answers === "object" && mission?.submission_schema) {
      setEditDynamicAnswers(submission.answers)
      setEditFormData({ textSubmission: "", mediaFile: null })
    } else {
      setEditFormData({
        textSubmission: submission.text_submission || "",
        mediaFile: null,
      })
      setEditDynamicAnswers(null)
    }

    toast({
      title: "Edit Mode",
      description: "You can now edit your submission. Click 'Save Changes' when done.",
    })
  }

  const cancelEditing = () => {
    setEditingSubmission(null)
    setEditFormData({ textSubmission: "", mediaFile: null })
    setEditDynamicAnswers(null)

    toast({
      title: "Edit Cancelled",
      description: "Your changes have been discarded.",
    })
  }

  const loadDraft = (draft: Submission) => {
    if (draft.answers && typeof draft.answers === "object" && mission?.submission_schema) {
      setEditDynamicAnswers(draft.answers)
    } else {
      setSubmissionForms([
        {
          id: 1,
          textSubmission: draft.text_submission || "",
          mediaFile: null,
        },
      ])
    }

    toast({
      title: "✓ Draft Loaded",
      description: "Your saved draft has been loaded. Continue where you left off!",
    })
  }

  const confirmDeleteDraft = (draftId: string) => {
    setShowDeleteConfirm(draftId)
  }

  const handleDeleteDraft = async (draftId: string) => {
    setShowDeleteConfirm(null)

    startDeleteTransition(async () => {
      try {
        toast({
          title: "🗑️ Deleting...",
          description: "Your draft is being deleted.",
        })

        await deleteDraftAction(draftId)

        toast({
          title: "✓ Draft Deleted",
          description: "Your draft has been permanently deleted.",
        })

        // Refresh the page to get updated data
        router.refresh()
      } catch (error) {
        toast({
          title: "❌ Delete Failed",
          description: "Unable to delete your draft. Please try again.",
          variant: "destructive",
        })
      }
    })
  }

  const saveEditedSubmission = async (submissionId: string) => {
    startEditTransition(async () => {
      try {
        toast({
          title: "💾 Saving Changes...",
          description: "Your submission is being updated.",
        })

        const formData = new FormData()
        formData.append("submissionId", submissionId)
        formData.append("textSubmission", editFormData.textSubmission)

        if (editFormData.mediaFile) {
          formData.append("mediaFile", editFormData.mediaFile)
        }

        const result = await updateSubmission(formData)

        setEditingSubmission(null)
        setEditFormData({ textSubmission: "", mediaFile: null })

        // Check for success flag and then for wasApproved within data
        if (result.success && result.data?.wasApproved) {
          toast({
            title: "✓ Submission Updated",
            description: "Your submission has been updated and is now pending review again.",
          })
        } else {
          toast({
            title: "✓ Submission Updated",
            description: "Your changes have been saved successfully.",
          })
        }

        // Refresh the page to get updated data
        router.refresh()
      } catch (error) {
        toast({
          title: "❌ Update Failed",
          description: "Unable to save your changes. Please check your connection and try again.",
          variant: "destructive",
        })
      }
    })
  }

  const handleDynamicEdit = async (
    answers: Record<string, JsonValue>,
    mediaFiles: File[],
    removedMediaUrls?: string[],
  ) => {
    if (isEditingSubmission) {
      toast({
        title: "⏳ Update in Progress",
        description: "Please wait while we save your changes.",
        variant: "default",
      })
      return
    }

    startEditTransition(async () => {
      try {
        toast({
          title: "💾 Saving Changes...",
          description: "Your submission is being updated.",
        })

        const formData = new FormData()
        formData.append("submissionId", editingSubmission!)
        formData.append("answers", JSON.stringify(answers))

        if (removedMediaUrls && removedMediaUrls.length > 0) {
          formData.append("removedMediaUrls", JSON.stringify(removedMediaUrls))
        }

        if (mediaFiles.length > 0) {
          formData.append("mediaFile", mediaFiles[0])
        }

        const result = await updateSubmission(formData)

        setEditingSubmission(null)
        setEditDynamicAnswers(null)

        if (result.success && result.data?.wasApproved) {
          toast({
            title: "✓ Submission Updated",
            description: "Your submission has been updated and is now pending review again.",
          })
        } else {
          toast({
            title: "✓ Submission Updated",
            description: "Your changes have been saved successfully.",
          })
        }

        // Refresh the page to get updated data
        router.refresh()
      } catch (error) {
        toast({
          title: "❌ Update Failed",
          description: "Unable to save your changes. Please check your connection and try again.",
          variant: "destructive",
        })
      }
    })
  }

  const maxSubmissions = mission.max_submissions_per_user || 1
  const remainingSubmissions = maxSubmissions - existingSubmissions.length
  const canSubmitMore = remainingSubmissions > 0

  const getTypeConfig = (type: string) => {
    const normalizedType = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()

    switch (normalizedType) {
      case "Action":
        return {
          color: "bg-[#B91C1C] text-[#FED6DE] border-[#B91C1C]",
        }
      case "Core":
        return {
          color: "bg-[#0072CE] text-[#D9ECF8] border-[#0072CE]",
        }
      case "Lite":
        return {
          color: "bg-[#047857] text-[#CCF3E0] border-[#047857]",
        }
      case "Elevate":
        return {
          color: "bg-[#b45309] text-[#FEEFCE] border-[#b45309]",
        }
      default:
        return {
          color: "bg-[#404040] text-[#F2F2F2] border-[#404040]",
        }
    }
  }

  const getMissionNumber = () => {
    if (mission.mission_number && mission.mission_number > 0) {
      return String(mission.mission_number).padStart(2, "0")
    }
    // Fallback: use a hash of the mission ID to generate a consistent number
    const hash = mission.id.split("").reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0)
      return a & a
    }, 0)
    return String((Math.abs(hash) % 99) + 1).padStart(2, "0")
  }

  const getBadgeStyle = () => {
    const typeConfig = getTypeConfig(mission.type || "")
    return typeConfig.color
  }

  const initialDynamicAnswers = useMemo(() => {
    if (draftSubmissions.length > 0 && draftSubmissions[0].answers) {
      return draftSubmissions[0].answers
    }
    return editDynamicAnswers
  }, [draftSubmissions, editDynamicAnswers])

  const initialMediaUrls = useMemo(() => {
    if (draftSubmissions.length > 0 && draftSubmissions[0].media_url) {
      return [draftSubmissions[0].media_url]
    }
    return []
  }, [draftSubmissions])

  return (
    <>
      <Dialog open={showDeleteConfirm !== null} onOpenChange={() => setShowDeleteConfirm(null)}>
        <DialogContent className="bg-white/95 dark:bg-black/95 backdrop-blur-xl border border-white/20 dark:border-white/10 max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <AlertCircle className="h-6 w-6 text-red-500" />
              <DialogTitle className="text-xl font-bold text-foreground">Delete Draft?</DialogTitle>
            </div>
            <DialogDescription className="text-base text-muted-foreground">
              Are you sure you want to delete this draft? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-4">
            <Button
              onClick={() => setShowDeleteConfirm(null)}
              variant="outline"
              className="flex-1 bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={() => showDeleteConfirm && handleDeleteDraft(showDeleteConfirm)}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white"
            >
              Delete Draft
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="bg-white/95 dark:bg-black/95 backdrop-blur-xl border border-white/20 dark:border-white/10 max-w-md">
          <DialogHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <DialogTitle className="text-2xl font-bold text-foreground">Activity Submitted!</DialogTitle>
            <DialogDescription className="text-lg text-muted-foreground mt-2">
              Your '{mission?.title}' activity was submitted successfully. You earned {mission?.points_value} EP!
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center mt-6">
            <Button
              onClick={handleBackToHome}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 py-3 text-lg hover:scale-105 transition-all duration-300"
              size="lg"
            >
              Back to Home
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="mb-3 sm:mb-6">
        <Link href="/" className="touch-manipulation">
          {/* Increased touch target to 44px on mobile */}
          <Button
            variant="ghost"
            size="sm"
            className="h-11 sm:h-10 w-auto px-3 sm:px-4 bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 hover:scale-105 transition-all duration-300 active:scale-95 text-foreground touch-manipulation"
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2 flex-shrink-0" />
            <span className="text-sm sm:text-base">Back to Activities</span>
          </Button>
        </Link>
      </div>

      <div className="max-w-4xl mx-auto pb-4 sm:pb-8">
        <div className="mb-4 sm:mb-8">
          <div className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 rounded-xl p-4 sm:p-8 mb-4 sm:mb-6">
            {mission.image_url && (
              <div className="mb-6 sm:mb-8">
                <div className="relative w-full aspect-square max-w-md mx-auto rounded-xl overflow-hidden bg-white/5 dark:bg-black/10 backdrop-blur-lg border border-white/20 dark:border-white/10">
                  <Image
                    src={mission.image_url || "/placeholder.svg"}
                    alt={mission.title}
                    width={448}
                    height={448}
                    className="w-full h-full object-cover"
                    sizes="(max-width: 768px) 100vw, 448px"
                    quality={85}
                    priority
                    placeholder="blur"
                    blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDQ4IiBoZWlnaHQ9IjQ0OCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDQ4IiBoZWlnaHQ9IjQ0OCIgZmlsbD0iI2YzZjRmNiIvPjwvc3ZnPg=="
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = "/everyone-logo.svg"
                      target.style.objectFit = "contain"
                      target.style.padding = "3rem"
                    }}
                  />
                </div>
              </div>
            )}

            <h1 className="text-xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-foreground mb-3 sm:mb-4 text-balance leading-tight">
              {mission.title}
            </h1>
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              {mission.type && (
                <Badge
                  className={`${getBadgeStyle()} font-medium px-3 py-1 text-sm rounded-full transition-all duration-300 hover:scale-105`}
                >
                  {mission.type} #{getMissionNumber()}
                </Badge>
              )}
              <span className="text-teal-600 font-bold text-lg">+{mission.points_value} EP</span>
            </div>
            <div className="text-sm sm:text-base lg:text-lg text-muted-foreground leading-relaxed text-pretty mb-4 sm:mb-6 whitespace-pre-wrap">
              {mission.description}
            </div>

            {mission.instructions && (
              <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 backdrop-blur-lg rounded-lg p-4 sm:p-6 border border-white/20 dark:border-white/10 mb-4 sm:mb-6">
                <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-foreground mb-2 sm:mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 flex-shrink-0" />
                  <span>Instructions</span>
                </h3>
                <div className="text-sm sm:text-base text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {mission.instructions}
                </div>
              </div>
            )}

            {mission.tips_inspiration && (
              <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 backdrop-blur-lg rounded-lg p-4 sm:p-6 border border-white/20 dark:border-white/10 mb-4 sm:mb-6">
                <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2 sm:mb-3 flex items-center gap-2">
                  <span className="text-amber-500">💡</span>
                  Tips & Inspiration
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground whitespace-pre-wrap">
                  {mission.tips_inspiration}
                </p>
              </div>
            )}

            {linkedResource && linkedResource.url && (
              <div className="bg-gradient-to-r from-primary/20 to-secondary/20 backdrop-blur-lg rounded-lg p-4 sm:p-6 border border-white/20 dark:border-white/10">
                <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2 sm:mb-3 flex items-center gap-2">
                  <ExternalLink className="h-5 w-5 text-primary" />
                  Related Resource
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground mb-3 sm:mb-4 whitespace-pre-wrap">
                  {linkedResource.description}
                </p>
                <Button
                  asChild
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold hover:scale-105 transition-all duration-300"
                >
                  <a
                    href={linkedResource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    View Related Resource
                  </a>
                </Button>
              </div>
            )}
          </div>
        </div>

        <Card className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 hover:scale-[1.01] transition-all duration-300">
          <CardHeader className="pb-3 sm:pb-6 p-4 sm:p-6">
            <CardTitle className="text-lg sm:text-xl lg:text-2xl text-foreground flex items-center gap-2 flex-wrap">
              <FileText className="h-5 w-5 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-primary flex-shrink-0" />
              <span className="flex-1 min-w-0">Submit Your activity</span>
              <span className="text-xs sm:text-sm font-normal text-muted-foreground whitespace-nowrap">
                {existingSubmissions.length}/{maxSubmissions} submissions
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6 pb-4 sm:pb-6">
            {draftSubmissions.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Save className="h-5 w-5 text-amber-500" />
                  Saved Draft
                </h3>
                {draftSubmissions.map((draft, index) => (
                  <div
                    key={draft.id}
                    className="bg-amber-500/10 dark:bg-amber-500/5 backdrop-blur-lg border border-amber-500/30 rounded-lg p-4"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-medium text-foreground flex items-center gap-2">
                        <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30">Draft</Badge>
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => loadDraft(draft)}
                          className="text-primary hover:text-primary/80 h-8 px-3 hover:bg-primary/10 transition-colors"
                        >
                          Continue
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => confirmDeleteDraft(draft.id)}
                          disabled={isDeletingDraft}
                          className="text-red-400 hover:text-red-300 h-8 px-3 hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {isDeletingDraft ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {renderSubmissionContent(draft)}
                    {draft.media_url && (
                      <div className="mb-2 mt-2">
                        <Image
                          src={draft.media_url || "/placeholder.svg"}
                          alt="Draft media"
                          width={200}
                          height={150}
                          className="rounded-lg object-cover"
                          sizes="200px"
                          quality={70}
                          loading="lazy"
                        />
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      Last saved: {new Date(draft.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {existingSubmissions.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-foreground">Your Previous Submissions</h3>
                {existingSubmissions.map((submission, index) => (
                  <div
                    key={submission.id}
                    className="bg-white/5 dark:bg-black/10 backdrop-blur-lg border border-white/20 dark:border-white/10 rounded-lg p-4"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-medium text-foreground">Submission #{index + 1}</span>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            submission.status === "approved"
                              ? "bg-green-500/20 text-green-400"
                              : submission.status === "rejected"
                                ? "bg-red-500/20 text-red-400"
                                : "bg-yellow-500/20 text-yellow-400"
                          }`}
                        >
                          {submission.status}
                        </span>
                        {editingSubmission !== submission.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEditing(submission)}
                            className="text-primary hover:text-primary/80 h-6 px-2"
                          >
                            Edit
                          </Button>
                        )}
                      </div>
                    </div>

                    {editingSubmission === submission.id ? (
                      <div className="space-y-4">
                        {editDynamicAnswers && mission?.submission_schema ? (
                          <div className="space-y-4">
                            <Label className="text-foreground font-medium">Edit Your Submission</Label>
                            <DynamicFormRenderer
                              schema={missionSchema}
                              initialAnswers={editDynamicAnswers}
                              initialMediaUrls={submission.media_url ? [submission.media_url] : []}
                              onSubmit={handleDynamicEdit}
                              submitButtonText="Save Changes"
                              isSubmitting={isEditingSubmission}
                              onSubmittingChange={() => {}} // No-op as startEditTransition handles the state
                              showSuccessDialogOnSubmit={true}
                              className="bg-white/5 dark:bg-black/10 backdrop-blur-lg border border-white/20 dark:border-white/10 rounded-lg p-4"
                            />
                            <Button
                              onClick={cancelEditing}
                              variant="outline"
                              size="sm"
                              className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10"
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <>
                            <div className="space-y-2">
                              <Label className="text-foreground font-medium">Edit Your Journal Entry</Label>
                              <Textarea
                                value={editFormData.textSubmission}
                                onChange={(e) =>
                                  setEditFormData((prev) => ({ ...prev, textSubmission: e.target.value }))
                                }
                                className="min-h-32 bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground placeholder:text-muted-foreground resize-none text-sm"
                                placeholder="Share your experience, thoughts, and reflections..."
                              />
                            </div>

                            <div className="space-y-2">
                              <Label className="text-foreground font-medium flex items-center gap-2">
                                <Upload className="h-4 w-4 text-primary" />
                                Update Media (Optional)
                              </Label>
                              <div className="bg-white/5 dark:bg-black/10 backdrop-blur-lg border border-white/20 dark:border-white/10 rounded-lg p-3">
                                <Input
                                  type="file"
                                  accept="image/*,video/*"
                                  onChange={(e) =>
                                    setEditFormData((prev) => ({ ...prev, mediaFile: e.target.files?.[0] || null }))
                                  }
                                  className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground file:bg-primary file:text-primary-foreground file:border-0 file:rounded-md file:px-2 file:py-1 file:mr-2 text-sm"
                                />
                                <p className="text-xs text-muted-foreground mt-2">
                                  Supported formats: Images (JPG, PNG, GIF) and Videos (MP4, MOV)
                                </p>
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <Button
                                onClick={() => saveEditedSubmission(submission.id)}
                                size="sm"
                                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                              >
                                Save Changes
                              </Button>
                              <Button
                                onClick={cancelEditing}
                                variant="outline"
                                size="sm"
                                className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10"
                              >
                                Cancel
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <>
                        {renderSubmissionContent(submission)}
                        {submission.media_url && (
                          <div className="mb-2">
                            <Image
                              src={submission.media_url || "/placeholder.svg"}
                              alt="Submission media"
                              width={200}
                              height={150}
                              className="rounded-lg object-cover"
                              sizes="200px"
                              quality={70}
                              loading="lazy"
                            />
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Submitted: {new Date(submission.created_at).toLocaleDateString()}
                        </p>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            {canSubmitMore ? (
              <div className="space-y-4 sm:space-y-6">
                {useDynamicForm ? (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground">New Submission</h3>
                    <DynamicFormRenderer
                      schema={missionSchema}
                      onSubmit={handleDynamicSubmit}
                      onSaveProgress={handleSaveProgress}
                      initialAnswers={initialDynamicAnswers}
                      initialMediaUrls={initialMediaUrls}
                      isSubmitting={isSubmitting}
                      onSubmittingChange={() => {}} // No-op as startSubmitTransition handles the state
                      className="bg-white/5 dark:bg-black/10 backdrop-blur-lg border border-white/20 dark:border-white/10 rounded-lg p-4"
                    />
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="font-medium text-foreground">
                          New Submission{submissionForms.length > 1 ? "s" : ""}
                        </h3>
                        {maxSubmissions > 1 && submissionForms.length < remainingSubmissions && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addSubmissionForm}
                            className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Another
                          </Button>
                        )}
                      </div>

                      {submissionForms.map((form, index) => (
                        <div
                          key={form.id}
                          className="bg-white/5 dark:bg-black/10 backdrop-blur-lg border border-white/20 dark:border-white/10 rounded-lg p-4 space-y-4"
                        >
                          <div className="flex justify-between items-center">
                            <h4 className="font-medium text-foreground">Entry #{index + 1}</h4>
                            {submissionForms.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeSubmissionForm(form.id)}
                                className="text-red-400 hover:text-red-300"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>

                          <div className="space-y-2 sm:space-y-3">
                            <Label
                              htmlFor={`textSubmission-${form.id}`}
                              className="text-foreground font-semibold text-base sm:text-lg"
                            >
                              Your Journal Entry
                            </Label>
                            <Textarea
                              id={`textSubmission-${form.id}`}
                              placeholder="Share your experience, thoughts, and reflections about completing this mission..."
                              className="min-h-32 sm:min-h-40 bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground placeholder:text-muted-foreground resize-none text-sm sm:text-base"
                              value={form.textSubmission}
                              onChange={(e) => updateSubmissionForm(form.id, "textSubmission", e.target.value)}
                              required
                            />
                          </div>

                          <div className="space-y-2 sm:space-3">
                            <Label
                              htmlFor={`mediaFile-${form.id}`}
                              className="text-foreground font-semibold text-base sm:text-lg flex items-center gap-2"
                            >
                              <Upload className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                              Upload Media (Optional)
                            </Label>
                            <div className="bg-white/5 dark:bg-black/10 backdrop-blur-lg border border-white/20 dark:border-white/10 rounded-lg p-3 sm:p-4">
                              <Input
                                id={`mediaFile-${form.id}`}
                                type="file"
                                accept="image/*,video/*"
                                className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground file:bg-primary file:text-primary-foreground file:border-0 file:rounded-md file:px-2 file:py-1 sm:file:px-3 sm:file:py-1 file:mr-2 sm:file:mr-3 text-sm sm:text-base"
                                onChange={(e) =>
                                  updateSubmissionForm(form.id, "mediaFile", e.target.files?.[0] || null)
                                }
                              />
                              <p className="text-xs text-muted-foreground mt-2">
                                Supported formats: Images (JPG, PNG, GIF) and Videos (MP4, MOV)
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button
                        type="button"
                        onClick={() => handleSaveProgress()}
                        disabled={isSavingProgress || isSubmitting}
                        variant="outline"
                        className="flex-1 bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 hover:bg-white/20 dark:hover:bg-black/30 text-foreground font-semibold py-3 sm:py-4 text-sm sm:text-base lg:text-lg hover:scale-105 transition-all duration-300 min-h-[48px] sm:min-h-[56px] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 touch-manipulation active:scale-95"
                        size="lg"
                      >
                        {isSavingProgress ? (
                          <>
                            <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 mr-2 animate-spin" />
                            <span className="text-sm sm:text-base">Saving...</span>
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                            <span className="text-sm sm:text-base">Save Progress</span>
                          </>
                        )}
                      </Button>
                      <Button
                        type="submit"
                        disabled={isSubmitting || isSavingProgress}
                        className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 sm:py-4 text-sm sm:text-base lg:text-lg hover:scale-105 transition-all duration-300 min-h-[48px] sm:min-h-[56px] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 touch-manipulation active:scale-95"
                        size="lg"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 mr-2 animate-spin" />
                            <span className="text-sm sm:text-base">Submitting...</span>
                          </>
                        ) : (
                          <span className="text-sm sm:text-base">
                            Submit Mission{submissionForms.length > 1 ? "s" : ""}
                          </span>
                        )}
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            ) : (
              <div className="text-center py-12 bg-white/5 dark:bg-black/10 backdrop-blur-lg border border-white/20 dark:border-white/10 rounded-lg">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <p className="text-lg font-semibold text-foreground mb-2">All Submissions Complete</p>
                <p className="text-sm text-muted-foreground">
                  You've reached the maximum of {maxSubmissions} submission{maxSubmissions > 1 ? "s" : ""} for this
                  mission.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
