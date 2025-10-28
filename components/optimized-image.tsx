"use client"

import Image from "next/image"
import { useState } from "react"

interface OptimizedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  sizes?: string
  priority?: boolean
  fill?: boolean
  unoptimized?: boolean
  placeholder?: "blur" | "empty"
  blurDataURL?: string
  quality?: number
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
  priority = false,
  fill = false,
  unoptimized = false,
  placeholder = "empty",
  blurDataURL = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q==",
  quality = 75,
}: OptimizedImageProps) {
  const [hasError, setHasError] = useState(false)

  // Determine if image should be unoptimized based on size and type
  const shouldUnoptimize = () => {
    if (unoptimized) return true

    // Unoptimize small images (under 10KB estimated) and SVGs
    if (src.includes(".svg") || src.includes("placeholder.svg")) return true
    if (width && height && width * height < 10000) return true

    return false
  }

  const handleError = () => {
    setHasError(true)
  }

  if (hasError) {
    return (
      <div className={`bg-gray-200 dark:bg-gray-800 flex items-center justify-center ${className}`}>
        <span className="text-gray-500 text-sm">Image unavailable</span>
      </div>
    )
  }

  return (
    <Image
      src={src || "/placeholder.svg"}
      alt={alt}
      width={width}
      height={height}
      fill={fill}
      className={className}
      sizes={sizes}
      loading={priority ? "eager" : "lazy"}
      priority={priority}
      unoptimized={shouldUnoptimize()}
      placeholder={shouldUnoptimize() ? "empty" : placeholder}
      blurDataURL={shouldUnoptimize() ? undefined : blurDataURL}
      quality={quality}
      onError={handleError}
    />
  )
}
