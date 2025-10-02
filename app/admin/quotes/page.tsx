import { Suspense } from "react"
import { QuotesClient } from "@/components/admin/quotes-client"
import { createClient } from "@/lib/supabase/server"

interface NoticeboardItem {
  id: string
  title: string
  content: string
  author: string
  author_title: string
  year: string
  image_url: string
  is_active: boolean
  display_order: number
}

async function getQuotes(): Promise<NoticeboardItem[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("noticeboard_items")
    .select("*")
    .order("display_order", { ascending: true })

  if (error) {
    console.error("Error fetching quotes:", error)
    return []
  }

  return data || []
}

export default async function AdminQuotesPage() {
  const quotes = await getQuotes()

  return (
    <Suspense fallback={<LoadingState />}>
      <QuotesClient initialQuotes={quotes} />
    </Suspense>
  )
}

function LoadingState() {
  return <div className="p-6">Loading...</div>
}
