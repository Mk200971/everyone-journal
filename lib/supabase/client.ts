import { createBrowserClient } from "@supabase/ssr"

let client: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (client) {
    return client
  }

  client = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: {
      autoRefreshToken: false,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: "pkce",
    },
    global: {
      fetch: async (url, options = {}) => {
        try {
          return await fetch(url, options)
        } catch (error) {
          console.error("[v0] Supabase fetch error:", error)
          return new Response(JSON.stringify({ error: "Network error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          })
        }
      },
    },
  })

  if (typeof window !== "undefined") {
    setTimeout(() => {
      if (client) {
        // Re-enable token refresh after hydration completes
        client.auth.startAutoRefresh()
      }
    }, 1000)
  }

  return client
}

export function getPublicImageUrl(bucket: string, path: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`
}
