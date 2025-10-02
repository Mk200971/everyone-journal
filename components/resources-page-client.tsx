"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, BookOpen, Video, FileText, Headphones } from "lucide-react"
import Tilt from "react-parallax-tilt"

interface Resource {
  id: string
  title: string
  description: string
  type: string
  url: string
  created_at: string
}

interface ResourcesPageClientProps {
  resources: Resource[]
}

export function ResourcesPageClient({ resources }: ResourcesPageClientProps) {
  const [selectedResourceType, setSelectedResourceType] = useState("All Resources")

  const filteredResources = useMemo(
    () =>
      selectedResourceType === "All Resources"
        ? resources
        : resources.filter((resource) => resource.type.toLowerCase() === selectedResourceType.toLowerCase()),
    [resources, selectedResourceType],
  )

  const resourceCounts = useMemo(
    () => ({
      "All Resources": resources.length,
      Book: resources.filter((r) => r.type.toLowerCase() === "book").length,
      Video: resources.filter((r) => r.type.toLowerCase() === "video").length,
      Article: resources.filter((r) => r.type.toLowerCase() === "article").length,
      Podcast: resources.filter((r) => r.type.toLowerCase() === "podcast").length,
    }),
    [resources],
  )

  const getTypeConfig = (type: string) => {
    const normalizedType = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()

    switch (normalizedType) {
      case "Book":
        return {
          color:
            "bg-gradient-to-r from-blue-500/20 to-indigo-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30",
          icon: <BookOpen className="h-3 w-3 sm:h-4 sm:w-4" />,
        }
      case "Video":
        return {
          color: "bg-gradient-to-r from-red-500/20 to-pink-500/20 text-red-700 dark:text-red-300 border-red-500/30",
          icon: <Video className="h-3 w-3 sm:h-4 sm:w-4" />,
        }
      case "Article":
        return {
          color:
            "bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-700 dark:text-green-300 border-green-500/30",
          icon: <FileText className="h-3 w-3 sm:h-4 sm:w-4" />,
        }
      case "Podcast":
        return {
          color:
            "bg-gradient-to-r from-purple-500/20 to-violet-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30",
          icon: <Headphones className="h-3 w-3 sm:h-4 sm:w-4" />,
        }
      default:
        return {
          color:
            "bg-gradient-to-r from-gray-500/20 to-slate-500/20 text-gray-700 dark:text-gray-300 border-gray-500/30",
          icon: <FileText className="h-3 w-3 sm:h-4 sm:w-4" />,
        }
    }
  }

  return (
    <main className="pb-8 sm:pb-12">
      <div className="mb-6 sm:mb-8">
        <div className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 rounded-xl p-6 sm:p-8 mb-6 sm:mb-8">
          <h1 className="everyone-heading text-2xl sm:text-3xl lg:text-4xl mb-2 sm:mb-3 text-balance">
            Learning Resources
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg leading-relaxed text-pretty">
            Discover curated resources to enhance your customer-obsessed mindset and personal growth journey. Each
            resource has been carefully selected to support your development and inspire meaningful reflection.
          </p>
        </div>
      </div>

      <div className="mb-6 sm:mb-8">
        <div className="flex flex-wrap gap-2 sm:gap-3">
          {["All Resources", "Book", "Video", "Article", "Podcast"].map((type) => (
            <Button
              key={type}
              variant={selectedResourceType === type ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedResourceType(type)}
              className={`
                ${
                  selectedResourceType === type
                    ? "bg-primary text-primary-foreground"
                    : "bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground hover:bg-white/20 dark:hover:bg-black/30"
                }
                hover:scale-105 transition-all duration-300 active:scale-95 font-medium h-10 sm:h-11 px-4 sm:px-5 text-sm min-w-[80px] sm:min-w-[90px]
              `}
            >
              {type}
            </Button>
          ))}
        </div>
      </div>

      {filteredResources.length === 0 ? (
        <div className="text-center py-12 sm:py-16">
          <div className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 rounded-xl p-8 sm:p-12 max-w-md mx-auto">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-base sm:text-lg">
              {selectedResourceType === "All Resources"
                ? "No resources available yet."
                : `No ${selectedResourceType.toLowerCase()} resources found.`}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {selectedResourceType === "All Resources"
                ? "Check back soon for curated learning materials."
                : "Try selecting a different category above."}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {filteredResources.map((resource, index) => {
            const typeConfig = getTypeConfig(resource.type)

            return (
              <div
                key={resource.id}
                className="animate-in fade-in slide-in-from-bottom-4"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <Tilt
                  tiltMaxAngleX={8}
                  tiltMaxAngleY={8}
                  perspective={1000}
                  scale={1.02}
                  transitionSpeed={1500}
                  gyroscope={true}
                  glareEnable={true}
                  glareMaxOpacity={0.1}
                  glareColor="#ffffff"
                  glarePosition="all"
                  tiltEnable={typeof window !== "undefined" && window.innerWidth > 768}
                >
                  <Card className="h-full bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 rounded-xl hover:scale-[1.02] transition-all duration-500 cursor-pointer relative overflow-hidden group hover:shadow-2xl min-h-[280px] sm:min-h-[320px]">
                    <Badge
                      className={`absolute top-3 left-3 sm:top-4 sm:left-4 z-10 bg-white/10 dark:bg-black/20 backdrop-blur-md border border-white/20 dark:border-white/10 ${typeConfig.color} font-medium px-2.5 py-1 sm:px-3 sm:py-1 text-xs sm:text-sm flex items-center gap-1`}
                      variant="secondary"
                    >
                      {typeConfig.icon}
                      {resource.type}
                    </Badge>

                    <CardHeader className="pt-12 sm:pt-16 pb-3 sm:pb-4 px-4 sm:px-6">
                      <CardTitle className="text-lg sm:text-xl text-card-foreground font-bold leading-tight text-balance group-hover:text-primary transition-colors duration-300">
                        {resource.title}
                      </CardTitle>
                    </CardHeader>

                    <CardContent className="flex-1 pb-3 sm:pb-4 px-4 sm:px-6">
                      <p className="text-sm sm:text-base text-muted-foreground leading-relaxed text-pretty whitespace-pre-line">
                        {resource.description}
                      </p>
                    </CardContent>

                    <CardFooter className="pt-3 sm:pt-4 px-4 sm:px-6">
                      <Button
                        asChild
                        className="w-full bg-primary/90 hover:bg-primary backdrop-blur-lg border border-primary/40 hover:border-primary/60 group-hover:scale-105 transition-all duration-300 font-medium text-primary-foreground hover:text-white text-sm px-4 py-2 min-h-[40px] shadow-lg hover:shadow-xl"
                      >
                        <a href={resource.url} target="_blank" rel="noopener noreferrer">
                          Access Resource
                          <ExternalLink className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
                        </a>
                      </Button>
                    </CardFooter>
                  </Card>
                </Tilt>
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
