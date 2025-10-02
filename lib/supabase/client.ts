import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: {
      // Don't automatically refresh tokens to avoid fetch errors
      autoRefreshToken: true,
      // Persist session in storage
      persistSession: true,
      // Detect session from URL
      detectSessionInUrl: true,
      // Add custom fetch with error handling
      flowType: "pkce",
    },
    global: {
      // Add custom fetch that handles errors gracefully
      fetch: async (url, options = {}) => {
        try {
          return await fetch(url, options)
        } catch (error) {
          console.error("[v0] Supabase fetch error:", error)
          // Return a mock response to prevent crashes
          return new Response(JSON.stringify({ error: "Network error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          })
        }
      },
    },
  })
}

export function getPublicImageUrl(bucket: string, path: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`
}
