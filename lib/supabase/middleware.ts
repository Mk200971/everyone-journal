import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    },
  )

  let user = null
  let retries = 3
  let lastError = null

  while (retries > 0 && !user) {
    try {
      const {
        data: { user: fetchedUser },
        error,
      } = await supabase.auth.getUser()

      if (error) {
        lastError = error
        console.log("[v0] Middleware - Auth error (retries left:", retries - 1, "):", error.message)
        retries--
        if (retries > 0) {
          await new Promise((resolve) => setTimeout(resolve, 100)) // Wait 100ms before retry
        }
      } else {
        user = fetchedUser
        break
      }
    } catch (err) {
      lastError = err
      console.log("[v0] Middleware - Exception during auth (retries left:", retries - 1, "):", err)
      retries--
      if (retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    }
  }

  console.log("[v0] Middleware - Final auth state:", user ? "authenticated" : "not authenticated", user?.id)

  const protectedRoutes = ["/account", "/mission", "/leaderboard", "/admin"]
  const authRoutes = ["/auth/login", "/auth/sign-up"]

  const isProtectedRoute = protectedRoutes.some((route) => request.nextUrl.pathname.startsWith(route))
  const isAuthRoute = authRoutes.some((route) => request.nextUrl.pathname.startsWith(route))

  if (!user && isProtectedRoute) {
    console.log("[v0] Middleware - Redirecting to login, no user found")
    const redirectUrl = new URL("/auth/login", request.url)
    redirectUrl.searchParams.set("redirectTo", request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  if (user && isAuthRoute) {
    console.log("[v0] Middleware - Redirecting to home, user already authenticated")
    return NextResponse.redirect(new URL("/", request.url))
  }

  return supabaseResponse
}
