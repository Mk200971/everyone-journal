"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Check, X, Eye, Calendar, User, Target, FileText, ImageIcon, MessageCircle, Home, Trash2 } from 'lucide-react'
import Link from "next/link"
import { toast } from "sonner"
import {
  fetchAllSubmissions,
  updateSubmissionStatusAdmin,
  deleteSubmissionAdmin,
  type AdminSubmission,
} from "@/lib/admin-actions"
import { AdminSubmissionsSkeleton } from "@/components/skeleton-loaders"
import { MediaCarousel } from "@/components/media-carousel"
import { MediaLightbox } from "@/components/media-lightbox"

export default function SubmissionReviewPage() {
  const [submissions, setSubmissions] = useState<AdminSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState("pending")
  const [reviewNote, setReviewNote] = useState("")
  const [selectedSubmission, setSelectedSubmission] = useState<AdminSubmission | null>(null)

  useEffect(() => {
    fetchSubmissions()
  }, [])

  const fetchSubmissions = async () => {
    try {
      const data = await fetchAllSubmissions()
      setSubmissions(data)
    } catch (error) {
      console.error("Error fetching submissions:", error)
      toast.error("Failed to fetch submissions")
    } finally {
      setLoading(false)
    }
  }

  const updateSubmissionStatus = async (
    submissionId: string,
    status: "pending" | "approved" | "rejected",
    pointsAwarded?: number,
  ) => {
    try {
      await updateSubmissionStatusAdmin(submissionId, status, pointsAwarded)

      // Update local state
      setSubmissions((prev) =>
        prev.map((sub) =>
          sub.id === submissionId ? { ...sub, status, points_awarded: pointsAwarded || sub.points_awarded } : sub,
        ),
      )

      toast.success(`Submission ${status}`)
    } catch (error) {
      console.error("Error updating submission:", error)
      toast.error("Failed to update submission")
    }
  }

  const deleteSubmission = async (submissionId: string) => {
    try {
      await deleteSubmissionAdmin(submissionId)

      // Update local state
      setSubmissions((prev) => prev.filter((sub) => sub.id !== submissionId))

      toast.success("Submission deleted successfully")
    } catch (error) {
      console.error("Error deleting submission:", error)
      toast.error("Failed to delete submission")
    }
  }

  const handleStatusChange = async (
    submissionId: string,
    newStatus: "pending" | "approved" | "rejected",
    submission: AdminSubmission,
  ) => {
    const pointsToAward = newStatus === "approved" ? submission.mission.points_value : undefined
    await updateSubmissionStatus(submissionId, newStatus, pointsToAward)
  }

  const filteredSubmissions = submissions.filter((sub) => sub.status === selectedTab)

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-black dark:to-purple-900">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto space-y-6">
            <header className="sticky top-0 z-50 py-6 mb-12 bg-white/10 dark:bg-black/20 backdrop-blur-xl border-b border-white/20 dark:border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-4xl font-bold text-foreground mb-2">Submission Review</h1>
                  <p className="text-muted-foreground text-lg">Loading submissions...</p>
                </div>
              </div>
            </header>
            <AdminSubmissionsSkeleton />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-black dark:to-purple-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <header className="sticky top-0 z-50 py-6 mb-12 bg-white/10 dark:bg-black/20 backdrop-blur-xl border-b border-white/20 dark:border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-foreground mb-2 text-balance">Submission Review</h1>
                <p className="text-muted-foreground text-lg">
                  Review and manage user mission submissions ({submissions.length} total)
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
                <Link href="/admin" className="w-full sm:w-auto">
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground hover:bg-white/20 dark:hover:bg-black/30 hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2 h-11 sm:h-10"
                  >
                    <Target className="h-4 w-4" />
                    <span className="sm:inline">Mission Management</span>
                  </Button>
                </Link>
                <Link href="/admin/quotes" className="w-full sm:w-auto">
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground hover:bg-white/20 dark:hover:bg-black/30 hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2 h-11 sm:h-10"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span className="sm:inline">Manage Quotes</span>
                  </Button>
                </Link>
                <Link href="/" className="w-full sm:w-auto">
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground hover:bg-white/20 dark:hover:bg-black/30 hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2 h-11 sm:h-10"
                  >
                    <Home className="h-4 w-4" />
                    <span className="sm:inline">Back to Home</span>
                  </Button>
                </Link>
              </div>
            </div>
          </header>

          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-white/10 dark:bg-black/20 backdrop-blur-lg">
              <TabsTrigger value="pending" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Pending ({submissions.filter((s) => s.status === "pending").length})
              </TabsTrigger>
              <TabsTrigger value="approved" className="flex items-center gap-2">
                <Check className="h-4 w-4" />
                Approved ({submissions.filter((s) => s.status === "approved").length})
              </TabsTrigger>
              <TabsTrigger value="rejected" className="flex items-center gap-2">
                <X className="h-4 w-4" />
                Rejected ({submissions.filter((s) => s.status === "rejected").length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={selectedTab} className="space-y-4">
              {filteredSubmissions.length === 0 ? (
                <Card className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10">
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">No {selectedTab} submissions found.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {filteredSubmissions.map((submission) => {
                    const mediaUrls: string[] = (() => {
                      if (!submission.media_url) return []
                      try {
                        return typeof submission.media_url === 'string'
                          ? JSON.parse(submission.media_url)
                          : Array.isArray(submission.media_url)
                            ? submission.media_url
                            : []
                      } catch {
                        return []
                      }
                    })()

                    return (
                      <Card
                        key={submission.id}
                        className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10"
                      >
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="space-y-2">
                              <CardTitle className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                {submission.profile.name}
                              </CardTitle>
                              <CardDescription className="flex items-center gap-2">
                                <Target className="h-4 w-4" />
                                {submission.mission.title}
                              </CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                              <Select
                                value={submission.status}
                                onValueChange={(value: "pending" | "approved" | "rejected") =>
                                  handleStatusChange(submission.id, value, submission)
                                }
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue>
                                    <Badge
                                      variant={
                                        submission.status === "approved"
                                          ? "default"
                                          : submission.status === "rejected"
                                            ? "destructive"
                                            : "secondary"
                                      }
                                    >
                                      {submission.status}
                                    </Badge>
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">
                                    <Badge variant="secondary">pending</Badge>
                                  </SelectItem>
                                  <SelectItem value="approved">
                                    <Badge variant="default">approved</Badge>
                                  </SelectItem>
                                  <SelectItem value="rejected">
                                    <Badge variant="destructive">rejected</Badge>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="outline" size="sm" onClick={() => setSelectedSubmission(submission)}>
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                  <DialogHeader>
                                    <DialogTitle>Submission Details</DialogTitle>
                                    <DialogDescription>
                                      Review submission from {submission.profile.name}
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div>
                                      <h4 className="font-semibold mb-2">Mission</h4>
                                      <p className="text-sm text-muted-foreground">{submission.mission.title}</p>
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {submission.mission.description}
                                      </p>
                                    </div>

                                    {submission.text_submission && (
                                      <div>
                                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                                          <FileText className="h-4 w-4" />
                                          Text Submission
                                        </h4>
                                        <p className="text-sm bg-muted p-3 rounded-md">{submission.text_submission}</p>
                                      </div>
                                    )}

                                    {submission.answers &&
                                      submission.mission.submission_schema &&
                                      (() => {
                                        const schemaFields =
                                          submission.mission.submission_schema.fields ||
                                          submission.mission.submission_schema
                                        return (
                                          <div>
                                            <h4 className="font-semibold mb-2">Form Answers</h4>
                                            <div className="space-y-3">
                                              {Array.isArray(schemaFields) &&
                                                schemaFields.map((field: any, index: number) => {
                                                  const fieldKey = field.name || field.label || `question_${index + 1}`
                                                  const answer =
                                                    submission.answers[fieldKey] || submission.answers[field.name] || ""

                                                  if (!answer) return null

                                                  return (
                                                    <div key={fieldKey} className="bg-muted/50 p-3 rounded-lg">
                                                      <p className="text-sm font-medium text-foreground mb-1">
                                                        {field.label || field.name || `Question ${index + 1}`}
                                                      </p>
                                                      <p className="text-sm text-muted-foreground">{String(answer)}</p>
                                                    </div>
                                                  )
                                                })}
                                            </div>
                                          </div>
                                        )
                                      })()}

                                    {submission.answers && !submission.mission.submission_schema && (
                                      <div>
                                        <h4 className="font-semibold mb-2">Form Answers</h4>
                                        <div className="space-y-2">
                                          {Object.entries(submission.answers).map(([key, value]) => (
                                            <div key={key} className="bg-muted p-2 rounded">
                                              <p className="text-xs font-medium text-muted-foreground">{key}</p>
                                              <p className="text-sm">{String(value)}</p>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {mediaUrls.length > 0 && (
                                      <div>
                                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                                          <ImageIcon className="h-4 w-4" />
                                          Media Submission ({mediaUrls.length})
                                        </h4>
                                        
                                        <div className="grid grid-cols-3 gap-2 mb-3">
                                          {mediaUrls.slice(0, 6).map((url, index) => (
                                            <MediaLightbox
                                              key={index}
                                              mediaUrls={mediaUrls}
                                              initialIndex={index}
                                              trigger={
                                                <div className="relative aspect-square rounded-md overflow-hidden cursor-pointer hover:opacity-80 transition-opacity">
                                                  {url.includes(".mp4") || url.includes(".mov") ? (
                                                    <video
                                                      src={url}
                                                      className="w-full h-full object-cover"
                                                      preload="metadata"
                                                    />
                                                  ) : (
                                                    <img
                                                      src={url || "/placeholder.svg"}
                                                      alt={`Media ${index + 1}`}
                                                      className="w-full h-full object-cover"
                                                    />
                                                  )}
                                                  {index === 5 && mediaUrls.length > 6 && (
                                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                                      <span className="text-white font-semibold">
                                                        +{mediaUrls.length - 6}
                                                      </span>
                                                    </div>
                                                  )}
                                                </div>
                                              }
                                            />
                                          ))}
                                        </div>

                                        <MediaCarousel mediaUrls={mediaUrls} className="max-w-md" />
                                      </div>
                                    )}

                                    {submission.status === "pending" && (
                                      <div className="flex gap-2 pt-4 border-t">
                                        <Button
                                          onClick={() =>
                                            updateSubmissionStatus(
                                              submission.id,
                                              "approved",
                                              submission.mission.points_value,
                                            )
                                          }
                                          className="flex-1"
                                        >
                                          <Check className="h-4 w-4 mr-2" />
                                          Approve ({submission.mission.points_value} pts)
                                        </Button>
                                        <Button
                                          variant="destructive"
                                          onClick={() => updateSubmissionStatus(submission.id, "rejected")}
                                          className="flex-1"
                                        >
                                          <X className="h-4 w-4 mr-2" />
                                          Reject
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </DialogContent>
                              </Dialog>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (
                                    confirm(
                                      "Are you sure you want to delete this submission? This action cannot be undone.",
                                    )
                                  ) {
                                    deleteSubmission(submission.id)
                                  }
                                }}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">
                              Submitted: {new Date(submission.created_at).toLocaleDateString()}
                            </p>
                            {submission.text_submission && (
                              <p className="text-sm line-clamp-2">{submission.text_submission}</p>
                            )}

                            {submission.answers &&
                              submission.mission.submission_schema &&
                              (() => {
                                const schemaFields =
                                  submission.mission.submission_schema.fields ||
                                  submission.mission.submission_schema
                                return (
                                  <div className="mt-3">
                                    <h5 className="text-xs font-medium text-muted-foreground mb-2">Form Answers:</h5>
                                    <div className="space-y-1">
                                      {Array.isArray(schemaFields) &&
                                        schemaFields.slice(0, 3).map((field: any, index: number) => {
                                          const fieldKey = field.name || field.label || `question_${index + 1}`
                                          const answer =
                                            submission.answers[fieldKey] || submission.answers[field.name] || ""

                                          if (!answer) return null

                                          return (
                                            <div key={fieldKey} className="bg-muted/30 p-2 rounded text-xs">
                                              <span className="font-medium text-foreground">
                                                {field.label || field.name || `Question ${index + 1}`}:
                                              </span>
                                              <span className="text-muted-foreground ml-1 line-clamp-1">
                                                {String(answer)}
                                              </span>
                                            </div>
                                          )
                                        })}
                                      {Array.isArray(schemaFields) && schemaFields.length > 3 && (
                                        <Dialog>
                                          <DialogTrigger asChild>
                                            <p 
                                              className="text-xs text-muted-foreground italic cursor-pointer hover:text-foreground hover:underline transition-colors"
                                              onClick={() => setSelectedSubmission(submission)}
                                            >
                                              +{schemaFields.length - 3} more answers...
                                            </p>
                                          </DialogTrigger>
                                          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                            <DialogHeader>
                                              <DialogTitle>Submission Details</DialogTitle>
                                              <DialogDescription>
                                                Review submission from {submission.profile.name}
                                              </DialogDescription>
                                            </DialogHeader>
                                            <div className="space-y-4">
                                              <div>
                                                <h4 className="font-semibold mb-2">Mission</h4>
                                                <p className="text-sm text-muted-foreground">{submission.mission.title}</p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                  {submission.mission.description}
                                                </p>
                                              </div>

                                              {submission.text_submission && (
                                                <div>
                                                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                                                    <FileText className="h-4 w-4" />
                                                    Text Submission
                                                  </h4>
                                                  <p className="text-sm bg-muted p-3 rounded-md">{submission.text_submission}</p>
                                                </div>
                                              )}

                                              {submission.answers &&
                                                submission.mission.submission_schema &&
                                                (() => {
                                                  const schemaFields =
                                                    submission.mission.submission_schema.fields ||
                                                    submission.mission.submission_schema
                                                  return (
                                                    <div>
                                                      <h4 className="font-semibold mb-2">Form Answers</h4>
                                                      <div className="space-y-3">
                                                        {Array.isArray(schemaFields) &&
                                                          schemaFields.map((field: any, index: number) => {
                                                            const fieldKey = field.name || field.label || `question_${index + 1}`
                                                            const answer =
                                                              submission.answers[fieldKey] || submission.answers[field.name] || ""

                                                            if (!answer) return null

                                                            return (
                                                              <div key={fieldKey} className="bg-muted/50 p-3 rounded-lg">
                                                                <p className="text-sm font-medium text-foreground mb-1">
                                                                  {field.label || field.name || `Question ${index + 1}`}
                                                                </p>
                                                                <p className="text-sm text-muted-foreground">{String(answer)}</p>
                                                              </div>
                                                            )
                                                          })}
                                                      </div>
                                                    </div>
                                                  )
                                                })()}

                                              {submission.answers && !submission.mission.submission_schema && (
                                                <div>
                                                  <h4 className="font-semibold mb-2">Form Answers</h4>
                                                  <div className="space-y-2">
                                                    {Object.entries(submission.answers).map(([key, value]) => (
                                                      <div key={key} className="bg-muted p-2 rounded">
                                                        <p className="text-xs font-medium text-muted-foreground">{key}</p>
                                                        <p className="text-sm">{String(value)}</p>
                                                      </div>
                                                    ))}
                                                  </div>
                                                </div>
                                              )}

                                              {mediaUrls.length > 0 && (
                                                <div>
                                                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                                                    <ImageIcon className="h-4 w-4" />
                                                    Media Submission ({mediaUrls.length})
                                                  </h4>
                                                  
                                                  <div className="grid grid-cols-3 gap-2 mb-3">
                                                    {mediaUrls.slice(0, 6).map((url, index) => (
                                                      <MediaLightbox
                                                        key={index}
                                                        mediaUrls={mediaUrls}
                                                        initialIndex={index}
                                                        trigger={
                                                          <div className="relative aspect-square rounded-md overflow-hidden cursor-pointer hover:opacity-80 transition-opacity">
                                                            {url.includes(".mp4") || url.includes(".mov") ? (
                                                              <video
                                                                src={url}
                                                                className="w-full h-full object-cover"
                                                                preload="metadata"
                                                              />
                                                            ) : (
                                                              <img
                                                                src={url || "/placeholder.svg"}
                                                                alt={`Media ${index + 1}`}
                                                                className="w-full h-full object-cover"
                                                              />
                                                            )}
                                                            {index === 5 && mediaUrls.length > 6 && (
                                                              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                                                <span className="text-white font-semibold">
                                                                  +{mediaUrls.length - 6}
                                                                </span>
                                                              </div>
                                                            )}
                                                          </div>
                                                        }
                                                      />
                                                    ))}
                                                  </div>

                                                  <MediaCarousel mediaUrls={mediaUrls} className="max-w-md" />
                                                </div>
                                              )}

                                              {submission.status === "pending" && (
                                                <div className="flex gap-2 pt-4 border-t">
                                                  <Button
                                                    onClick={() =>
                                                      updateSubmissionStatus(
                                                        submission.id,
                                                        "approved",
                                                        submission.mission.points_value,
                                                      )
                                                    }
                                                    className="flex-1"
                                                  >
                                                    <Check className="h-4 w-4 mr-2" />
                                                    Approve ({submission.mission.points_value} pts)
                                                  </Button>
                                                  <Button
                                                    variant="destructive"
                                                    onClick={() => updateSubmissionStatus(submission.id, "rejected")}
                                                    className="flex-1"
                                                  >
                                                    <X className="h-4 w-4 mr-2" />
                                                    Reject
                                                  </Button>
                                                </div>
                                              )}
                                            </div>
                                          </DialogContent>
                                        </Dialog>
                                      )}
                                    </div>
                                  </div>
                                )
                              })()}

                            {submission.answers && !submission.mission.submission_schema && (
                              <div className="mt-3">
                                <h5 className="text-xs font-medium text-muted-foreground mb-2">Form Answers:</h5>
                                <div className="space-y-1">
                                  {Object.entries(submission.answers)
                                    .slice(0, 3)
                                    .map(([key, value]) => (
                                      <div key={key} className="bg-muted/30 p-2 rounded text-xs">
                                        <span className="font-medium text-foreground">{key}:</span>
                                        <span className="text-muted-foreground ml-1 line-clamp-1">{String(value)}</span>
                                      </div>
                                    ))}
                                  {Object.keys(submission.answers).length > 3 && (
                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <p 
                                          className="text-xs text-muted-foreground italic cursor-pointer hover:text-foreground hover:underline transition-colors"
                                          onClick={() => setSelectedSubmission(submission)}
                                        >
                                          +{Object.keys(submission.answers).length - 3} more answers...
                                        </p>
                                      </DialogTrigger>
                                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                        <DialogHeader>
                                          <DialogTitle>Submission Details</DialogTitle>
                                          <DialogDescription>
                                            Review submission from {submission.profile.name}
                                          </DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-4">
                                          <div>
                                            <h4 className="font-semibold mb-2">Mission</h4>
                                            <p className="text-sm text-muted-foreground">{submission.mission.title}</p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                              {submission.mission.description}
                                            </p>
                                          </div>

                                          {submission.text_submission && (
                                            <div>
                                              <h4 className="font-semibold mb-2 flex items-center gap-2">
                                                <FileText className="h-4 w-4" />
                                                Text Submission
                                              </h4>
                                              <p className="text-sm bg-muted p-3 rounded-md">{submission.text_submission}</p>
                                            </div>
                                          )}

                                          {submission.answers && (
                                            <div>
                                              <h4 className="font-semibold mb-2">Form Answers</h4>
                                              <div className="space-y-2">
                                                {Object.entries(submission.answers).map(([key, value]) => (
                                                  <div key={key} className="bg-muted p-2 rounded">
                                                    <p className="text-xs font-medium text-muted-foreground">{key}</p>
                                                    <p className="text-sm">{String(value)}</p>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          )}

                                          {mediaUrls.length > 0 && (
                                            <div>
                                              <h4 className="font-semibold mb-2 flex items-center gap-2">
                                                <ImageIcon className="h-4 w-4" />
                                                Media Submission ({mediaUrls.length})
                                              </h4>
                                              
                                              <div className="grid grid-cols-3 gap-2 mb-3">
                                                {mediaUrls.slice(0, 6).map((url, index) => (
                                                  <MediaLightbox
                                                    key={index}
                                                    mediaUrls={mediaUrls}
                                                    initialIndex={index}
                                                    trigger={
                                                      <div className="relative aspect-square rounded-md overflow-hidden cursor-pointer hover:opacity-80 transition-opacity">
                                                        {url.includes(".mp4") || url.includes(".mov") ? (
                                                          <video
                                                            src={url}
                                                            className="w-full h-full object-cover"
                                                            preload="metadata"
                                                          />
                                                        ) : (
                                                          <img
                                                            src={url || "/placeholder.svg"}
                                                            alt={`Media ${index + 1}`}
                                                            className="w-full h-full object-cover"
                                                          />
                                                        )}
                                                        {index === 5 && mediaUrls.length > 6 && (
                                                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                                            <span className="text-white font-semibold">
                                                              +{mediaUrls.length - 6}
                                                            </span>
                                                          </div>
                                                        )}
                                                      </div>
                                                    }
                                                  />
                                                ))}
                                              </div>

                                              <MediaCarousel mediaUrls={mediaUrls} className="max-w-md" />
                                            </div>
                                          )}

                                          {submission.status === "pending" && (
                                            <div className="flex gap-2 pt-4 border-t">
                                              <Button
                                                onClick={() =>
                                                  updateSubmissionStatus(
                                                    submission.id,
                                                    "approved",
                                                    submission.mission.points_value,
                                                  )
                                                }
                                                className="flex-1"
                                              >
                                                <Check className="h-4 w-4 mr-2" />
                                                Approve ({submission.mission.points_value} pts)
                                              </Button>
                                              <Button
                                                variant="destructive"
                                                onClick={() => updateSubmissionStatus(submission.id, "rejected")}
                                                className="flex-1"
                                              >
                                                <X className="h-4 w-4 mr-2" />
                                                Reject
                                              </Button>
                                            </div>
                                          )}
                                        </div>
                                      </DialogContent>
                                    </Dialog>
                                  )}
                                </div>
                              </div>
                            )}

                            {submission.status === "pending" && (
                              <div className="flex gap-2 pt-2">
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    updateSubmissionStatus(submission.id, "approved", submission.mission.points_value)
                                  }
                                >
                                  <Check className="h-4 w-4 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => updateSubmissionStatus(submission.id, "rejected")}
                                >
                                  <X className="h-4 w-4 mr-1" />
                                  Reject
                                </Button>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
