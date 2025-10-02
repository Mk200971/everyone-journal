import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

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
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))

            supabaseResponse = NextResponse.next({ request })

            cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
          },
        },
      },
    )

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError) {
      console.error("[Middleware] Session error:", sessionError.message)
    }

    const user = session?.user
    const protectedRoutes = ["/account", "/mission", "/leaderboard", "/admin"]
    const authRoutes = ["/auth/login", "/auth/sign-up"]

    const isProtectedRoute = protectedRoutes.some((route) => request.nextUrl.pathname.startsWith(route))
    const isAuthRoute = authRoutes.some((route) => request.nextUrl.pathname.startsWith(route))

    if (!user && isProtectedRoute && !sessionError) {
      const redirectUrl = new URL("/auth/login", request.url)
      redirectUrl.searchParams.set("redirectTo", request.nextUrl.pathname)
      return NextResponse.redirect(redirectUrl)
    }

    if (user && isAuthRoute) {
      return NextResponse.redirect(new URL("/", request.url))
    }

    return supabaseResponse
  } catch (error) {
    console.error("[Middleware] Critical error:", error)
    return supabaseResponse
  }
}
