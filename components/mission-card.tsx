"use client"

import { CardContent as UICardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Clock, Users, Gauge, CheckCircle, FileText, XCircle } from "lucide-react"
import Link from "next/link"
import { lazy, Suspense } from "react"
import Image from "next/image"

const Tilt = lazy(() => import("react-parallax-tilt"))

interface UserSubmission {
  id: string
  status: "draft" | "pending" | "approved" | "rejected"
  created_at: string
}

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
  userSubmissions?: UserSubmission[]
}

interface MissionCardProps {
  mission: Mission
  priority?: boolean // Added priority prop for above-fold optimization
}

export function MissionCard({ mission, priority = false }: MissionCardProps) {
  if (!mission || !mission.id) {
    return (
      <div className="h-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6 min-h-[400px] flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Loading mission...</p>
      </div>
    )
  }

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
      case "Assignment":
        return {
          color: "bg-[#404040] text-[#F2F2F2] border-[#404040]",
        }
      default:
        return {
          color: "bg-[#404040] text-[#F2F2F2] border-[#404040]",
        }
    }
  }

  const typeConfig = getTypeConfig(mission.type || "")

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
    const missionNum = mission.mission_number || 1
    const baseStyle = typeConfig.color

    if (typeof window !== "undefined" && window.innerWidth <= 768) {
      return baseStyle
    }

    // Add subtle animation for newer missions (higher numbers)
    if (missionNum > 8) {
      return `${baseStyle} animate-pulse`
    }
    return baseStyle
  }

  const formatDueDate = (dateString?: string) => {
    if (!dateString) return null
    const date = new Date(dateString)
    const year = date.getFullYear()
    const quarter = Math.ceil((date.getMonth() + 1) / 3)
    return `Due by end of Q${quarter} ${year}`
  }

  const getButtonState = () => {
    if (!mission.userSubmissions || mission.userSubmissions.length === 0) {
      return {
        text: "Start Activity",
        icon: <ArrowRight className="h-4 w-4 ml-2" aria-hidden="true" />,
        className: "bg-[#005956] hover:bg-[#004744] text-white",
      }
    }

    // Check for different submission statuses
    const hasDraft = mission.userSubmissions.some((s) => s.status === "draft")
    const hasPending = mission.userSubmissions.some((s) => s.status === "pending")
    const hasRejected = mission.userSubmissions.some((s) => s.status === "rejected")
    const approvedCount = mission.userSubmissions.filter((s) => s.status === "approved").length
    const totalCount = mission.userSubmissions.length

    // Priority: Rejected > Pending > Approved > Draft
    if (hasRejected) {
      return {
        text: "Rejected",
        icon: <XCircle className="h-4 w-4 ml-2" aria-hidden="true" />,
        className: "bg-red-50 hover:bg-red-100 text-red-600 border border-red-200",
      }
    }

    if (hasPending) {
      return {
        text: "Pending",
        icon: <Clock className="h-4 w-4 ml-2" aria-hidden="true" />,
        className: "bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-200",
      }
    }

    if (approvedCount > 0) {
      // If there are multiple submissions and some are approved
      if (totalCount > approvedCount) {
        return {
          text: `Approved (${approvedCount} of ${totalCount})`,
          icon: <CheckCircle className="h-4 w-4 ml-2" aria-hidden="true" />,
          className: "bg-green-50 hover:bg-green-100 text-green-600 border border-green-200",
        }
      }
      // All submissions are approved
      return {
        text: "Approved",
        icon: <CheckCircle className="h-4 w-4 ml-2" aria-hidden="true" />,
        className: "bg-[#CCF3E0] hover:bg-[#B3E6D0] text-[#047857] border border-[#B3E6D0]",
      }
    }

    if (hasDraft) {
      return {
        text: "Draft",
        icon: <FileText className="h-4 w-4 ml-2" aria-hidden="true" />,
        className: "bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200",
      }
    }

    // Default fallback
    return {
      text: "Start Activity",
      icon: <ArrowRight className="h-4 w-4 ml-2" aria-hidden="true" />,
      className: "bg-[#005956] hover:bg-[#004744] text-white",
    }
  }

  const buttonState = getButtonState()

  const CardContent = () => (
    <UICardContent className="h-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 cursor-pointer relative overflow-hidden group-hover:shadow-2xl min-h-[400px] touch-manipulation will-change-transform">
      <div className="flex items-center justify-between p-3 sm:p-4 pb-2">
        {mission.type && (
          <Badge
            className={`${getBadgeStyle()} font-medium px-3 py-1 text-sm rounded-full transition-all duration-300 hover:scale-105`}
          >
            {mission.type} #{getMissionNumber()}
          </Badge>
        )}
        <span
          className="text-teal-600 font-bold text-lg sm:text-xl"
          aria-label={`${mission.points_value} experience points`}
        >
          +{mission.points_value} EP
        </span>
      </div>

      <CardHeader className="pt-0 pb-3 sm:pb-4 px-3 sm:px-4">
        <CardTitle className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white leading-tight text-balance">
          {mission.title}
        </CardTitle>
      </CardHeader>

      <div className="px-3 sm:px-4 mb-3 sm:mb-4">
        <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-sm leading-relaxed line-clamp-3 text-pretty">
          {mission.description}
        </p>
      </div>

      <div className="px-3 sm:px-4 mb-3 sm:mb-4">
        {mission.image_url ? (
          <div className="w-full aspect-square bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden">
            <Image
              src={mission.image_url || "/placeholder.svg"}
              alt={`${mission.title} mission image`}
              width={400}
              height={400}
              className="w-full h-full object-cover"
              sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 400px"
              loading={priority ? "eager" : "lazy"}
              priority={priority}
              quality={priority ? 85 : 75}
              placeholder="blur"
              blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iI2YzZjRmNiIvPjwvc3ZnPg=="
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.src = "/everyone-logo.svg"
                target.style.objectFit = "contain"
                target.style.padding = "2rem"
              }}
            />
          </div>
        ) : (
          <div className="w-full aspect-square bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center">
            <Image
              src="/mission-illustration.jpg"
              alt="Mission illustration"
              width={400}
              height={400}
              className="w-full h-full object-cover"
              sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 400px"
              loading={priority ? "eager" : "lazy"}
              priority={priority}
              quality={75}
              placeholder="blur"
              blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iI2YzZjRmNiIvPjwvc3ZnPg=="
            />
          </div>
        )}
      </div>

      <div className="px-3 sm:px-4 pb-3 sm:pb-4">
        <div className="space-y-2 sm:space-y-3">
          {mission.duration && (
            <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              <Clock className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" aria-hidden="true" />
              <span className="truncate">{mission.duration}</span>
            </div>
          )}

          {mission.coordinator && (
            <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              <Users className="h-3 w-3 sm:h-4 sm:w-4" aria-hidden="true" />
              <span>{mission.coordinator}</span>
            </div>
          )}

          {mission.support_status && (
            <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              <Gauge className="h-3 w-3 sm:h-4 sm:w-4" aria-hidden="true" />
              <span>{mission.support_status}</span>
            </div>
          )}
        </div>
      </div>

      <CardFooter className="px-3 sm:px-4 pb-3 sm:pb-4 mt-auto">
        <Button
          className={`w-full font-medium py-3 sm:py-2 px-4 rounded-lg transition-colors duration-200 min-h-[48px] sm:min-h-[44px] text-sm sm:text-base touch-manipulation ${buttonState.className}`}
        >
          {buttonState.text}
          {buttonState.icon}
        </Button>
      </CardFooter>
    </UICardContent>
  )

  if (typeof window !== "undefined" && window.innerWidth > 768) {
    return (
      <Suspense fallback={<CardContent />}>
        <Tilt
          tiltMaxAngleX={8}
          tiltMaxAngleY={8}
          perspective={1000}
          scale={1.02}
          transitionSpeed={1500}
          gyroscope={true}
          glareEnable={true}
          glareMaxOpacity={0.1}
          glareColor="#ffffff"
          glarePosition="all"
        >
          <Link
            href={`/mission/${mission.id}`}
            className="block h-full group"
            aria-label={`View ${mission.title} mission details`}
          >
            <CardContent />
          </Link>
        </Tilt>
      </Suspense>
    )
  }

  return (
    <Link
      href={`/mission/${mission.id}`}
      className="block h-full group"
      aria-label={`View ${mission.title} mission details`}
    >
      <CardContent />
    </Link>
  )
}
