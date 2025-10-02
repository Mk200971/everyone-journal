import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
            supabaseResponse = NextResponse.next({
              request,
            })
            cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
          },
        },
      },
    )

    // This prevents session timeout issues
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError) {
      console.error("[v0] Session refresh error:", sessionError)
      // Continue anyway - don't block the request
    }

    const user = session?.user ?? null

    const protectedRoutes = ["/account", "/mission", "/leaderboard", "/admin"]
    const authRoutes = ["/auth/login", "/auth/sign-up"]

    const isProtectedRoute = protectedRoutes.some((route) => request.nextUrl.pathname.startsWith(route))
    const isAuthRoute = authRoutes.some((route) => request.nextUrl.pathname.startsWith(route))

    if (!user && isProtectedRoute) {
      const redirectUrl = new URL("/auth/login", request.url)
      redirectUrl.searchParams.set("redirectTo", request.nextUrl.pathname)
      return NextResponse.redirect(redirectUrl)
    }

    if (user && isAuthRoute) {
      return NextResponse.redirect(new URL("/", request.url))
    }

    return supabaseResponse
  } catch (error) {
    console.error("[v0] Middleware error:", error)
    // Return the response without blocking the request
    return supabaseResponse
  }
}
