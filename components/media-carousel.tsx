"use client"

import { useState } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface MediaCarouselProps {
  mediaUrls: string[]
  className?: string
  showControls?: boolean
  autoHeight?: boolean
}

export function MediaCarousel({ mediaUrls, className, showControls = true, autoHeight = false }: MediaCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  if (!mediaUrls || mediaUrls.length === 0) return null

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? mediaUrls.length - 1 : prev - 1))
  }

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === mediaUrls.length - 1 ? 0 : prev + 1))
  }

  const isVideo = (url: string) => {
    return url.includes(".mp4") || url.includes(".mov") || url.includes("video")
  }

  return (
    <div className={cn("relative group", className)}>
      {/* Main Media Display */}
      <div className={cn("relative overflow-hidden rounded-lg", autoHeight ? "" : "aspect-square")}>
        {isVideo(mediaUrls[currentIndex]) ? (
          <video
            key={mediaUrls[currentIndex]}
            src={mediaUrls[currentIndex]}
            controls
            className="w-full h-full object-cover"
            preload="metadata"
          />
        ) : (
          <Image
            src={mediaUrls[currentIndex] || "/placeholder.svg"}
            alt={`Media ${currentIndex + 1}`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        )}

        {/* Navigation Arrows - Show only if more than 1 media */}
        {mediaUrls.length > 1 && showControls && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={goToPrevious}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={goToNext}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </>
        )}
      </div>

      {/* Dots Indicator - Show only if more than 1 media */}
      {mediaUrls.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {mediaUrls.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={cn(
                "h-1.5 rounded-full transition-all",
                index === currentIndex ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50",
              )}
              aria-label={`Go to media ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Counter */}
      {mediaUrls.length > 1 && (
        <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
          {currentIndex + 1}/{mediaUrls.length}
        </div>
      )}
    </div>
  )
}
