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
      <div className="flex items-center justify-between gap-3 sm:gap-4 p-3 sm:p-6">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
          <Link
            href="/"
            className="hover:opacity-80 transition-opacity duration-200 flex items-center touch-manipulation"
          >
            <Image
              src="/everyone-logo.svg"
              alt="EVERYONE"
              width={180}
              height={40}
              className="w-32 h-10 sm:w-36 sm:h-11 lg:w-40 lg:h-12 object-contain"
              priority
              quality={90}
              sizes="(max-width: 640px) 128px, (max-width: 1024px) 144px, 160px"
            />
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {user && profile && (
            <div className="flex sm:hidden flex-col items-end mr-1 sm:mr-2 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-foreground truncate max-w-[100px] sm:max-w-[120px]">
                {profile.name}
              </p>
              <p className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">
                {profile.total_points.toLocaleString()} EP
              </p>
            </div>
          )}

          {!user ? (
            <>
              <Link href="/auth/login" className="touch-manipulation">
                <Button
                  variant="ghost"
                  className="h-11 sm:h-10 px-3 sm:px-4 bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground hover:bg-white/20 dark:hover:bg-black/30 hover:scale-105 transition-all duration-300 active:scale-95 text-sm font-medium min-w-[70px] sm:min-w-[80px] touch-manipulation"
                >
                  Login
                </Button>
              </Link>
              <Link href="/auth/sign-up" className="touch-manipulation">
                <Button className="h-11 sm:h-10 px-3 sm:px-4 bg-primary hover:bg-primary/90 text-primary-foreground hover:scale-105 transition-all duration-300 active:scale-95 text-sm font-medium min-w-[80px] sm:min-w-[90px] touch-manipulation">
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
