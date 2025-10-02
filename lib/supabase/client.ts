import { createBrowserClient } from "@supabase/ssr"

let clientInstance: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (clientInstance) {
    return clientInstance
  }

  clientInstance = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce",
      },
      global: {
        fetch: (url, options = {}) => {
          // Wrap fetch to handle errors gracefully
          return fetch(url, options).catch((error) => {
            console.error("[v0] Supabase fetch error:", error)
            // Return a minimal response to prevent crashes
            return new Response(JSON.stringify({ error: "Network error" }), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            })
          })
        },
      },
    },
  )

  return clientInstance
}

export function getPublicImageUrl(bucket: string, path: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`
}
