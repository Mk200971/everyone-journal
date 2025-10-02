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
        autoRefreshToken: typeof window !== "undefined",
        persistSession: true,
        detectSessionInUrl: typeof window !== "undefined",
        flowType: "pkce",
        storageKey: "sb-auth-token",
      },
      global: {
        fetch: async (url, options = {}) => {
          try {
            const response = await fetch(url, options)

            if (!response.ok && response.status === 401) {
              console.warn("[Client] Session expired, middleware will refresh")
            }

            return response
          } catch (error) {
            console.error("[Client] Fetch error:", error)
            return new Response(
              JSON.stringify({
                error: "Network error",
                message: error instanceof Error ? error.message : "Unknown",
              }),
              {
                status: 500,
                headers: { "Content-Type": "application/json" },
              },
            )
          }
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
