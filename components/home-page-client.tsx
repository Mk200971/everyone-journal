"use client"

import {
  Sparkles,
  BookOpen,
  Video,
  FileText,
  Headphones,
  ExternalLink,
  Trophy,
  Users,
  Briefcase,
  CheckCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { MissionCard } from "@/components/mission-card"
import { MissionFilter } from "@/components/mission-filter"
import { useState, useEffect, useMemo, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { fetchAllCommunityActivity } from "@/lib/actions"
import { getAvatarColor } from "@/lib/utils"

interface Mission {
  id: string
  title: string
  description: string
  points_value: number
  type?: string
  image_url?: string
  duration?: string
  coordinator?: string
  support_status?: string
  due_date?: string
  mission_number?: number
  resources?: Resource[]
}

interface Resource {
  id: string
  title: string
  description: string
  type: string
  url: string
  created_at: string
}

interface RecentActivity {
  id: string
  created_at: string
  points_awarded: number
  user_name: string
  mission_title: string
  user_avatar_url: string | null
  user_id?: string
  status: string
  type?: string
  changed_fields?: string[]
  mission_id?: string
}

interface LeaderboardEntry {
  id: string
  name: string
  avatar_url: string | null
  total_points: number
  rank: number
  job_title?: string
  department?: string
  activityCount?: number
}

interface HomePageData {
  missions: Mission[]
  resources: Resource[]
  recentActivity: RecentActivity[]
  topUsers: LeaderboardEntry[]
  user: any
  userProfile: { name: string } | null
}

interface HomePageClientProps {
  initialData: HomePageData
}

export function HomePageClient({ initialData }: HomePageClientProps) {
  const [missions, setMissions] = useState<Mission[]>(initialData.missions)
  const [resources, setResources] = useState<Resource[]>(initialData.resources)
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>(initialData.recentActivity)
  const [topUsers, setTopUsers] = useState<LeaderboardEntry[]>(initialData.topUsers)
  const [selectedType, setSelectedType] = useState("All")
  const [selectedResourceType, setSelectedResourceType] = useState("All Resources")
  const [isHydrated, setIsHydrated] = useState(false)
  const [userSubmissions, setUserSubmissions] = useState<Record<string, any[]>>({})

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    if (!initialData.user || !isHydrated) return

    const supabase = createClient()
    let mounted = true

    const fetchRecentActivity = async () => {
      if (!mounted) return
      try {
        const result = await fetchAllCommunityActivity()
        if (mounted && result.success) {
          setRecentActivity(result.data)
        }
      } catch (error) {
        console.error("Error fetching activity:", error)
      }
    }

    const fetchTopUsers = async () => {
      if (!mounted) return
      try {
        const { data: profiles, error } = await supabase
          .from("profiles")
          .select(`
            id, 
            name, 
            avatar_url, 
            total_points,
            job_title,
            department
          `)
          .order("total_points", { ascending: false })
          .limit(3)

        if (mounted && !error && profiles) {
          const profilesWithActivity = await Promise.all(
            profiles.map(async (profile) => {
              const { count } = await supabase
                .from("submissions")
                .select("id", { count: "exact", head: true })
                .eq("user_id", profile.id)
                .eq("status", "approved")

              return {
                ...profile,
                rank: profiles.indexOf(profile) + 1,
                activityCount: count || 0,
              }
            }),
          )
          setTopUsers(profilesWithActivity)
        }
      } catch (error) {
        console.error("Error fetching top users:", error)
      }
    }

    const fetchUserSubmissions = async () => {
      if (!mounted) return
      try {
        const { data, error } = await supabase
          .from("submissions")
          .select("id, mission_id, status, created_at")
          .eq("user_id", initialData.user.id)

        if (mounted && !error && data) {
          const submissionsByMission = data.reduce(
            (acc, submission) => {
              if (!acc[submission.mission_id]) {
                acc[submission.mission_id] = []
              }
              acc[submission.mission_id].push(submission)
              return acc
            },
            {} as Record<string, any[]>,
          )
          setUserSubmissions(submissionsByMission)
        }
      } catch (error) {
        console.error("Error fetching user submissions:", error)
      }
    }

    fetchUserSubmissions()

    const submissionsChannel = supabase
      .channel("public:submissions")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "submissions",
        },
        () => {
          if (mounted) {
            fetchRecentActivity()
            fetchUserSubmissions()
          }
        },
      )
      .subscribe()

    const profilesChannel = supabase
      .channel("public:profiles")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
        },
        () => {
          if (mounted) {
            fetchTopUsers()
            fetchRecentActivity()
          }
        },
      )
      .subscribe()

    return () => {
      mounted = false
      submissionsChannel.unsubscribe()
      profilesChannel.unsubscribe()
    }
  }, [initialData.user, isHydrated])

  const filteredMissions = useMemo(
    () =>
      selectedType === "All"
        ? missions
        : missions.filter((mission) => mission.type?.toLowerCase() === selectedType.toLowerCase()),
    [missions, selectedType],
  )

  const filteredResources = useMemo(() => {
    if (selectedResourceType === "All Resources") {
      return resources
    }

    return resources.filter((resource) => {
      const typeMap: { [key: string]: string } = {
        Books: "book",
        Videos: "video",
        Articles: "article",
        Podcasts: "podcast",
      }
      const dbType = typeMap[selectedResourceType] || selectedResourceType.toLowerCase()
      return resource.type.toLowerCase() === dbType
    })
  }, [resources, selectedResourceType])

  const missionCounts = useMemo(() => {
    const counts: Record<string, number> = {
      All: missions.length,
    }

    missions.forEach((mission) => {
      if (mission.type) {
        const type = mission.type.charAt(0).toUpperCase() + mission.type.slice(1)
        counts[type] = (counts[type] || 0) + 1
      }
    })

    return counts
  }, [missions])

  const resourceCounts = useMemo(
    () => ({
      "All Resources": resources.length,
      Books: resources.filter((r) => r.type.toLowerCase() === "book").length,
      Videos: resources.filter((r) => r.type.toLowerCase() === "video").length,
      Articles: resources.filter((r) => r.type.toLowerCase() === "article").length,
      Podcasts: resources.filter((r) => r.type.toLowerCase() === "podcast").length,
    }),
    [resources],
  )

  const formatRelativeTime = useCallback((dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

    if (diffInMinutes < 60) {
      return `${diffInMinutes} minutes ago`
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60)
      return `${hours} hour${hours > 1 ? "s" : ""} ago`
    } else {
      const days = Math.floor(diffInMinutes / 1440)
      return `${days} day${days > 1 ? "s" : ""} ago`
    }
  }, [])

  const getTypeConfig = useCallback((type: string) => {
    const lowerType = type.toLowerCase()
    switch (lowerType) {
      case "book":
        return {
          icon: <BookOpen className="h-4 w-4" />,
          color: "bg-blue-600/30 text-blue-800 dark:text-blue-200 border-blue-600/50 shadow-blue-500/20 shadow-sm",
        }
      case "video":
        return {
          icon: <Video className="h-4 w-4" />,
          color: "bg-red-600/30 text-red-800 dark:text-red-200 border-red-600/50 shadow-red-500/20 shadow-sm",
        }
      case "article":
        return {
          icon: <FileText className="h-4 w-4" />,
          color: "bg-green-600/30 text-green-800 dark:text-green-200 border-green-600/50 shadow-green-500/20 shadow-sm",
        }
      case "podcast":
        return {
          icon: <Headphones className="h-4 w-4" />,
          color:
            "bg-purple-600/30 text-purple-800 dark:text-purple-200 border-purple-600/50 shadow-purple-500/20 shadow-sm",
        }
      default:
        return {
          icon: <FileText className="h-4 w-4" />,
          color: "bg-gray-600/30 text-gray-800 dark:text-gray-200 border-gray-600/50 shadow-gray-500/20 shadow-sm",
        }
    }
  }, [])

  const missionsWithSubmissions = useMemo(() => {
    return filteredMissions.map((mission) => ({
      ...mission,
      userSubmissions: userSubmissions[mission.id] || [],
    }))
  }, [filteredMissions, userSubmissions])

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-8 sm:mb-10">
        {recentActivity.length > 0 && (
          <Card className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10">
            <CardHeader className="p-4 sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <CardTitle className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2 min-w-0">
                  <Users className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0" aria-hidden="true" />
                  <span className="text-balance">Recent Community Activity</span>
                </CardTitle>
                <Link href="/activity" aria-label="View all community activity">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-primary hover:text-primary/80 hover:bg-primary/10 h-9 px-3 text-sm flex-shrink-0"
                  >
                    <span className="hidden sm:inline">View all</span>
                    <span className="sm:hidden">All</span>
                    <ExternalLink className="h-3 w-3 ml-1" aria-hidden="true" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="space-y-3" role="list" aria-label="Recent community activities">
                {recentActivity.slice(0, 5).map((activity, index) => (
                  <div
                    key={activity.id}
                    role="listitem"
                    className={`flex items-center gap-3 p-3 bg-white/5 dark:bg-black/10 rounded-lg border border-white/10 dark:border-white/5 hover:bg-white/10 dark:hover:bg-black/20 transition-colors ${
                      index >= 3 ? "hidden lg:flex" : ""
                    }`}
                  >
                    {activity.user_id ? (
                      <Link href={`/user/${activity.user_id}`} aria-label={`View ${activity.user_name}'s profile`}>
                        <Avatar className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all">
                          <AvatarImage src={activity.user_avatar_url || undefined} alt={activity.user_name} />
                          <AvatarFallback className={getAvatarColor(activity.user_id, activity.user_name)}>
                            {activity.user_name
                              ?.split(" ")
                              .map((n) => n[0])
                              .join("") || "U"}
                          </AvatarFallback>
                        </Avatar>
                      </Link>
                    ) : (
                      <Avatar className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0">
                        <AvatarImage src={activity.user_avatar_url || undefined} alt={activity.user_name} />
                        <AvatarFallback className={getAvatarColor(undefined, activity.user_name)}>
                          {activity.user_name
                            ?.split(" ")
                            .map((n) => n[0])
                            .join("") || "U"}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm sm:text-base text-foreground">
                        {activity.user_id ? (
                          <Link
                            href={`/user/${activity.user_id}`}
                            className="font-medium hover:text-primary hover:underline transition-colors"
                          >
                            {activity.user_name}
                          </Link>
                        ) : (
                          <span className="font-medium">{activity.user_name}</span>
                        )}
                        {activity.type === "profile_update" ? (
                          <>
                            {" updated their profile"}
                            {activity.changed_fields && activity.changed_fields.length > 0 && (
                              <span className="text-muted-foreground"> ({activity.changed_fields.join(", ")})</span>
                            )}
                          </>
                        ) : (
                          <>
                            {" completed "}
                            {activity.mission_id ? (
                              <Link
                                href={`/mission/${activity.mission_id}`}
                                className="font-medium text-primary break-words hover:underline transition-colors"
                              >
                                '{activity.mission_title}'
                              </Link>
                            ) : (
                              <span className="font-medium text-primary break-words">'{activity.mission_title}'</span>
                            )}
                          </>
                        )}
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {formatRelativeTime(activity.created_at)}
                        {activity.type !== "profile_update" && activity.points_awarded > 0 && (
                          <> • +{activity.points_awarded} EP</>
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {topUsers.length > 0 && (
          <Card className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10">
            <CardHeader className="p-4 sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <CardTitle className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2 min-w-0">
                  <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-accent flex-shrink-0" aria-hidden="true" />
                  <span>Leaderboard</span>
                </CardTitle>
                <Link href="/leaderboard" aria-label="View full leaderboard">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-primary hover:text-primary/80 hover:bg-primary/10 h-9 px-3 text-sm flex-shrink-0"
                  >
                    <span className="hidden sm:inline">View all</span>
                    <span className="sm:hidden">All</span>
                    <ExternalLink className="h-3 w-3 ml-1" aria-hidden="true" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="space-y-3" role="list" aria-label="Top users leaderboard">
                {topUsers.map((user, index) => {
                  const getMedalEmoji = (rank: number) => {
                    switch (rank) {
                      case 1:
                        return "🥇"
                      case 2:
                        return "🥈"
                      case 3:
                        return "🥉"
                      default:
                        return null
                    }
                  }

                  const getRankText = (rank: number) => {
                    switch (rank) {
                      case 1:
                        return "1st"
                      case 2:
                        return "2nd"
                      case 3:
                        return "3rd"
                      default:
                        return `${rank}th`
                    }
                  }

                  const medal = getMedalEmoji(user.rank)

                  return (
                    <div
                      key={user.id}
                      role="listitem"
                      className="flex items-center sm:items-start gap-3 sm:gap-4 p-3 sm:p-4 bg-white/5 dark:bg-black/10 rounded-lg border border-white/10 dark:border-white/5 hover:bg-white/10 dark:hover:bg-black/20 transition-colors"
                    >
                      <div className="flex flex-col items-center gap-2 flex-shrink-0">
                        <Link href={`/user/${user.id}`} aria-label={`View ${user.name}'s profile`}>
                          <Avatar className="w-12 h-12 sm:w-14 sm:h-14 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all">
                            <AvatarImage src={user.avatar_url || undefined} alt={user.name} />
                            <AvatarFallback className={getAvatarColor(user.id, user.name)}>
                              {user.name
                                ?.split(" ")
                                .map((n) => n[0])
                                .join("") || "U"}
                            </AvatarFallback>
                          </Avatar>
                        </Link>

                        <div
                          className="flex items-center justify-center"
                          aria-label={`Rank: ${getRankText(user.rank)}`}
                        >
                          {medal ? (
                            <div
                              className="text-3xl sm:text-4xl"
                              role="img"
                              aria-label={`${getRankText(user.rank)} place medal`}
                            >
                              {medal}
                            </div>
                          ) : (
                            <div className="bg-primary text-primary-foreground rounded-full w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center font-bold text-sm sm:text-base shadow-lg">
                              {getRankText(user.rank)}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <Link
                            href={`/user/${user.id}`}
                            className="font-semibold text-foreground hover:text-primary hover:underline transition-colors text-sm sm:text-base text-balance leading-tight"
                          >
                            {user.name}
                          </Link>
                          <div className="bg-primary text-primary-foreground px-2.5 py-1 rounded-full text-xs font-bold flex-shrink-0 whitespace-nowrap leading-none">
                            {user.total_points} EP
                          </div>
                        </div>

                        <div className="space-y-0.5">
                          {user.job_title && (
                            <p className="text-xs sm:text-sm text-muted-foreground text-pretty leading-snug">
                              <span className="inline-flex items-center gap-1.5">
                                <Briefcase className="h-3 w-3 text-primary/70 flex-shrink-0" aria-hidden="true" />
                                <span className="break-words">{user.job_title}</span>
                              </span>
                            </p>
                          )}

                          {user.department && (
                            <p className="text-xs text-muted-foreground">
                              <span className="inline-flex items-center gap-1.5">
                                <Users className="h-3 w-3 text-primary/70 flex-shrink-0" aria-hidden="true" />
                                <span className="break-words">{user.department}</span>
                              </span>
                            </p>
                          )}

                          <p className="text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1.5">
                              <CheckCircle className="h-3 w-3 text-primary/70 flex-shrink-0" aria-hidden="true" />
                              <span className="whitespace-nowrap">{user.activityCount} Activities completed</span>
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="mb-8 sm:mb-10">
        <MissionFilter
          selectedType={selectedType}
          onTypeChange={setSelectedType}
          missionCounts={missionCounts}
          showAllButton={true}
        />
      </div>

      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 mb-8 sm:mb-12"
        data-missions-section
        role="list"
        aria-label="Available missions"
      >
        {missionsWithSubmissions.map((mission, index) => (
          <div
            key={mission.id}
            role="listitem"
            className="animate-in fade-in slide-in-from-bottom-4"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <MissionCard mission={mission} />
          </div>
        ))}
      </div>

      {resources.length > 0 && (
        <section className="mb-8 sm:mb-10" aria-labelledby="resources-heading">
          <div className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 rounded-xl p-6 sm:p-8 mb-6 sm:mb-8">
            <div className="flex items-center justify-between gap-4 mb-3 sm:mb-4">
              <h2
                id="resources-heading"
                className="everyone-heading text-xl sm:text-2xl lg:text-3xl xl:text-4xl text-balance leading-tight flex items-center gap-2 min-w-0 flex-1"
              >
                <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0" aria-hidden="true" />
                <span>Learning Resources</span>
              </h2>
              <Link href="/resources" aria-label="View all learning resources">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary hover:text-primary/80 hover:bg-primary/10 h-9 px-3 text-sm flex-shrink-0"
                >
                  <span className="hidden sm:inline">View all</span>
                  <span className="sm:hidden">All</span>
                  <ExternalLink className="h-3 w-3 ml-1" aria-hidden="true" />
                </Button>
              </Link>
            </div>
          </div>

          <div className="mb-6 sm:mb-8" role="group" aria-label="Filter resources by type">
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {["All Resources", "Books", "Videos", "Articles", "Podcasts"].map((type) => (
                <Button
                  key={type}
                  variant={selectedResourceType === type ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedResourceType(type)}
                  aria-pressed={selectedResourceType === type}
                  className={`
                    ${
                      selectedResourceType === type
                        ? "bg-primary text-primary-foreground"
                        : "bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground hover:bg-white/20 dark:hover:bg-black/30"
                    }
                    hover:scale-105 transition-all duration-300 active:scale-95 font-medium h-10 sm:h-11 px-4 sm:px-5 text-sm min-w-[80px] sm:min-w-[90px]
                  `}
                >
                  {type}
                </Button>
              ))}
            </div>
          </div>

          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8"
            role="list"
            aria-label="Learning resources"
          >
            {filteredResources.map((resource, index) => {
              const typeConfig = getTypeConfig(resource.type)

              return (
                <article
                  key={resource.id}
                  role="listitem"
                  className="animate-in fade-in slide-in-from-bottom-4"
                  style={{ animationDelay: `${(index + filteredMissions.length) * 100}ms` }}
                >
                  <div className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 rounded-xl p-5 sm:p-6 hover:scale-105 transition-all duration-300 active:scale-95 h-full flex flex-col">
                    <div className="flex items-center gap-2 mb-3 sm:mb-4">
                      {typeConfig.icon}
                      <span
                        className={`${typeConfig.color} backdrop-blur-md border px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1`}
                      >
                        {resource.type.charAt(0).toUpperCase() + resource.type.slice(1)}
                      </span>
                    </div>
                    <h3 className="text-foreground font-semibold text-base sm:text-lg mb-3 text-balance line-clamp-2 leading-tight">
                      {resource.title}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed mb-4 sm:mb-5 flex-grow text-pretty line-clamp-3">
                      {resource.description}
                    </p>
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open ${resource.title} in new tab`}
                      className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-3 sm:py-2.5 rounded-lg text-sm font-medium hover:scale-105 transition-all duration-300 active:scale-95 min-h-[48px] sm:min-h-[44px] touch-manipulation"
                    >
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                      <span className="hidden xs:inline">Open Resource</span>
                      <span className="xs:hidden">Open</span>
                    </a>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      )}

      {missionsWithSubmissions.length === 0 && (
        <div className="text-center py-12 sm:py-16 px-4" role="status" aria-live="polite">
          <div className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 rounded-xl p-8 sm:p-12 max-w-md mx-auto">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <Sparkles className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground" aria-hidden="true" />
            </div>
            <p className="text-muted-foreground text-base sm:text-lg mb-2">No missions found for the selected type.</p>
            <p className="text-sm text-muted-foreground">Try selecting a different category above.</p>
          </div>
        </div>
      )}
    </>
  )
}
