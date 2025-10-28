"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function MissionCardSkeleton() {
  return (
    <Card className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10">
      <CardHeader className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 w-16" />
        </div>
        <Skeleton className="h-8 w-full mb-2" />
        <Skeleton className="h-4 w-3/4" />
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0">
        <Skeleton className="h-40 w-full rounded-lg mb-4" />
        <Skeleton className="h-10 w-full" />
      </CardContent>
    </Card>
  )
}

export function ActivityFeedSkeleton() {
  return (
    <Card className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10">
      <CardHeader className="p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-9 w-20" />
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0">
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
              <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function LeaderboardSkeleton() {
  return (
    <Card className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10">
      <CardHeader className="p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-9 w-20" />
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0">
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 p-4 bg-white/5 rounded-lg">
              <div className="flex flex-col items-center gap-2">
                <Skeleton className="w-14 h-14 rounded-full" />
                <Skeleton className="w-10 h-10 rounded-full" />
              </div>
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-40" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function QuoteCarouselSkeleton() {
  return (
    <Card className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10">
      <CardContent className="p-6">
        <div className="space-y-4">
          <Skeleton className="h-64 w-full rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function MissionDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Card className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10">
        <CardHeader className="p-6">
          <Skeleton className="h-10 w-3/4 mb-4" />
          <Skeleton className="h-6 w-full mb-2" />
          <Skeleton className="h-6 w-5/6" />
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <Skeleton className="h-96 w-full rounded-lg mb-6" />
          <div className="flex gap-4">
            <Skeleton className="h-12 flex-1" />
            <Skeleton className="h-12 w-32" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function AdminQuotesSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <Card
          key={i}
          className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10"
        >
          <CardContent className="p-6">
            <div className="flex gap-4">
              <Skeleton className="w-24 h-24 rounded flex-shrink-0" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function AdminSubmissionsSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4].map((i) => (
        <Card
          key={i}
          className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10"
        >
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64" />
              </div>
              <Skeleton className="h-8 w-32" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function FormSkeleton() {
  return (
    <Card className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10">
      <CardHeader>
        <Skeleton className="h-8 w-1/2" />
      </CardHeader>
      <CardContent className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
        <Skeleton className="h-12 w-full" />
      </CardContent>
    </Card>
  )
}

export function ProfileSkeleton() {
  return (
    <Card className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10">
      <CardHeader className="p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="w-20 h-20 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 pt-0">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-4 pb-3 border-b border-white/10">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-4 w-1/4" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 py-3">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/4" />
        </div>
      ))}
    </div>
  )
}
