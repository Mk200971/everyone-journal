"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { X, ChevronLeft, ChevronRight } from "lucide-react"
import Image from "next/image"

interface MediaLightboxProps {
  mediaUrls: string[]
  initialIndex?: number
  trigger: React.ReactNode
}

export function MediaLightbox({ mediaUrls, initialIndex = 0, trigger }: MediaLightboxProps) {
  const [open, setOpen] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(initialIndex)

  if (!mediaUrls || mediaUrls.length === 0) return null

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? mediaUrls.length - 1 : prev - 1))
  }

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === mediaUrls.length - 1 ? 0 : prev + 1))
  }

  const isVideo = (url: string) => {
    const ext = url.split("?")[0].split(".").pop()?.toLowerCase() || ""
    return ["mp4", "mov", "avi", "webm"].includes(ext) || url.includes("video")
  }

  return (
    <>
      <div onClick={() => setOpen(true)} className="cursor-pointer">
        {trigger}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full p-0 bg-black/95">
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-50 bg-black/50 hover:bg-black/70 text-white"
              onClick={() => setOpen(false)}
            >
              <X className="h-6 w-6" />
            </Button>

            {/* Main Media */}
            <div className="relative w-full h-full flex items-center justify-center p-4">
              {isVideo(mediaUrls[currentIndex]) ? (
                <video
                  key={mediaUrls[currentIndex]}
                  src={mediaUrls[currentIndex]}
                  controls
                  className="max-w-full max-h-full object-contain"
                  autoPlay
                  crossOrigin="anonymous"
                />
              ) : (
                <div className="relative w-full h-full">
                  <Image
                    src={mediaUrls[currentIndex] || "/placeholder.svg"}
                    alt={`Media ${currentIndex + 1}`}
                    fill
                    className="object-contain"
                    sizes="95vw"
                  />
                </div>
              )}
            </div>

            {/* Navigation - Show only if more than 1 media */}
            {mediaUrls.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                  onClick={goToPrevious}
                >
                  <ChevronLeft className="h-8 w-8" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                  onClick={goToNext}
                >
                  <ChevronRight className="h-8 w-8" />
                </Button>

                {/* Counter */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white text-sm px-4 py-2 rounded-full">
                  {currentIndex + 1} / {mediaUrls.length}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
