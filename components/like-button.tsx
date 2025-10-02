"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Heart } from "lucide-react"

interface LikeButtonProps {
  submissionId: string
  likesCount: number
  userHasLiked: boolean
  onToggleLike: (submissionId: string, userHasLiked: boolean) => Promise<{ success: boolean; error?: string }>
}

export function LikeButton({ submissionId, likesCount, userHasLiked, onToggleLike }: LikeButtonProps) {
  const [isPending, startTransition] = useTransition()
  const [optimisticLiked, setOptimisticLiked] = useState(userHasLiked)
  const [optimisticCount, setOptimisticCount] = useState(likesCount)

  const handleToggleLike = () => {
    if (isPending) return

    setOptimisticLiked(!optimisticLiked)
    setOptimisticCount(optimisticLiked ? optimisticCount - 1 : optimisticCount + 1)

    startTransition(async () => {
      try {
        const result = await onToggleLike(submissionId, userHasLiked)
        if (!result.success) {
          setOptimisticLiked(userHasLiked)
          setOptimisticCount(likesCount)
          console.error("[v0] Like action failed:", result.error)
        }
      } catch (error) {
        setOptimisticLiked(userHasLiked)
        setOptimisticCount(likesCount)
        console.error("[v0] Like action error:", error)
      }
    })
  }

  return (
    <Button
      onClick={handleToggleLike}
      disabled={isPending}
      variant="ghost"
      size="sm"
      className={`flex items-center gap-2 hover:bg-transparent transition-all duration-200 ${
        optimisticLiked ? "text-red-500 hover:text-red-600" : "text-muted-foreground hover:text-red-400"
      } ${isPending ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <Heart
        className={`h-5 w-5 transition-all duration-200 ${
          optimisticLiked ? "fill-current scale-110" : "hover:scale-105"
        } ${isPending ? "animate-pulse" : ""}`}
      />
      {optimisticCount > 0 && (
        <span className={`text-sm font-medium ${optimisticLiked ? "text-red-500" : "text-muted-foreground"}`}>
          {optimisticCount}
        </span>
      )}
    </Button>
  )
}
