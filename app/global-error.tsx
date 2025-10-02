"use client"

import { Button } from "@/components/ui/button"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-100 dark:from-gray-900 dark:to-gray-800">
          <div className="text-center space-y-6 p-8">
            <h1 className="text-6xl font-bold text-gray-900 dark:text-white">500</h1>
            <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-300">Something went wrong</h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
              An unexpected error occurred. Please try again.
            </p>
            <Button onClick={() => reset()}>Try again</Button>
          </div>
        </div>
      </body>
    </html>
  )
}
