"use client"

import type React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { Edit, CheckCircle, Eye, ExternalLink, History } from "lucide-react"
import { updateProfile, updateAvatar } from "@/lib/actions"
import { useState, useRef } from "react"
import { useRouter } from "next/navigation"

interface AccountPageClientProps {
  initialData: {
    user: any
    profile: any
    totalPoints: number
    missionsCompleted: number
    userRank: number
    submissionHistoryWithTitles: any[]
  }
}

export function AccountPageClient({ initialData }: AccountPageClientProps) {
  const { toast } = useToast()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [profile, setProfile] = useState(initialData.profile)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null)
  const [showSubmissionModal, setShowSubmissionModal] = useState(false)

  const handleProfileUpdate = async (formData: FormData) => {
    try {
      await updateProfile(formData)
      setShowSuccessModal(true)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const formData = new FormData()
      formData.append("avatar", file)

      await updateAvatar(formData)

      router.refresh()

      toast({
        title: "Success",
        description: "Your profile picture was updated successfully.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile picture. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleSubmissionClick = (submission: any) => {
    setSelectedSubmission(submission)
    setShowSubmissionModal(true)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  return (
    <>
      <Card className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 hover:scale-[1.02] transition-all duration-300">
        <CardHeader className="text-center p-4 sm:p-6">
          <div className="flex justify-center mb-3 sm:mb-4">
            <div className="relative">
              <Avatar className="w-16 h-16 sm:w-24 sm:h-24 ring-4 ring-white/20 dark:ring-white/10">
                <AvatarImage src={profile?.avatar_url || "/placeholder.svg"} alt={profile?.name || "User"} />
                <AvatarFallback className="bg-primary text-primary-foreground text-lg sm:text-2xl">
                  {profile?.name
                    ?.split(" ")
                    .map((n) => n[0])
                    .join("") || "U"}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-2 -right-2 sm:-bottom-1 sm:-right-1 p-1 sm:p-1.5 hover:bg-primary/90 text-primary-foreground rounded-full shadow-lg hover:scale-110 transition-all duration-300 px-3.5 py-0 my-0 mx-12 bg-border"
              >
                <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            </div>
          </div>
          <CardTitle className="text-xl sm:text-2xl text-foreground">{profile?.name || "User"}</CardTitle>
        </CardHeader>
        <CardContent className="text-center p-4 sm:p-6 pt-0">
          <div className="bg-gradient-to-r from-primary/20 to-secondary/20 backdrop-blur-lg rounded-xl p-4 sm:p-6 border border-white/20 dark:border-white/10">
            <p className="text-xs sm:text-sm text-muted-foreground mb-2">Total EP Earned</p>
            <p className="text-2xl sm:text-4xl font-bold text-foreground">{initialData.totalPoints.toLocaleString()}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 hover:scale-[1.02] transition-all duration-300">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-lg sm:text-xl text-foreground">Profile Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 sm:p-6 pt-0">
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              const formData = new FormData(e.currentTarget)
              await handleProfileUpdate(formData)
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="name" className="text-foreground font-medium text-sm sm:text-base">
                Name
              </Label>
              <Input
                id="name"
                name="name"
                defaultValue={profile?.name || ""}
                className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground placeholder:text-muted-foreground h-11 sm:h-10"
                placeholder="Enter your name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground font-medium text-sm sm:text-base">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={profile?.email || initialData.user.email || ""}
                className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground placeholder:text-muted-foreground h-11 sm:h-10"
                placeholder="Your email address"
                disabled
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="job_title" className="text-foreground font-medium text-sm sm:text-base">
                Job Title
              </Label>
              <Input
                id="job_title"
                name="job_title"
                defaultValue={profile?.job_title || ""}
                className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground placeholder:text-muted-foreground h-11 sm:h-10"
                placeholder="Enter your job title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="department" className="text-foreground font-medium text-sm sm:text-base">
                Department
              </Label>
              <Input
                id="department"
                name="department"
                defaultValue={profile?.department || ""}
                className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground placeholder:text-muted-foreground h-11 sm:h-10"
                placeholder="Enter your department"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country" className="text-foreground font-medium text-sm sm:text-base">
                Where are you from?
              </Label>
              <Input
                id="country"
                name="country"
                defaultValue={profile?.country || ""}
                className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground placeholder:text-muted-foreground h-11 sm:h-10"
                placeholder="Enter your country"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio" className="text-foreground font-medium text-sm sm:text-base">
                Bio
              </Label>
              <textarea
                id="bio"
                name="bio"
                defaultValue={profile?.bio || ""}
                className="w-full min-h-[100px] px-3 py-2 bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground placeholder:text-muted-foreground rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Tell us a bit about yourself..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer_obsession" className="text-foreground font-medium text-sm sm:text-base">
                I believe customer obsession is...
              </Label>
              <textarea
                id="customer_obsession"
                name="customer_obsession"
                defaultValue={profile?.customer_obsession || ""}
                className="w-full min-h-[100px] px-3 py-2 bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground placeholder:text-muted-foreground rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Share your thoughts on customer obsession..."
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground hover:scale-105 transition-all duration-300 h-11 sm:h-10"
            >
              Update Profile
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:gap-6">
        <Card className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 hover:scale-[1.02] transition-all duration-300">
          <CardContent className="p-3 sm:p-6 text-center">
            <div className="bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg p-3 sm:p-4 mb-2 sm:mb-3">
              <p className="text-xl sm:text-3xl font-bold text-foreground">{initialData.missionsCompleted}</p>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium mb-3">Activities Completed</p>
            <Link href="/account/missions">
              <Button
                variant="outline"
                size="sm"
                className="bg-white/10 dark:bg-black/20 border-white/20 dark:border-white/10 text-foreground hover:bg-white/20 dark:hover:bg-black/30 text-xs"
              >
                View
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 hover:scale-[1.02] transition-all duration-300">
          <CardContent className="p-3 sm:p-6 text-center">
            <div className="bg-gradient-to-br from-secondary/20 to-secondary/10 rounded-lg p-3 sm:p-4 mb-2 sm:mb-3">
              <p className="text-xl sm:text-3xl font-bold text-foreground">#{initialData.userRank}</p>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium">Current Rank</p>
          </CardContent>
        </Card>
      </div>

      {initialData.submissionHistoryWithTitles && initialData.submissionHistoryWithTitles.length > 0 && (
        <Card className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-lg sm:text-xl text-foreground flex items-center gap-2">
              <History className="h-5 w-5" />
              My Submission History
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="rounded-lg border border-white/20 dark:border-white/10 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/20 dark:border-white/10 hover:bg-white/5 dark:hover:bg-black/10">
                    <TableHead className="text-foreground font-medium">Activity Title</TableHead>
                    <TableHead className="text-foreground font-medium text-center">EP</TableHead>
                    <TableHead className="text-foreground font-medium text-right">Date Completed</TableHead>
                    <TableHead className="text-foreground font-medium text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {initialData.submissionHistoryWithTitles.map((submission) => (
                    <TableRow
                      key={submission.id}
                      className="border-white/20 dark:border-white/10 hover:bg-white/5 dark:hover:bg-black/10 cursor-pointer"
                      onClick={() => handleSubmissionClick(submission)}
                    >
                      <TableCell className="text-foreground font-medium">{submission.missions.title}</TableCell>
                      <TableCell className="text-center">
                        {submission.status === "approved" ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/20 text-primary">
                            +{submission.points_awarded}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-600 dark:text-yellow-400">
                            {submission.status === "pending" ? "Pending" : submission.status}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-right text-sm">
                        {formatDate(submission.created_at)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSubmissionClick(submission)
                            }}
                            className="h-8 w-8 p-0 hover:bg-white/10 dark:hover:bg-black/20"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Link href={`/mission/${submission.mission_id}`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => e.stopPropagation()}
                              className="h-8 w-8 p-0 hover:bg-white/10 dark:hover:bg-black/20"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="bg-white/95 dark:bg-black/95 backdrop-blur-xl border border-white/20 dark:border-white/10 max-w-md">
          <DialogHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <DialogTitle className="text-2xl font-bold text-foreground">Profile Updated!</DialogTitle>
            <DialogDescription className="text-muted-foreground text-lg">
              Your profile was updated successfully.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center pt-4">
            <Button
              onClick={() => setShowSuccessModal(false)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 py-3 text-base hover:scale-105 transition-all duration-300"
            >
              Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showSubmissionModal} onOpenChange={setShowSubmissionModal}>
        <DialogContent className="bg-white/95 dark:bg-black/95 backdrop-blur-xl border border-white/20 dark:border-white/10 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Submission Details
            </DialogTitle>
          </DialogHeader>
          {selectedSubmission && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-foreground mb-2">Mission</h3>
                <p className="text-muted-foreground">{selectedSubmission.missions.title}</p>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">Your Submission</h3>
                <div className="bg-white/10 dark:bg-black/20 rounded-lg p-4 border border-white/20 dark:border-white/10">
                  <p className="text-foreground whitespace-pre-wrap">
                    {selectedSubmission.content || "No content available"}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground mb-1">EP Awarded</h3>
                  {selectedSubmission.status === "approved" ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary/20 text-primary">
                      +{selectedSubmission.points_awarded}
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-500/20 text-yellow-600 dark:text-yellow-400">
                      {selectedSubmission.status === "pending" ? "Pending Review" : selectedSubmission.status}
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Completed On</h3>
                  <p className="text-muted-foreground text-sm">{formatDate(selectedSubmission.created_at)}</p>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Link href={`/mission/${selectedSubmission.mission_id}`} className="flex-1">
                  <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit & Resubmit
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  onClick={() => setShowSubmissionModal(false)}
                  className="bg-white/10 dark:bg-black/20 border-white/20 dark:border-white/10 text-foreground hover:bg-white/20 dark:hover:bg-black/30"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
