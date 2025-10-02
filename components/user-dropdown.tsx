"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { User, Trophy, LogOut, Settings, BookOpen, Home, Activity, MessageSquare, Target } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { signOut } from "@/lib/actions"

interface UserProfile {
  id: string
  name: string
  avatar_url: string | null
  total_points: number
}

interface UserDropdownProps {
  initialProfile?: UserProfile | null
}

export function UserDropdown({ initialProfile }: UserDropdownProps) {
  const [profile, setProfile] = useState<UserProfile | null>(initialProfile || null)
  const [isOpen, setIsOpen] = useState(false)
  const supabase = createClient()

  // The server always provides initialProfile via Navbar, so we don't need fallback logic

  useEffect(() => {
    const channel = supabase
      .channel("profile-changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${initialProfile?.id}`,
        },
        (payload) => {
          if (payload.new) {
            setProfile(payload.new as UserProfile)
          }
        },
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [initialProfile?.id, supabase])

  if (!profile) {
    return (
      <Button
        variant="ghost"
        className="h-11 w-11 p-2 bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 rounded-lg"
        aria-label="Profile unavailable"
        disabled
      >
        <User className="h-5 w-5 text-muted-foreground" />
      </Button>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          className="h-auto min-h-[44px] p-2 bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 hover:scale-105 transition-all duration-300 touch-manipulation select-none focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
          aria-label={`User menu for ${profile.name}`}
        >
          <div className="flex items-center gap-2">
            <Avatar className="w-8 h-8 ring-2 ring-white/20 dark:ring-white/10">
              <AvatarImage src={profile.avatar_url || "/placeholder.svg"} alt={profile.name} />
              <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                {profile.name
                  ?.split(" ")
                  .map((n) => n[0])
                  .join("") || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-foreground">{profile.name}</p>
              <p className="text-xs text-muted-foreground">{profile.total_points.toLocaleString()} EP</p>
            </div>
          </div>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-white/95 dark:bg-black/95 backdrop-blur-xl border border-white/20 dark:border-white/10">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={profile.avatar_url || "/placeholder.svg"} alt={profile.name} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {profile.name
                  ?.split(" ")
                  .map((n) => n[0])
                  .join("") || "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-lg font-semibold">{profile.name}</p>
              <p className="text-sm text-muted-foreground">{profile.total_points.toLocaleString()} EP earned</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-2 py-4">
          <Button asChild variant="ghost" className="justify-start h-12" onClick={() => setIsOpen(false)}>
            <Link href="/" className="flex items-center gap-3">
              <Home className="h-5 w-5" />
              <span>Home</span>
            </Link>
          </Button>

          <Button asChild variant="ghost" className="justify-start h-12" onClick={() => setIsOpen(false)}>
            <Link href="/activity" className="flex items-center gap-3">
              <Activity className="h-5 w-5" />
              <span>Community Activity</span>
            </Link>
          </Button>

          <Button asChild variant="ghost" className="justify-start h-12" onClick={() => setIsOpen(false)}>
            <Link href="/leaderboard" className="flex items-center gap-3">
              <Trophy className="h-5 w-5" />
              <span>Leaderboard</span>
            </Link>
          </Button>

          <Button asChild variant="ghost" className="justify-start h-12" onClick={() => setIsOpen(false)}>
            <Link href="/missions" className="flex items-center gap-3">
              <Target className="h-5 w-5" />
              <span>My Activities</span>
            </Link>
          </Button>

          <Button asChild variant="ghost" className="justify-start h-12" onClick={() => setIsOpen(false)}>
            <Link href="/resources" className="flex items-center gap-3">
              <BookOpen className="h-5 w-5" />
              <span>Learning Resources</span>
            </Link>
          </Button>

          <Button asChild variant="ghost" className="justify-start h-12" onClick={() => setIsOpen(false)}>
            <Link href="/report" className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5" />
              <span>Share Feedback </span>
            </Link>
          </Button>

          <Button asChild variant="ghost" className="justify-start h-12" onClick={() => setIsOpen(false)}>
            <Link href="/account" className="flex items-center gap-3">
              <User className="h-5 w-5" />
              <span>My Profile</span>
            </Link>
          </Button>

          <Button asChild variant="ghost" className="justify-start h-12" onClick={() => setIsOpen(false)}>
            <Link href="/admin" className="flex items-center gap-3">
              <Settings className="h-5 w-5" />
              <span>Admin Panel</span>
            </Link>
          </Button>

          <div className="border-t border-white/20 dark:border-white/10 pt-2 mt-2">
            <form action={signOut} className="w-full">
              <Button
                type="submit"
                variant="ghost"
                className="justify-start h-12 w-full text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
              >
                <LogOut className="h-5 w-5 mr-3" />
                <span>Sign Out</span>
              </Button>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
