import { Suspense } from "react"
import { SubmissionsClient } from "@/components/admin/submissions-client"
import { fetchAllSubmissions } from "@/lib/admin-actions"

export default async function SubmissionReviewPage() {
  const submissions = await fetchAllSubmissions()

  return (
    <Suspense fallback={<LoadingState />}>
      <SubmissionsClient initialSubmissions={submissions} />
    </Suspense>
  )
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-black dark:to-purple-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p>Loading submissions...</p>
      </div>
    </div>
  )
}
