import { Suspense } from "react"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Trophy, UserPlus, FileText, Heart, Clock, Users, TrendingUp } from 'lucide-react'
import Link from "next/link"
import { revalidatePath } from "next/cache"
import { Navbar } from "@/components/navbar"
import { LikeButton } from "@/components/like-button"
import { ImageViewer } from "@/components/image-viewer"
import { getAvatarColor } from "@/lib/utils"
import { MediaCarousel } from "@/components/media-carousel"

interface ActivityItem {
  id: string
  type: "mission_completed" | "mission_submitted" | "user_joined" | "points_earned" | "profile_updated"
  user_name: string
  user_avatar?: string
  user_id?: string // Added user_id to enable profile linking
  mission_title?: string
  mission_type?: string
  mission_number?: number
  mission_points_value?: number
  points?: number
  created_at: string
  mission_id?: string
  submission_id?: string
  text_submission?: string
  media_url?: string
  likes_count?: number
  user_has_liked?: boolean
  likes_users?: Array<{ user_id: string; user_name: string; user_avatar?: string }>
  answers?: Record<string, unknown>
  submission_schema?: {
    questions?: Array<{
      field_name?: string
      name?: string
      label?: string
      helperText?: string
      helper_text?: string
      description?: string
    }>
    fields?: Array<{
      field_name?: string
      name?: string
      label?: string
      helperText?: string
      helper_text?: string
      description?: string
    }>
  }
  profile_changes?: string[]
}

async function getRecentActivity(page: number): Promise<ActivityItem[]> {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const ITEMS_PER_PAGE = 20
  const startRange = (page - 1) * ITEMS_PER_PAGE
  const endRange = startRange + ITEMS_PER_PAGE - 1

  const { data: submissions, error: submissionsError } = await supabase
    .from("submissions")
    .select("id, created_at, status, points_awarded, text_submission, media_url, user_id, mission_id, answers")
    .order("created_at", { ascending: false })
    .range(startRange, endRange)

  const { data: profileActivities, error: profileActivitiesError } = await supabase
    .from("profile_activities")
    .select("id, created_at, user_id, changed_fields")
    .eq("activity_type", "profile_updated")
    .order("created_at", { ascending: false })
    .limit(10)

  if (!submissions || submissions.length === 0) {
    return []
  }

  const userIds = [...new Set(submissions.map((s) => s.user_id))]
  const missionIds = [...new Set(submissions.map((s) => s.mission_id))]

  const [{ data: profiles }, { data: missions }] = await Promise.all([
    supabase.from("profiles").select("id, name, avatar_url").in("id", userIds),
    supabase
      .from("missions")
      .select("id, title, submission_schema, type, mission_number, points_value")
      .in("id", missionIds),
  ])

  const profilesMap = new Map(profiles?.map((p) => [p.id, p]) || [])
  const missionsMap = new Map(missions?.map((m) => [m.id, m]) || [])

  const submissionIds = submissions.map((s) => s.id)

  const { data: likesData, error: likesError } = await supabase
    .from("likes")
    .select("submission_id, user_id, profiles!inner(name, avatar_url)")
    .in("submission_id", submissionIds)

  const likesCount =
    likesData?.reduce(
      (acc, like) => {
        acc[like.submission_id] = (acc[like.submission_id] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    ) || {}

  const likesUsers =
    likesData?.reduce(
      (acc, like) => {
        if (!acc[like.submission_id]) {
          acc[like.submission_id] = []
        }
        acc[like.submission_id].push({
          user_id: like.user_id,
          user_name: like.profiles?.name || "Anonymous",
          user_avatar: like.profiles?.avatar_url,
        })
        return acc
      },
      {} as Record<string, Array<{ user_id: string; user_name: string; user_avatar?: string }>>,
    ) || {}

  const userLikes = new Set(
    likesData?.filter((like) => like.user_id === user?.id).map((like) => like.submission_id) || [],
  )

  const { data: newUsers } = await supabase
    .from("profiles")
    .select("id, name, avatar_url, created_at")
    .order("created_at", { ascending: false })
    .limit(10)

  const activities: ActivityItem[] = []

  submissions.forEach(
    (submission: {
      id: string
      user_id: string
      mission_id: string
      status: string
      points_awarded: number
      created_at: string
      text_submission: string | null
      media_url: string | null
      answers: Record<string, unknown> | null
    }) => {
      const profile = profilesMap.get(submission.user_id)
      const mission = missionsMap.get(submission.mission_id)

      if (!profile || !mission) return

      if (submission.status === "approved") {
        activities.push({
          id: `completed-${submission.id}`,
          type: "mission_completed",
          user_name: profile.name || "Anonymous",
          user_avatar: profile.avatar_url,
          user_id: submission.user_id,
          mission_title: mission.title,
          mission_type: mission.type,
          mission_number: mission.mission_number,
          mission_points_value: mission.points_value,
          points: submission.points_awarded,
          created_at: submission.created_at,
          mission_id: mission.id,
          submission_id: submission.id,
          text_submission: submission.text_submission,
          media_url: submission.media_url,
          likes_count: likesCount[submission.id] || 0,
          user_has_liked: userLikes.has(submission.id),
          likes_users: likesUsers[submission.id] || [],
          answers: submission.answers,
          submission_schema: mission.submission_schema,
        })
      } else {
        activities.push({
          id: `submitted-${submission.id}`,
          type: "mission_submitted",
          user_name: profile.name || "Anonymous",
          user_avatar: profile.avatar_url,
          user_id: submission.user_id,
          mission_title: mission.title,
          mission_type: mission.type,
          mission_number: mission.mission_number,
          mission_points_value: mission.points_value,
          created_at: submission.created_at,
          mission_id: mission.id,
          submission_id: submission.id,
          text_submission: submission.text_submission,
          media_url: submission.media_url,
          likes_count: likesCount[submission.id] || 0,
          user_has_liked: userLikes.has(submission.id),
          likes_users: likesUsers[submission.id] || [],
          answers: submission.answers,
          submission_schema: mission.submission_schema,
        })
      }
    },
  )

  if (profileActivities && profileActivities.length > 0) {
    profileActivities.forEach(
      (activity: {
        id: string
        user_id: string
        created_at: string
        changed_fields: string[]
      }) => {
        const profile = profilesMap.get(activity.user_id)

        if (profile) {
          activities.push({
            id: `profile-${activity.id}`,
            type: "profile_updated",
            user_name: profile.name || "Anonymous",
            user_avatar: profile.avatar_url,
            user_id: activity.user_id,
            created_at: activity.created_at,
            profile_changes: activity.changed_fields,
          })
        }
      },
    )
  }

  if (newUsers) {
    newUsers.forEach(
      (user: {
        id: string
        name: string
        avatar_url: string | null
        created_at: string
      }) => {
        activities.push({
          id: `joined-${user.id}`,
          type: "user_joined",
          user_name: user.name || "New Member",
          user_avatar: user.avatar_url,
          user_id: user.id,
          created_at: user.created_at,
        })
      },
    )
  }

  const finalActivities = activities
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 30)

  return finalActivities
}

async function getCommunityStats() {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {}
        },
      },
    },
  )

  const { count: totalCompletedActivities } = await supabase
    .from("submissions")
    .select("*", { count: "exact", head: true })
    .eq("status", "approved")

  const { count: totalCommunityMembers } = await supabase.from("profiles").select("*", { count: "exact", head: true })

  const { data: profilesWithPoints } = await supabase.from("profiles").select("total_points")

  const totalCommunityPoints = profilesWithPoints?.reduce((sum, profile) => sum + (profile.total_points || 0), 0) || 0

  return {
    totalCompletedActivities: totalCompletedActivities || 0,
    totalCommunityMembers: totalCommunityMembers || 0,
    totalCommunityPoints,
  }
}

function ActivityIcon({ type }: { type: ActivityItem["type"] }) {
  switch (type) {
    case "mission_completed":
      return <Trophy className="h-5 w-5 text-accent" />
    case "mission_submitted":
      return <FileText className="h-5 w-5 text-primary" />
    case "user_joined":
      return <UserPlus className="h-5 w-5 text-secondary" />
    case "points_earned":
      return <Heart className="h-5 w-5 text-accent" />
    case "profile_updated":
      return <UserPlus className="h-5 w-5 text-blue-500" />
    default:
      return <Clock className="h-5 w-5 text-muted-foreground" />
  }
}

async function toggleLike(submissionId: string, userHasLiked: boolean) {
  "use server"
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {}
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: "User not authenticated" }
  }

  try {
    if (userHasLiked) {
      const { error } = await supabase.from("likes").delete().eq("user_id", user.id).eq("submission_id", submissionId)
      if (error) throw error
    } else {
      const { error } = await supabase.from("likes").insert({ user_id: user.id, submission_id: submissionId })
      if (error) throw error
    }

    revalidatePath("/activity")
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

function AnswersDisplay({
  answers,
  submissionSchema,
}: { answers: Record<string, unknown>; submissionSchema: ActivityItem["submission_schema"] }) {
  if (!answers || typeof answers !== "object" || Object.keys(answers).length === 0) {
    return null
  }

  const schemaQuestions = submissionSchema?.questions || submissionSchema?.fields || []

  if (!schemaQuestions || schemaQuestions.length === 0) {
    const answerKeys = Object.keys(answers)
    return (
      <div className="space-y-3">
        {answerKeys.map((key) => {
          const answer = answers[key]
          if (!answer || (typeof answer === "string" && answer.trim() === "")) return null

          const questionLabel = key

          return (
            <div key={key} className="bg-muted/30 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-primary">{questionLabel}</span>
              </div>
              <div className="bg-background/50 rounded-md p-2 border border-muted/50">
                <p className="text-xs text-muted-foreground mb-1">Response:</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {typeof answer === "string" ? answer : JSON.stringify(answer, null, 2)}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {schemaQuestions.map((question, index: number) => {
        const fieldName = question.field_name || question.name || question.label
        const answer = answers[fieldName]

        if (!answer || (typeof answer === "string" && answer.trim() === "")) return null

        const questionLabel = question.label || fieldName

        const questionHelperText = question.helperText || question.helper_text || question.description

        return (
          <div key={fieldName} className="bg-muted/30 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-primary">{questionLabel}</span>
            </div>

            {questionHelperText && questionHelperText !== question.label && (
              <p className="text-sm text-muted-foreground">{questionHelperText}</p>
            )}

            <div className="bg-background/50 rounded-md p-2 border border-muted/50">
              <p className="text-xs text-muted-foreground mb-1">Response:</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {typeof answer === "string" ? answer : JSON.stringify(answer, null, 2)}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function LikesDisplay({
  likesUsers,
  likesCount,
}: {
  likesUsers: Array<{ user_id: string; user_name: string; user_avatar?: string }>
  likesCount: number
}) {
  if (likesCount === 0) return null

  return (
    <div className="text-xs text-muted-foreground">
      {likesCount === 1 ? (
        <span>
          Liked by{" "}
          {likesUsers[0]?.user_id ? (
            <Link
              href={`/user/${likesUsers[0].user_id}`}
              className="font-medium hover:text-primary hover:underline transition-colors"
            >
              {likesUsers[0].user_name}
            </Link>
          ) : (
            <span className="font-medium">{likesUsers[0]?.user_name}</span>
          )}
        </span>
      ) : likesCount === 2 ? (
        <span>
          Liked by{" "}
          {likesUsers[0]?.user_id ? (
            <Link
              href={`/user/${likesUsers[0].user_id}`}
              className="font-medium hover:text-primary hover:underline transition-colors"
            >
              {likesUsers[0].user_name}
            </Link>
          ) : (
            <span className="font-medium">{likesUsers[0]?.user_name}</span>
          )}{" "}
          and{" "}
          {likesUsers[1]?.user_id ? (
            <Link
              href={`/user/${likesUsers[1].user_id}`}
              className="font-medium hover:text-primary hover:underline transition-colors"
            >
              {likesUsers[1].user_name}
            </Link>
          ) : (
            <span className="font-medium">{likesUsers[1]?.user_name}</span>
          )}
        </span>
      ) : (
        <span>
          Liked by{" "}
          {likesUsers[0]?.user_id ? (
            <Link
              href={`/user/${likesUsers[0].user_id}`}
              className="font-medium hover:text-primary hover:underline transition-colors"
            >
              {likesUsers[0].user_name}
            </Link>
          ) : (
            <span className="font-medium">{likesUsers[0]?.user_name}</span>
          )}{" "}
          and {likesCount - 1} other{likesCount > 2 ? "s" : ""}
        </span>
      )}
    </div>
  )
}

function ActivityDescription({ activity }: { activity: ActivityItem }) {
  const mediaUrls: string[] = (() => {
    if (!activity.media_url) return []
    try {
      return typeof activity.media_url === 'string'
        ? JSON.parse(activity.media_url)
        : Array.isArray(activity.media_url)
          ? activity.media_url
          : []
    } catch {
      return activity.media_url ? [activity.media_url] : []
    }
  })()

  switch (activity.type) {
    case "mission_completed":
    case "mission_submitted":
      return (
        <div className="flex-1 space-y-3">
          <div className="space-y-1">
            <p className="text-sm leading-relaxed">
              {activity.user_id ? (
                <Link
                  href={`/user/${activity.user_id}`}
                  className="font-semibold hover:text-primary hover:underline transition-colors"
                >
                  {activity.user_name}
                </Link>
              ) : (
                <span className="font-semibold">{activity.user_name}</span>
              )}{" "}
              <span className="text-muted-foreground">
                {activity.type === "mission_completed" ? "completed" : "submitted"}
              </span>
            </p>
            
            {activity.mission_id ? (
              <Link 
                href={`/mission/${activity.mission_id}`} 
                className="inline-block group"
              >
                <div className="bg-primary/5 hover:bg-primary/10 rounded-lg px-3 py-2 transition-colors border border-primary/20">
                  <p className="text-sm font-medium text-primary group-hover:underline">
                    {activity.mission_type && activity.mission_number && (
                      <span className="text-xs opacity-80">
                        {activity.mission_type} #{Math.floor(activity.mission_number)} •{" "}
                      </span>
                    )}
                    {activity.mission_title}
                    {activity.mission_points_value && (
                      <span className="ml-2 text-xs font-bold text-accent">
                        +{activity.mission_points_value} EP
                      </span>
                    )}
                  </p>
                </div>
              </Link>
            ) : (
              <div className="bg-primary/5 rounded-lg px-3 py-2 border border-primary/20">
                <p className="text-sm font-medium text-primary">
                  {activity.mission_type && activity.mission_number && (
                    <span className="text-xs opacity-80">
                      {activity.mission_type} #{Math.floor(activity.mission_number)} •{" "}
                    </span>
                  )}
                  {activity.mission_title}
                  {activity.mission_points_value && (
                    <span className="ml-2 text-xs font-bold text-accent">
                      +{activity.mission_points_value} EP
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>

          {activity.answers && activity.submission_schema ? (
            <div className="pt-2">
              <AnswersDisplay answers={activity.answers} submissionSchema={activity.submission_schema} />
            </div>
          ) : activity.text_submission ? (
            <div className="bg-muted/30 rounded-lg p-4 border border-muted/50">
              <p className="text-sm leading-relaxed line-clamp-4 text-foreground/90">
                {activity.text_submission}
              </p>
            </div>
          ) : null}

          {mediaUrls.length > 0 && (
            <div className="rounded-xl overflow-hidden border border-muted/30 bg-muted/5">
              <MediaCarousel 
                mediaUrls={mediaUrls} 
                className="w-full max-w-md mx-auto"
                showControls={true}
              />
            </div>
          )}

          <div className="flex items-center justify-between gap-4 pt-2">
            <div className="flex items-center gap-2 flex-wrap">
              {activity.points && activity.type === "mission_completed" && (
                <Badge variant="secondary" className="font-semibold">
                  +{activity.points} EP
                </Badge>
              )}
              {activity.type === "mission_submitted" && (
                <Badge variant="outline" className="text-xs">
                  Pending Review
                </Badge>
              )}
            </div>

            {activity.submission_id && (
              <div className="flex-shrink-0">
                <LikeButton
                  submissionId={activity.submission_id}
                  likesCount={activity.likes_count || 0}
                  userHasLiked={activity.user_has_liked || false}
                  onToggleLike={toggleLike}
                />
              </div>
            )}
          </div>

          {activity.likes_users &&
            activity.likes_users.length > 0 &&
            activity.likes_count &&
            activity.likes_count > 0 && (
              <div className="pt-1 border-t border-muted/30">
                <LikesDisplay likesUsers={activity.likes_users} likesCount={activity.likes_count} />
              </div>
            )}
        </div>
      )
    case "user_joined":
      return (
        <div className="flex-1">
          <p className="text-sm">
            {activity.user_id ? (
              <Link
                href={`/user/${activity.user_id}`}
                className="font-medium hover:text-primary hover:underline transition-colors"
              >
                {activity.user_name}
              </Link>
            ) : (
              <span className="font-medium">{activity.user_name}</span>
            )}{" "}
            joined the community
          </p>
          <Badge variant="secondary" className="mt-1">
            Welcome!
          </Badge>
        </div>
      )
    case "profile_updated":
      return (
        <div className="flex-1">
          <p className="text-sm">
            {activity.user_id ? (
              <Link
                href={`/user/${activity.user_id}`}
                className="font-medium hover:text-primary hover:underline transition-colors"
              >
                {activity.user_name}
              </Link>
            ) : (
              <span className="font-medium">{activity.user_name}</span>
            )}{" "}
            updated their profile
            {activity.profile_changes && activity.profile_changes.length > 0 && (
              <span className="text-muted-foreground"> ({activity.profile_changes.join(", ")})</span>
            )}
          </p>
          <Badge variant="outline" className="mt-1">
            Profile Updated
          </Badge>
        </div>
      )
    default:
      return (
        <div className="flex-1">
          <p className="text-sm">Unknown activity</p>
        </div>
      )
  }
}

function ActivityFeed({ activities }: { activities: ActivityItem[] }) {
  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <Card key={activity.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              {activity.user_id ? (
                <Link href={`/user/${activity.user_id}`}>
                  <Avatar className="h-10 w-10 flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all">
                    <AvatarImage src={activity.user_avatar || undefined} />
                    <AvatarFallback className={getAvatarColor(activity.user_id, activity.user_name)}>
                      {activity.user_name
                        ?.split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                </Link>
              ) : (
                <Avatar className="h-10 w-10 flex-shrink-0">
                  <AvatarImage src={activity.user_avatar || undefined} />
                  <AvatarFallback className={getAvatarColor(undefined, activity.user_name)}>
                    {activity.user_name
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2">
                  <ActivityIcon type={activity.type} />
                  <ActivityDescription activity={activity} />
                </div>
              </div>

              <div className="text-xs text-muted-foreground flex-shrink-0">{formatTimeAgo(activity.created_at)}</div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function formatTimeAgo(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return "Just now"
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`

  return date.toLocaleDateString()
}

function ActivityStats({
  communityStats,
}: {
  communityStats: {
    totalCompletedActivities: number
    totalCommunityMembers: number
    totalCommunityPoints: number
  }
}) {
  return (
    <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-8 sm:mb-12">
      <Card className="hover:scale-105 transition-transform touch-manipulation">
        <CardContent className="p-4 sm:p-6 text-center">
          <Trophy className="h-8 w-8 sm:h-10 sm:w-10 text-accent mx-auto mb-2 sm:mb-3" />
          <div className="text-xl sm:text-2xl lg:text-3xl font-bold">{communityStats.totalCompletedActivities}</div>
          <div className="text-xs sm:text-sm text-muted-foreground leading-tight mt-1">Activities completed</div>
        </CardContent>
      </Card>

      <Card className="hover:scale-105 transition-transform touch-manipulation">
        <CardContent className="p-4 sm:p-6 text-center">
          <Users className="h-8 w-8 sm:h-10 sm:w-10 mx-auto mb-2 sm:mb-3 text-accent" />
          <div className="text-xl sm:text-2xl lg:text-3xl font-bold">{communityStats.totalCommunityMembers}</div>
          <div className="text-xs sm:text-sm text-muted-foreground leading-tight mt-1">Community members</div>
        </CardContent>
      </Card>

      <Card className="hover:scale-105 transition-transform touch-manipulation">
        <CardContent className="p-4 sm:p-6 text-center">
          <TrendingUp className="h-8 w-8 sm:h-10 sm:w-10 text-accent mx-auto mb-2 sm:mb-3" />
          <div className="text-xl sm:text-2xl lg:text-3xl font-bold">{communityStats.totalCommunityPoints}</div>
          <div className="text-xs sm:text-sm text-muted-foreground leading-tight mt-1">Combined EP earned</div>
        </CardContent>
      </Card>
    </div>
  )
}

export default async function ActivityPage() {
  const [activities, communityStats] = await Promise.all([getRecentActivity(1), getCommunityStats()])

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-4 sm:left-10 w-48 h-48 sm:w-72 sm:h-72 bg-primary/5 sm:bg-primary/10 rounded-full blur-2xl sm:blur-3xl animate-pulse"></div>
        <div
          className="absolute top-40 right-4 sm:right-20 w-64 h-64 sm:w-96 sm:h-96 bg-secondary/5 sm:bg-secondary/10 rounded-full blur-2xl sm:blur-3xl animate-pulse"
          style={{ animationDelay: "2s" }}
        ></div>
        <div
          className="absolute bottom-20 left-1/4 sm:left-1/3 w-56 h-56 sm:w-80 sm:h-80 bg-accent/5 sm:bg-accent/10 rounded-full blur-2xl sm:blur-3xl animate-pulse"
          style={{ animationDelay: "4s" }}
        ></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 max-w-7xl">
        <Navbar />

        <main className="pb-8 sm:pb-12">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="everyone-heading text-3xl sm:text-4xl lg:text-5xl mb-4">Community Activity</h1>
              <p className="everyone-subheading text-lg sm:text-xl text-muted-foreground mb-6">
                See what your community is up to!
              </p>
            </div>

            <ActivityStats communityStats={communityStats} />

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Suspense
                  fallback={
                    <div className="space-y-4">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="animate-pulse">
                          <div className="flex items-start gap-3">
                            <div className="h-10 w-10 bg-muted rounded-full"></div>
                            <div className="flex-1">
                              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                              <div className="h-3 bg-muted rounded w-1/2"></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  }
                >
                  <ActivityFeed activities={activities} />
                </Suspense>

                {activities.length === 0 && (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No recent activity</h3>
                    <p className="text-muted-foreground mb-4">
                      Be the first to complete a mission and get the community started!
                    </p>
                    <Button asChild>
                      <Link href="/">Browse Missions</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
