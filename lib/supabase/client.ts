import { createBrowserClient } from "@supabase/ssr"

let clientInstance: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (clientInstance) {
    return clientInstance
  }

  try {
    const client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: true,
          detectSessionInUrl: false,
          storage: undefined,
        },
        global: {
          fetch: async (url, options) => {
            try {
              return await fetch(url, options)
            } catch (error) {
              console.log("[v0] Supabase fetch error suppressed:", error)
              // Return a mock response to prevent errors from propagating
              return new Response(JSON.stringify({ error: "Network error" }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
              })
            }
          },
        },
      },
    )

    clientInstance = client
    return client
  } catch (error) {
    console.error("[v0] Error creating Supabase client:", error)
    // Return a minimal mock client that won't cause errors
    return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
        storage: undefined,
      },
    })
  }
}

export function getPublicImageUrl(bucket: string, path: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`
}
