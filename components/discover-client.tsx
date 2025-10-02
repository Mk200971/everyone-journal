"use client"

import { useState, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Heart, Calendar, Award, Briefcase, UsersIcon } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"
import { useEffect } from "react"

interface Submission {
  id: string
  created_at: string
  text_submission: string | null
  media_url: string | null
  answers: any
  mission_id: string
  user_id: string
  points_awarded: number
}

interface Mission {
  id: string
  title: string
  type: string
}

interface Profile {
  id: string
  name: string
  avatar_url: string | null
  job_title: string | null
  department: string | null
}

interface DiscoverClientProps {
  initialData: {
    submissions: Submission[]
    missions: Mission[]
    profiles: Profile[]
  }
}

export function DiscoverClient({ initialData }: DiscoverClientProps) {
  const [selectedType, setSelectedType] = useState<string>("All")
  const [likes, setLikes] = useState<Record<string, number>>({})
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set())
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const supabase = createClient()

  // Create lookup maps
  const missionsMap = useMemo(() => new Map(initialData.missions.map((m) => [m.id, m])), [initialData.missions])
  const profilesMap = useMemo(() => new Map(initialData.profiles.map((p) => [p.id, p])), [initialData.profiles])

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setCurrentUserId(user?.id || null)
    }
    getCurrentUser()
  }, [supabase])

  // Fetch likes for all submissions
  useEffect(() => {
    const fetchLikes = async () => {
      const submissionIds = initialData.submissions.map((s) => s.id)

      // Get like counts
      const { data: likesData } = await supabase
        .from("likes")
        .select("submission_id")
        .in("submission_id", submissionIds)

      if (likesData) {
        const likeCounts: Record<string, number> = {}
        likesData.forEach((like) => {
          likeCounts[like.submission_id] = (likeCounts[like.submission_id] || 0) + 1
        })
        setLikes(likeCounts)
      }

      // Get user's likes if logged in
      if (currentUserId) {
        const { data: userLikesData } = await supabase
          .from("likes")
          .select("submission_id")
          .eq("user_id", currentUserId)
          .in("submission_id", submissionIds)

        if (userLikesData) {
          setUserLikes(new Set(userLikesData.map((like) => like.submission_id)))
        }
      }
    }

    fetchLikes()
  }, [initialData.submissions, currentUserId, supabase])

  const handleLike = async (submissionId: string) => {
    if (!currentUserId) return

    const isLiked = userLikes.has(submissionId)

    if (isLiked) {
      // Unlike
      await supabase.from("likes").delete().eq("submission_id", submissionId).eq("user_id", currentUserId)

      setUserLikes((prev) => {
        const newSet = new Set(prev)
        newSet.delete(submissionId)
        return newSet
      })
      setLikes((prev) => ({ ...prev, [submissionId]: (prev[submissionId] || 1) - 1 }))
    } else {
      // Like
      await supabase.from("likes").insert({ submission_id: submissionId, user_id: currentUserId })

      setUserLikes((prev) => new Set([...prev, submissionId]))
      setLikes((prev) => ({ ...prev, [submissionId]: (prev[submissionId] || 0) + 1 }))
    }
  }

  // Filter submissions by mission type
  const filteredSubmissions = useMemo(() => {
    if (selectedType === "All") {
      return initialData.submissions
    }
    return initialData.submissions.filter((submission) => {
      const mission = missionsMap.get(submission.mission_id)
      return mission?.type?.toLowerCase() === selectedType.toLowerCase()
    })
  }, [initialData.submissions, selectedType, missionsMap])

  // Calculate type counts
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { All: initialData.submissions.length }
    initialData.submissions.forEach((submission) => {
      const mission = missionsMap.get(submission.mission_id)
      if (mission?.type) {
        const type = mission.type.charAt(0).toUpperCase() + mission.type.slice(1)
        counts[type] = (counts[type] || 0) + 1
      }
    })
    return counts
  }, [initialData.submissions, missionsMap])

  const formatRelativeTime = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60)
      return `${hours}h ago`
    } else {
      const days = Math.floor(diffInMinutes / 1440)
      return `${days}d ago`
    }
  }

  const getSubmissionContent = (submission: Submission) => {
    // Check for structured answers first
    if (submission.answers && typeof submission.answers === "object") {
      const answers = submission.answers
      const entries = Object.entries(answers)
      if (entries.length > 0) {
        // Return the first meaningful answer
        const firstAnswer = entries.find(([key, value]) => value && String(value).trim().length > 0)
        if (firstAnswer) {
          return String(firstAnswer[1])
        }
      }
    }
    // Fall back to text submission
    return submission.text_submission || "No content available"
  }

  const getMissionTypeColor = (type: string) => {
    const lowerType = type.toLowerCase()
    switch (lowerType) {
      case "action":
        return "bg-blue-600/30 text-blue-800 dark:text-blue-200 border-blue-600/50"
      case "core":
        return "bg-green-600/30 text-green-800 dark:text-green-200 border-green-600/50"
      case "lite":
        return "bg-yellow-600/30 text-yellow-800 dark:text-yellow-200 border-yellow-600/50"
      case "elevate":
        return "bg-purple-600/30 text-purple-800 dark:text-purple-200 border-purple-600/50"
      default:
        return "bg-gray-600/30 text-gray-800 dark:text-gray-200 border-gray-600/50"
    }
  }

  return (
    <>
      {/* Filter buttons */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-wrap gap-2 sm:gap-3">
          {Object.entries(typeCounts).map(([type, count]) => (
            <Button
              key={type}
              variant={selectedType === type ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedType(type)}
              className={`
                ${
                  selectedType === type
                    ? "bg-primary text-primary-foreground"
                    : "bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground hover:bg-white/20 dark:hover:bg-black/30"
                }
                hover:scale-105 transition-all duration-300 active:scale-95 font-medium h-10 sm:h-11 px-4 sm:px-5 text-sm
              `}
            >
              {type} ({count})
            </Button>
          ))}
        </div>
      </div>

      {/* Submissions grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {filteredSubmissions.map((submission, index) => {
          const mission = missionsMap.get(submission.mission_id)
          const profile = profilesMap.get(submission.user_id)
          const content = getSubmissionContent(submission)
          const likeCount = likes[submission.id] || 0
          const isLiked = userLikes.has(submission.id)

          return (
            <Card
              key={submission.id}
              className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 hover:scale-[1.02] transition-all duration-300 animate-in fade-in slide-in-from-bottom-4"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <CardContent className="p-4 sm:p-5 space-y-4">
                {/* User info */}
                <div className="flex items-start gap-3">
                  <Link href={`/user/${submission.user_id}`}>
                    <Avatar className="w-10 h-10 sm:w-12 sm:h-12 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all">
                      <AvatarImage src={profile?.avatar_url || "/placeholder.svg"} alt={profile?.name || "User"} />
                      <AvatarFallback className="bg-primary/20 text-primary text-sm">
                        {profile?.name
                          ?.split(" ")
                          .map((n) => n[0])
                          .join("") || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/user/${submission.user_id}`}
                      className="font-semibold text-foreground hover:text-primary hover:underline transition-colors text-sm sm:text-base block truncate"
                    >
                      {profile?.name || "Unknown User"}
                    </Link>
                    {profile?.job_title && (
                      <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                        <Briefcase className="h-3 w-3 flex-shrink-0" />
                        {profile.job_title}
                      </p>
                    )}
                    {profile?.department && (
                      <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                        <UsersIcon className="h-3 w-3 flex-shrink-0" />
                        {profile.department}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                    <Calendar className="h-3 w-3" />
                    {formatRelativeTime(submission.created_at)}
                  </div>
                </div>

                {/* Mission info */}
                {mission && (
                  <div className="space-y-2">
                    <Link href={`/mission/${mission.id}`}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`${getMissionTypeColor(mission.type)} backdrop-blur-md border px-2 py-1 rounded-md text-xs font-medium`}
                        >
                          {mission.type}
                        </span>
                        <h3 className="text-sm font-medium text-foreground hover:text-primary hover:underline transition-colors line-clamp-1">
                          {mission.title}
                        </h3>
                      </div>
                    </Link>
                  </div>
                )}

                {/* Submission content */}
                <div className="space-y-3">
                  <p className="text-sm text-foreground leading-relaxed line-clamp-4 text-pretty">{content}</p>

                  {/* Media */}
                  {submission.media_url && (
                    <div className="relative w-full h-48 rounded-lg overflow-hidden">
                      <Image
                        src={submission.media_url || "/placeholder.svg"}
                        alt="Submission media"
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <div className="flex items-center gap-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleLike(submission.id)}
                      disabled={!currentUserId}
                      className={`h-8 px-3 gap-2 ${
                        isLiked ? "text-red-500 hover:text-red-600" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
                      <span className="text-xs">{likeCount}</span>
                    </Button>
                  </div>

                  {submission.points_awarded > 0 && (
                    <div className="flex items-center gap-1 text-xs font-medium text-accent">
                      <Award className="h-4 w-4" />
                      {submission.points_awarded} EP
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredSubmissions.length === 0 && (
        <div className="text-center py-12 sm:py-16 px-4">
          <div className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 rounded-xl p-8 sm:p-12 max-w-md mx-auto">
            <p className="text-muted-foreground text-base sm:text-lg mb-2">No entries found for this category.</p>
            <p className="text-sm text-muted-foreground">Try selecting a different filter above.</p>
          </div>
        </div>
      )}
    </>
  )
}
