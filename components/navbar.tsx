import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { UserDropdown } from "@/components/user-dropdown"
import { createClient } from "@/lib/supabase/server"

interface NavbarProps {
  className?: string
}

export async function Navbar({ className = "" }: NavbarProps) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let profile = null
  if (user) {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("id, name, avatar_url, total_points")
      .eq("id", user.id)
      .single()

    profile = profileData
  }

  return (
    <header
      className={`sticky top-0 z-50 mb-2 sm:mb-4 bg-white/10 dark:bg-black/20 backdrop-blur-xl border-b border-white/20 dark:border-white/10 rounded-b-lg sm:rounded-b-xl ${className}`}
    >
      <div className="flex items-center justify-between gap-4 p-4 sm:p-6">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
          <Link href="/" className="hover:opacity-80 transition-opacity duration-200 flex items-center">
            <Image
              src="/everyone-logo.svg"
              alt="EVERYONE"
              width={180}
              height={40}
              className="sm:w-32 lg:w-40 sm:h-10 lg:h-12 w-44 h-16 object-contain"
              priority
            />
          </Link>
          {/* <nav className="hidden md:flex items-center gap-1">
            <Link href="/discover">
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-3 text-sm font-medium text-foreground hover:text-primary hover:bg-white/10 dark:hover:bg-black/20 transition-all"
              >
                Discover
              </Button>
            </Link>
          </nav> */}
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {user && profile && (
            <div className="flex sm:hidden flex-col items-end mr-2">
              <p className="text-sm font-medium text-foreground truncate max-w-[120px]">{profile.name}</p>
              <p className="text-xs text-muted-foreground">{profile.total_points.toLocaleString()} EP</p>
            </div>
          )}

          {!user ? (
            <>
              <Link href="/auth/login">
                <Button
                  variant="ghost"
                  className="h-10 sm:h-11 px-3 sm:px-4 bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground hover:bg-white/20 dark:hover:bg-black/30 hover:scale-105 transition-all duration-300 active:scale-95 text-sm font-medium min-w-[60px] sm:min-w-[70px]"
                >
                  Login
                </Button>
              </Link>
              <Link href="/auth/sign-up">
                <Button className="h-10 sm:h-11 px-3 sm:px-4 bg-primary hover:bg-primary/90 text-primary-foreground hover:scale-105 transition-all duration-300 active:scale-95 text-sm font-medium min-w-[70px] sm:min-w-[80px]">
                  Sign Up
                </Button>
              </Link>
            </>
          ) : (
            <UserDropdown initialProfile={profile} />
          )}
        </div>
      </div>
    </header>
  )
}
