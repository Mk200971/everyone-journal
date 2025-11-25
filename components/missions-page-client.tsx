"use client"

import { useState, useMemo, useEffect } from "react"
import { Sparkles } from "lucide-react"
import { MissionCard } from "@/components/mission-card"
import { MissionFilter } from "@/components/mission-filter"
import { createClient } from "@/lib/supabase/client"

interface Resource {
  id: string
  title: string
  description: string
  type: string
  url: string
}

interface Mission {
  id: string
  title: string
  description: string
  points_value: number
  type?: string
  resources?: Resource[]
}

interface MissionsPageClientProps {
  missions: Mission[]
}

export function MissionsPageClient({ missions }: MissionsPageClientProps) {
  const [selectedType, setSelectedType] = useState("All")
  const [userSubmissions, setUserSubmissions] = useState<Record<string, any[]>>({})
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const supabase = createClient()
    let mounted = true

    const fetchUserAndSubmissions = async () => {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser()

      if (mounted && currentUser) {
        setUser(currentUser)

        const { data, error } = await supabase
          .from("submissions")
          .select("id, mission_id, status, created_at")
          .eq("user_id", currentUser.id)

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
      }
    }

    fetchUserAndSubmissions()

    const submissionsChannel = supabase
      .channel("user:submissions")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "submissions",
        },
        () => {
          if (mounted) fetchUserAndSubmissions()
        },
      )
      .subscribe()

    return () => {
      mounted = false
      submissionsChannel.unsubscribe()
    }
  }, [])

  const filteredMissions = useMemo(
    () =>
      selectedType === "All"
        ? missions
        : missions.filter((mission) => mission.type?.toLowerCase() === selectedType.toLowerCase()),
    [missions, selectedType],
  )

  const missionCounts = useMemo(
    () => ({
      All: missions.length,
      Action: missions.filter((m) => m.type?.toLowerCase() === "action").length,
      Core: missions.filter((m) => m.type?.toLowerCase() === "core").length,
      Lite: missions.filter((m) => m.type?.toLowerCase() === "lite").length,
      Elevate: missions.filter((m) => m.type?.toLowerCase() === "elevate").length,
      Assignment: missions.filter((m) => m.type?.toLowerCase() === "assignment").length,
    }),
    [missions],
  )

  const missionsWithSubmissions = useMemo(() => {
    return filteredMissions.map((mission) => ({
      ...mission,
      userSubmissions: userSubmissions[mission.id] || [],
    }))
  }, [filteredMissions, userSubmissions])

  return (
    <>
      <div className="mb-8 sm:mb-10">
        <MissionFilter
          selectedType={selectedType}
          onTypeChange={setSelectedType}
          missionCounts={missionCounts}
          showAllButton={false}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 mb-8 sm:mb-12">
        {missionsWithSubmissions.map((mission, index) => (
          <div
            key={mission.id}
            className="animate-in fade-in slide-in-from-bottom-4"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <MissionCard mission={mission} />
          </div>
        ))}
      </div>

      {missionsWithSubmissions.length === 0 && (
        <div className="text-center py-12 sm:py-16 px-4">
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
