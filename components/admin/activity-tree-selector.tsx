"use client"

import { useState, useEffect } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChevronDown, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface Mission {
  id: string
  title: string
  type: string
  description: string | null
}

interface Program {
  id: string
  title: string
  description: string | null
}

interface ActivityNode {
  program: Program
  missions: Mission[]
}

interface ActivityTreeSelectorProps {
  activities: ActivityNode[]
  selectedMissionIds: string[]
  onSelectionChange: (missionIds: string[]) => void
}

export default function ActivityTreeSelector({
  activities,
  selectedMissionIds,
  onSelectionChange,
}: ActivityTreeSelectorProps) {
  const [expandedPrograms, setExpandedPrograms] = useState<Set<string>>(new Set())
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set())

  // Auto-expand programs that have selected missions
  useEffect(() => {
    const programsToExpand = new Set<string>()
    const typesToExpand = new Set<string>()

    activities.forEach(({ program, missions }) => {
      const hasSelectedMission = missions.some((m) => selectedMissionIds.includes(m.id))
      if (hasSelectedMission) {
        programsToExpand.add(program.id)

        // Also expand types that have selected missions
        missions.forEach((m) => {
          if (selectedMissionIds.includes(m.id)) {
            typesToExpand.add(`${program.id}-${m.type}`)
          }
        })
      }
    })

    setExpandedPrograms(programsToExpand)
    setExpandedTypes(typesToExpand)
  }, [activities, selectedMissionIds])

  const toggleProgram = (programId: string) => {
    setExpandedPrograms((prev) => {
      const next = new Set(prev)
      if (next.has(programId)) {
        next.delete(programId)
      } else {
        next.add(programId)
      }
      return next
    })
  }

  const toggleType = (programId: string, type: string) => {
    const key = `${programId}-${type}`
    setExpandedTypes((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const toggleMission = (missionId: string) => {
    const newSelection = selectedMissionIds.includes(missionId)
      ? selectedMissionIds.filter((id) => id !== missionId)
      : [...selectedMissionIds, missionId]

    onSelectionChange(newSelection)
  }

  const toggleAllInType = (missions: Mission[]) => {
    const missionIds = missions.map((m) => m.id)
    const allSelected = missionIds.every((id) => selectedMissionIds.includes(id))

    if (allSelected) {
      // Deselect all
      onSelectionChange(selectedMissionIds.filter((id) => !missionIds.includes(id)))
    } else {
      // Select all
      const newSelection = [...new Set([...selectedMissionIds, ...missionIds])]
      onSelectionChange(newSelection)
    }
  }

  const toggleAllInProgram = (missions: Mission[]) => {
    const missionIds = missions.map((m) => m.id)
    const allSelected = missionIds.every((id) => selectedMissionIds.includes(id))

    if (allSelected) {
      // Deselect all
      onSelectionChange(selectedMissionIds.filter((id) => !missionIds.includes(id)))
    } else {
      // Select all
      const newSelection = [...new Set([...selectedMissionIds, ...missionIds])]
      onSelectionChange(newSelection)
    }
  }

  // Group missions by type within each program
  const groupMissionsByType = (missions: Mission[]) => {
    const grouped = new Map<string, Mission[]>()

    missions.forEach((mission) => {
      if (!grouped.has(mission.type)) {
        grouped.set(mission.type, [])
      }
      grouped.get(mission.type)!.push(mission)
    })

    return Array.from(grouped.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }

  if (activities.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No activities available</div>
  }

  return (
    <div className="space-y-4">
      {/* Mission Visibility Control */}
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-900 dark:text-blue-100">
          <strong>Mission Visibility Control:</strong> Only missions checked below will be visible to this user on their
          /missions page. Unchecked missions will be hidden. This is the primary way to control what activities users
          can access.
        </p>
      </div>

      <ScrollArea className="h-[400px] w-full rounded-md border p-4">
        <div className="space-y-2">
          {activities.map(({ program, missions }) => {
            const isProgramExpanded = expandedPrograms.has(program.id)
            const groupedMissions = groupMissionsByType(missions)
            const allProgramSelected = missions.every((m) => selectedMissionIds.includes(m.id))
            const someProgramSelected = missions.some((m) => selectedMissionIds.includes(m.id)) && !allProgramSelected

            return (
              <div key={program.id} className="space-y-1">
                {/* Program Level */}
                <div className="flex items-center space-x-2 py-2">
                  <button onClick={() => toggleProgram(program.id)} className="p-0.5 hover:bg-accent rounded">
                    {isProgramExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                  <Checkbox
                    id={`program-${program.id}`}
                    checked={allProgramSelected}
                    className={cn(someProgramSelected && "data-[state=checked]:bg-blue-600")}
                    onCheckedChange={() => toggleAllInProgram(missions)}
                  />
                  <Label htmlFor={`program-${program.id}`} className="font-semibold cursor-pointer flex-1">
                    {program.title}
                  </Label>
                </div>

                {/* Mission Types & Missions */}
                {isProgramExpanded && (
                  <div className="ml-6 space-y-1">
                    {groupedMissions.map(([type, typeMissions]) => {
                      const typeKey = `${program.id}-${type}`
                      const isTypeExpanded = expandedTypes.has(typeKey)
                      const allTypeSelected = typeMissions.every((m) => selectedMissionIds.includes(m.id))
                      const someTypeSelected =
                        typeMissions.some((m) => selectedMissionIds.includes(m.id)) && !allTypeSelected

                      return (
                        <div key={typeKey} className="space-y-1">
                          {/* Type Level */}
                          <div className="flex items-center space-x-2 py-1.5">
                            <button
                              onClick={() => toggleType(program.id, type)}
                              className="p-0.5 hover:bg-accent rounded"
                            >
                              {isTypeExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </button>
                            <Checkbox
                              id={`type-${typeKey}`}
                              checked={allTypeSelected}
                              className={cn(someTypeSelected && "data-[state=checked]:bg-blue-600")}
                              onCheckedChange={() => toggleAllInType(typeMissions)}
                            />
                            <Label htmlFor={`type-${typeKey}`} className="font-medium cursor-pointer text-sm flex-1">
                              {type}
                            </Label>
                          </div>

                          {/* Individual Missions */}
                          {isTypeExpanded && (
                            <div className="ml-6 space-y-1">
                              {typeMissions.map((mission) => (
                                <div key={mission.id} className="flex items-center space-x-2 py-1">
                                  <Checkbox
                                    id={`mission-${mission.id}`}
                                    checked={selectedMissionIds.includes(mission.id)}
                                    onCheckedChange={() => toggleMission(mission.id)}
                                  />
                                  <Label htmlFor={`mission-${mission.id}`} className="cursor-pointer text-sm flex-1">
                                    {mission.title}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
