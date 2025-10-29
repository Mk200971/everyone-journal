"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"
import { Quote, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react"
import { ErrorBoundary } from "@/components/error-boundary"
import { QuoteCarouselSkeleton } from "@/components/skeleton-loaders"

interface NoticeboardItem {
  id: string
  title: string
  content: string
  author: string
  author_title: string
  year: string
  image_url: string
  is_active: boolean
  display_order: number
}

interface QuoteCarouselProps {
  initialQuotes?: NoticeboardItem[]
}

function QuoteCarouselErrorFallback({ resetError }: { resetError: () => void }) {
  return (
    <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 mb-6 sm:mb-8">
      <CardContent className="p-6 text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground mb-4">Failed to load inspiration quotes</p>
        <button onClick={resetError} className="text-primary hover:text-primary/80 underline text-sm">
          Try again
        </button>
      </CardContent>
    </Card>
  )
}

export function QuoteCarousel({ initialQuotes = [] }: QuoteCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [quotes, setQuotes] = useState<NoticeboardItem[]>(initialQuotes)
  const [loading, setLoading] = useState(initialQuotes.length === 0)
  const [error, setError] = useState<string | null>(null)
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (initialQuotes.length > 0) {
      setLoading(false)
      return
    }

    const fetchQuotes = async () => {
      try {
        const supabase = createClient()

        const { data, error } = await supabase
          .from("noticeboard_items")
          .select("*")
          .eq("is_active", true)
          .order("display_order", { ascending: true })

        if (error) {
          setError("Unable to load inspiration quotes. Please check your connection.")
        } else {
          setQuotes(data || [])
          setError(null)
        }
      } catch (err) {
        setError("An unexpected error occurred while loading quotes.")
      } finally {
        setLoading(false)
      }
    }

    fetchQuotes()
  }, [initialQuotes])

  useEffect(() => {
    if (quotes.length === 0) return

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % quotes.length)
    }, 10000)

    return () => clearInterval(interval)
  }, [quotes.length])

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + quotes.length) % quotes.length)
  }, [quotes.length])

  const goToNext = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % quotes.length)
  }, [quotes.length])

  const handleImageError = useCallback((quoteId: string) => {
    setFailedImages((prev) => new Set(prev).add(quoteId))
  }, [])

  if (error) {
    return (
      <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 mb-6 sm:mb-8">
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-3" />
          <p className="text-destructive text-sm">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return <QuoteCarouselSkeleton />
  }

  if (quotes.length === 0) {
    return (
      <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 mb-6 sm:mb-8">
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">No quotes available</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <ErrorBoundary fallback={QuoteCarouselErrorFallback}>
      <Card className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 shadow-xl mb-4 sm:mb-6 overflow-hidden">
        <CardContent className="p-0">
          <div className="bg-white/20 dark:bg-black/30 backdrop-blur-sm border-b border-white/20 dark:border-white/10 text-foreground p-1 sm:p-3">
            <div className="flex items-center gap-3">
              <Quote className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              <h3 className="text-lg sm:text-xl font-bold">Noticeboard</h3>
            </div>
          </div>

          <Carousel className="w-full">
            <CarouselContent>
              {quotes.map((quote, index) => (
                <CarouselItem key={quote.id} className={index === currentIndex ? "block" : "hidden"}>
                  <div className="pb-3 sm:pb-6">
                    <div className="max-w-5xl mx-auto">
                      <div className="relative w-full" style={{ transform: "translateZ(0)" }}>
                        <div className="aspect-[3/2] rounded-lg overflow-hidden shadow-lg">
                          {failedImages.has(quote.id) ? (
                            <div className="w-full h-full bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center">
                              <Image
                                src="/everyone-logo.svg"
                                alt="Everyone Journal Logo"
                                width={300}
                                height={300}
                                className="opacity-40"
                              />
                            </div>
                          ) : (
                            <Image
                              src={quote.image_url || "/everyone-logo.svg"}
                              alt={`Quote by ${quote.author}`}
                              width={1200}
                              height={800}
                              className="object-cover w-full h-full"
                              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 1200px"
                              priority={index === 0 || index === 1}
                              loading={index === 0 || index === 1 ? "eager" : "lazy"}
                              quality={index === 0 ? 90 : 75}
                              placeholder="blur"
                              blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
                              fetchPriority={index === 0 ? "high" : "auto"}
                              unoptimized={false}
                              onError={() => handleImageError(quote.id)}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Navigation indicators */}
                  <div className="flex justify-center pb-0">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={goToPrevious}
                        className="p-2 rounded-full bg-white/10 dark:bg-black/20 backdrop-blur-sm border border-white/20 dark:border-white/10 hover:bg-white/20 dark:hover:bg-black/30 transition-all duration-200 touch-manipulation"
                        aria-label="Previous quote"
                      >
                        <ChevronLeft className="h-4 w-4 text-foreground" />
                      </button>

                      <div className="flex items-center gap-1">
                        <span className="text-sm text-muted-foreground">
                          {currentIndex + 1} / {quotes.length}
                        </span>
                      </div>

                      <button
                        onClick={goToNext}
                        className="p-2 rounded-full bg-white/10 dark:bg-black/20 backdrop-blur-sm border border-white/20 dark:border-white/10 hover:bg-white/20 dark:hover:bg-black/30 transition-all duration-200 touch-manipulation"
                        aria-label="Next quote"
                      >
                        <ChevronRight className="h-4 w-4 text-foreground" />
                      </button>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </CardContent>
      </Card>
    </ErrorBoundary>
  )
}
