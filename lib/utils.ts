import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getAvatarColor(userId: string | undefined, userName: string): string {
  // Use userId if available, otherwise fall back to userName for consistency
  const seed = userId || userName

  // Generate a hash from the seed string
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash)
    hash = hash & hash // Convert to 32-bit integer
  }

  // Define a palette of vibrant, accessible colors
  const colors = [
    "bg-blue-500 text-white",
    "bg-purple-500 text-white",
    "bg-pink-500 text-white",
    "bg-green-500 text-white",
    "bg-yellow-500 text-gray-900",
    "bg-orange-500 text-white",
    "bg-red-500 text-white",
    "bg-teal-500 text-white",
    "bg-indigo-500 text-white",
    "bg-cyan-500 text-gray-900",
    "bg-emerald-500 text-white",
    "bg-rose-500 text-white",
    "bg-violet-500 text-white",
    "bg-fuchsia-500 text-white",
    "bg-lime-500 text-gray-900",
    "bg-amber-500 text-gray-900",
  ]

  // Use the hash to select a color from the palette
  const index = Math.abs(hash) % colors.length
  return colors[index]
}
