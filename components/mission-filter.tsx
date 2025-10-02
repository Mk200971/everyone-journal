"use client"

import { Button } from "@/components/ui/button"
import { Target, ExternalLink } from "lucide-react"
import Link from "next/link"

interface MissionFilterProps {
  selectedType: string
  onTypeChange: (type: string) => void
  missionCounts: Record<string, number>
  showAllButton?: boolean
}

export function MissionFilter({ selectedType, onTypeChange, missionCounts, showAllButton = true }: MissionFilterProps) {
  const getTypeConfig = (type: string) => {
    const lowerType = type.toLowerCase()
    switch (lowerType) {
      case "all":
        return {
          label: "All Activities",
          selectedBg: "bg-[#005956]", // Teal
          selectedText: "text-[#B3CECD]", // S-Teal
          selectedBorder: "border-[#005956]",
          hoverBg: "hover:bg-[#005956]",
          hoverText: "hover:text-[#B3CECD]",
          hoverBorder: "hover:border-[#005956]",
        }
      case "action":
        return {
          label: "Actions",
          selectedBg: "bg-[#B91C1C]", // Red
          selectedText: "text-[#FED6DE]", // S-Red
          selectedBorder: "border-[#B91C1C]",
          hoverBg: "hover:bg-[#B91C1C]",
          hoverText: "hover:text-[#FED6DE]",
          hoverBorder: "hover:border-[#B91C1C]",
        }
      case "core":
        return {
          label: "Core Missions",
          selectedBg: "bg-[#0072CE]", // Blue
          selectedText: "text-[#D9ECF8]", // S-Blue
          selectedBorder: "border-[#0072CE]",
          hoverBg: "hover:bg-[#0072CE]",
          hoverText: "hover:text-[#D9ECF8]",
          hoverBorder: "hover:border-[#0072CE]",
        }
      case "lite":
        return {
          label: "Lite Missions",
          selectedBg: "bg-[#047857]", // Green
          selectedText: "text-[#CCF3E0]", // S-Green
          selectedBorder: "border-[#047857]",
          hoverBg: "hover:bg-[#047857]",
          hoverText: "hover:text-[#CCF3E0]",
          hoverBorder: "hover:border-[#047857]",
        }
      case "elevate":
        return {
          label: "Elevate Missions",
          selectedBg: "bg-[#b45309]", // Orange
          selectedText: "text-[#FEEFCE]", // S-Orange
          selectedBorder: "border-[#b45309]",
          hoverBg: "hover:bg-[#b45309]",
          hoverText: "hover:text-[#FEEFCE]",
          hoverBorder: "hover:border-[#b45309]",
        }
      default:
        // Default styling for any new mission types added by admin
        return {
          label: type.charAt(0).toUpperCase() + type.slice(1) + " Missions",
          selectedBg: "bg-primary",
          selectedText: "text-primary-foreground",
          selectedBorder: "border-primary",
          hoverBg: "hover:bg-primary",
          hoverText: "hover:text-primary-foreground",
          hoverBorder: "hover:border-primary",
        }
    }
  }

  const filterTypes = Object.keys(missionCounts).map((type) => ({
    value: type,
    ...getTypeConfig(type),
  }))

  return (
    <div className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 rounded-xl p-4 sm:p-6">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h3 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2 min-w-0">
          <Target className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0" />
          <span>My Activities</span>
        </h3>
        {showAllButton && (
          <Link href="/missions">
            <Button
              variant="ghost"
              size="sm"
              className="text-primary hover:text-primary/80 hover:bg-primary/10 h-9 px-3 text-sm flex-shrink-0"
            >
              <span className="hidden sm:inline">View all</span>
              <span className="sm:hidden">All</span>
              <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        )}
      </div>
      <div className="flex flex-wrap gap-2 sm:gap-3">
        {filterTypes.map((type) => {
          const isSelected = selectedType.toLowerCase() === type.value.toLowerCase()
          return (
            <Button
              key={type.value}
              variant={isSelected ? "default" : "outline"}
              onClick={() => onTypeChange(type.value)}
              className={`relative group transition-all duration-300 text-sm sm:text-base px-3 sm:px-4 py-2 sm:py-2.5 min-h-[44px] ${
                isSelected
                  ? `${type.selectedBg} ${type.selectedText} ${type.selectedBorder} scale-105 shadow-lg ${type.hoverBg} ${type.hoverText} ${type.hoverBorder} hover:opacity-90`
                  : `bg-white/30 dark:bg-black/40 backdrop-blur-lg border border-white/40 dark:border-white/20 text-gray-800 dark:text-gray-200 hover:scale-105 ${type.hoverBg} ${type.hoverText} ${type.hoverBorder}`
              }`}
            >
              <span className="flex items-center gap-2">
                <span>{type.label}</span>
              </span>
            </Button>
          )
        })}
      </div>
    </div>
  )
}
