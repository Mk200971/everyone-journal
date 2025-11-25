/**
 * Media utility functions for handling multiple media URLs
 * Provides backward compatibility for TEXT and JSONB formats
 */

export type MediaUrl = string | string[] | null

/**
 * Parses media_url field to always return an array of URLs
 * Handles backward compatibility for TEXT, JSON string, and JSONB formats
 */
export function parseMediaUrls(mediaUrl: MediaUrl): string[] {
  if (!mediaUrl) return []

  // Already an array
  if (Array.isArray(mediaUrl)) return mediaUrl

  // String format - could be single URL or JSON string
  if (typeof mediaUrl === "string") {
    // Empty string
    if (mediaUrl.trim() === "") return []

    // Try parsing as JSON
    if (mediaUrl.startsWith("[")) {
      try {
        const parsed = JSON.parse(mediaUrl)
        return Array.isArray(parsed) ? parsed : [mediaUrl]
      } catch {
        return [mediaUrl]
      }
    }

    // Single URL
    return [mediaUrl]
  }

  return []
}

/**
 * Serializes media URLs for database storage
 * Always returns JSON string for consistency
 */
export function serializeMediaUrls(urls: string[]): string | null {
  if (!urls || urls.length === 0) return null
  return JSON.stringify(urls)
}

/**
 * Validates if a URL is a valid media URL
 */
export function isValidMediaUrl(url: string): boolean {
  try {
    const urlObj = new URL(url)
    return urlObj.protocol === "http:" || urlObj.protocol === "https:"
  } catch {
    return false
  }
}

/**
 * Filters out invalid media URLs
 */
export function filterValidMediaUrls(urls: string[]): string[] {
  return urls.filter(isValidMediaUrl)
}

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "ico"]
const VIDEO_EXTENSIONS = ["mp4", "webm", "mov", "avi", "mkv", "wmv", "m4v", "ogv"]

/**
 * Extracts clean file extension from URL (strips query params)
 */
export function getFileExtension(url: string): string {
  try {
    // Remove query string and hash
    const cleanUrl = url.split("?")[0].split("#")[0]
    // Get extension
    const ext = cleanUrl.split(".").pop()?.toLowerCase() || ""
    return ext
  } catch {
    return ""
  }
}

/**
 * Gets the file type from a media URL
 * Handles URLs with query parameters correctly
 */
export function getMediaType(url: string): "image" | "video" | "unknown" {
  const ext = getFileExtension(url)

  if (IMAGE_EXTENSIONS.includes(ext)) return "image"
  if (VIDEO_EXTENSIONS.includes(ext)) return "video"

  return "unknown"
}

/**
 * Checks if a URL points to a video file
 */
export function isVideoUrl(url: string): boolean {
  return getMediaType(url) === "video"
}

/**
 * Checks if a URL points to an image file
 */
export function isImageUrl(url: string): boolean {
  return getMediaType(url) === "image"
}
// </CHANGE>

/**
 * Counts images and videos in media URLs
 */
export function countMediaTypes(urls: string[]): { images: number; videos: number } {
  let images = 0
  let videos = 0

  urls.forEach((url) => {
    const type = getMediaType(url)
    if (type === "image") images++
    else if (type === "video") videos++
  })

  return { images, videos }
}
