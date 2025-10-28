import { createBrowserClient } from "@supabase/ssr"

/**
 * Creates a new Supabase browser client instance.
 *
 * IMPORTANT: Always creates a fresh client instance (no singleton pattern).
 *
 * Why we don't use a singleton:
 *
 * 1. Next.js App Router & Server Components:
 *    - Server Components can run on different server instances
 *    - Singleton would share state across requests (security risk)
 *
 * 2. Vercel Fluid Compute:
 *    - Compute instances spin up/down dynamically
 *    - Singleton assumes long-lived process (doesn't work in serverless)
 *
 * 3. Session Isolation:
 *    - Each user needs their own client with their own auth state
 *    - Singleton would mix sessions across users
 *
 * 4. Cookie Freshness:
 *    - Supabase SSR reads cookies on each request
 *    - New client ensures latest cookies are read, not cached ones
 *
 * 5. Memory Management:
 *    - Singletons can cause memory leaks in recycled serverless instances
 *    - Fresh instances are garbage collected after use
 *
 * @returns A new Supabase browser client instance
 */
export function createClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}

/**
 * Helper function to generate public storage URLs.
 *
 * @param bucket - The storage bucket name
 * @param path - The file path within the bucket
 * @returns The full public URL to the file
 */
export function getPublicImageUrl(bucket: string, path: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`
}
