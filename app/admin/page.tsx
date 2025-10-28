"use client"

import type React from "react"

import { useState, useEffect, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Settings,
  Plus,
  Edit,
  Home,
  Download,
  BookOpen,
  Video,
  FileText,
  Headphones,
  MessageCircle,
  Send,
  Trash2,
  CheckCircle,
  GripVertical,
} from "lucide-react"
import { createMission, updateMission, deleteMission, exportAllData, updateMissionOrder } from "@/lib/actions"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import * as XLSX from "xlsx"
import { toast } from "@/components/ui/use-toast"
import { SchemaBuilder } from "@/components/schema-builder"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface Mission {
  id: string
  title: string
  description: string
  points_value: number
  type?: string
  resource_id?: string | null
  image_url?: string | null
  duration?: string | null
  coordinator?: string | null
  support_status?: string | null
  due_date?: string | null
  quote_id?: string | null
  submission_schema?: any
  max_submissions_per_user?: number
  instructions?: string | null
  tips_inspiration?: string | null // Changed from 'tips' to 'tips_inspiration'
  mission_number?: number
  display_order?: number
}

interface Resource {
  id: string
  title: string
  description: string
  type: string
  url: string
  created_at: string
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [missions, setMissions] = useState<Mission[]>([])
  const [resources, setResources] = useState<Resource[]>([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingMission, setEditingMission] = useState<Mission | null>(null)
  const [isAddResourceDialogOpen, setIsAddResourceDialogOpen] = useState(false)
  const [isEditResourceDialogOpen, setIsEditResourceDialogOpen] = useState(false)
  const [editingResource, setEditingResource] = useState<Resource | null>(null)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState<
    Array<{ role: "user" | "assistant"; content: string; timestamp?: string }>
  >([])
  const [chatInput, setChatInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [quotes, setQuotes] = useState<any[]>([])
  const [createMissionSchema, setCreateMissionSchema] = useState<any>(null)
  const [editMissionSchema, setEditMissionSchema] = useState<any>(null)
  const [draggedMission, setDraggedMission] = useState<Mission | null>(null)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null) // Added state for dragged index
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const [isCreatingMission, startCreateTransition] = useTransition()
  const [isUpdatingMission, startUpdateTransition] = useTransition()

  const missionTypes = [
    { value: "Action", label: "Action" },
    { value: "Core", label: "Core" },
    { value: "Lite", label: "Lite" },
    { value: "Elevate", label: "Elevate" },
  ]

  const resourceTypes = [
    { value: "Book", label: "Book", icon: BookOpen },
    { value: "Video", label: "Video", icon: Video },
    { value: "Article", label: "Article", icon: FileText },
    { value: "Podcast", label: "Podcast", icon: Headphones },
  ]

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === "EJ123") {
      setIsAuthenticated(true)
      setError("")
    } else {
      setError("Incorrect password")
    }
  }

  const fetchMissions = async () => {
    const supabase = createClient()
    const { data, error } = await supabase.from("missions").select("*").order("display_order", { ascending: true })

    if (!error && data) {
      setMissions(data)
    }
  }

  const fetchResources = async () => {
    const supabase = createClient()
    const { data, error } = await supabase.from("resources").select("*").order("created_at", { ascending: false })

    if (!error && data) {
      setResources(data)
    }
  }

  const fetchQuotes = async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("noticeboard_items")
      .select("*")
      .eq("is_active", true)
      .not("content", "is", null)
      .order("created_at", { ascending: false })

    if (!error && data) {
      setQuotes(data)
    }
  }

  const handleCreateMission = async (formData: FormData) => {
    startCreateTransition(async () => {
      try {
        // Clean up resource_id and quote_id - convert "none" to null
        const resourceId = formData.get("resource_id") as string
        const quoteId = formData.get("quote_id") as string

        if (resourceId === "none" || !resourceId) {
          formData.delete("resource_id")
        }

        if (quoteId === "none" || !quoteId) {
          formData.delete("quote_id")
        }

        // Convert due_date to ISO datetime format if provided
        const dueDate = formData.get("due_date") as string
        if (dueDate) {
          const dateObj = new Date(dueDate)
          formData.set("due_date", dateObj.toISOString())
        } else {
          formData.delete("due_date")
        }

        // Add submission schema if exists
        if (createMissionSchema) {
          formData.set("submission_schema", JSON.stringify(createMissionSchema))
        }

        const result = await createMission(formData)

        if (!result.success) {
          toast({
            title: "Error",
            description: result.error || "Failed to create mission",
            variant: "destructive",
          })
          return
        }

        setIsAddDialogOpen(false)
        setCreateMissionSchema(null)
        await fetchMissions()
        toast({
          title: "Mission Created",
          description: "The mission has been created successfully.",
        })
      } catch (error) {
        toast({
          title: "Creation Failed",
          description: `Failed to create mission: ${error instanceof Error ? error.message : "Unknown error"}`,
          variant: "destructive",
        })
      }
    })
  }

  const handleUpdateMission = async (formData: FormData) => {
    startUpdateTransition(async () => {
      try {
        // Clean up resource_id and quote_id - convert "none" to null
        const resourceId = formData.get("resource_id") as string
        const quoteId = formData.get("quote_id") as string

        if (resourceId === "none" || !resourceId) {
          formData.delete("resource_id")
        }

        if (quoteId === "none" || !quoteId) {
          formData.delete("quote_id")
        }

        // Convert due_date to ISO datetime format if provided
        const dueDate = formData.get("due_date") as string
        if (dueDate) {
          const dateObj = new Date(dueDate)
          formData.set("due_date", dateObj.toISOString())
        } else {
          formData.delete("due_date")
        }

        // Add submission schema if exists
        if (editMissionSchema !== undefined) {
          formData.set("submission_schema", editMissionSchema ? JSON.stringify(editMissionSchema) : "")
        }

        const result = await updateMission(formData)

        if (!result.success) {
          toast({
            title: "Error",
            description: result.error || "Failed to update mission",
            variant: "destructive",
          })
          return
        }

        setIsEditDialogOpen(false)
        setEditingMission(null)
        setEditMissionSchema(null)
        await fetchMissions()
        toast({
          title: "Mission Updated",
          description: "The mission has been updated successfully.",
        })
      } catch (error) {
        toast({
          title: "Update Failed",
          description: `Failed to update mission: ${error instanceof Error ? error.message : "Unknown error"}`,
          variant: "destructive",
        })
      }
    })
  }

  const handleDeleteMission = async (formData: FormData) => {
    try {
      await deleteMission(formData)
      fetchMissions()
    } catch (error) {
      console.error("Failed to delete mission:", error)
    }
  }

  const handleCreateResource = async (formData: FormData) => {
    try {
      const supabase = createClient()
      const { error } = await supabase.from("resources").insert({
        title: formData.get("title") as string,
        description: formData.get("description") as string,
        type: formData.get("type") as string,
        url: formData.get("url") as string,
      })

      if (error) throw error

      setIsAddResourceDialogOpen(false)
      fetchResources()
      // Revalidate the resources page
      window.location.href = window.location.href
    } catch (error) {
      console.error("Failed to create resource:", error)
      alert(`Failed to create resource: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  const handleUpdateResource = async (formData: FormData) => {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("resources")
        .update({
          title: formData.get("title") as string,
          description: formData.get("description") as string,
          type: formData.get("type") as string,
          url: formData.get("url") as string,
        })
        .eq("id", formData.get("id") as string)

      if (error) throw error

      setIsEditResourceDialogOpen(false)
      setEditingResource(null)
      fetchResources()
      // Revalidate the resources page
      window.location.href = window.location.href
    } catch (error) {
      console.error("Failed to update resource:", error)
      alert(`Failed to update resource: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  const handleDeleteResource = async (formData: FormData) => {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("resources")
        .delete()
        .eq("id", formData.get("id") as string)

      if (error) throw error

      fetchResources()
      // Revalidate the resources page
      window.location.href = window.location.href
    } catch (error) {
      console.error("Failed to delete resource:", error)
      alert(`Failed to delete resource: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  const exportToExcel = async () => {
    try {
      console.log("[v0] Starting comprehensive Excel export...")

      // Call server action that uses admin client
      const result = await exportAllData()

      if (!result.success) {
        throw new Error(result.error || "Export failed")
      }

      const { missions, profiles, submissions, resources, noticeboard_items } = result.data

      console.log("[v0] Missions fetched:", missions.length, "records")
      console.log("[v0] Profiles fetched:", profiles.length, "records")
      console.log("[v0] Submissions fetched:", submissions.length, "records")
      console.log("[v0] Resources fetched:", resources.length, "records")
      console.log("[v0] Noticeboard items fetched:", noticeboard_items.length, "records")

      // Check for any errors
      const errors = []

      if (errors.length > 0) {
        console.error("[v0] Export errors:", errors)
        alert(`Some data could not be exported:\n${errors.join("\n")}`)
      }

      const workbook = XLSX.utils.book_new()
      let sheetsAdded = 0

      // Add missions sheet
      if (missions && missions.length > 0) {
        const missionsSheet = XLSX.utils.json_to_sheet(missions)
        XLSX.utils.book_append_sheet(workbook, missionsSheet, "Missions")
        sheetsAdded++
        console.log("[v0] Added Missions sheet")
      }

      // Add profiles sheet (all users)
      if (profiles && profiles.length > 0) {
        const profilesSheet = XLSX.utils.json_to_sheet(profiles)
        XLSX.utils.book_append_sheet(workbook, profilesSheet, "Users")
        sheetsAdded++
        console.log("[v0] Added Users sheet")
      }

      // Add submissions sheet (all user responses)
      if (submissions && submissions.length > 0) {
        const submissionsSheet = XLSX.utils.json_to_sheet(submissions)
        XLSX.utils.book_append_sheet(workbook, submissionsSheet, "Submissions")
        sheetsAdded++
        console.log("[v0] Added Submissions sheet with", submissions.length, "records")
      }

      // Add resources sheet
      if (resources && resources.length > 0) {
        const resourcesSheet = XLSX.utils.json_to_sheet(resources)
        XLSX.utils.book_append_sheet(workbook, resourcesSheet, "Resources")
        sheetsAdded++
        console.log("[v0] Added Resources sheet")
      }

      // Add noticeboard items sheet (quotes)
      if (noticeboard_items && noticeboard_items.length > 0) {
        const noticeboardSheet = XLSX.utils.json_to_sheet(noticeboard_items)
        XLSX.utils.book_append_sheet(workbook, noticeboardSheet, "Quotes")
        sheetsAdded++
        console.log("[v0] Added Quotes sheet")
      }

      console.log("[v0] Workbook created with", sheetsAdded, "sheets:", workbook.SheetNames)

      if (sheetsAdded === 0) {
        alert("No data available to export. Please check your database connection.")
        return
      }

      // Generate filename with current date and time
      const now = new Date()
      const date = now.toISOString().split("T")[0]
      const time = now.toTimeString().split(" ")[0].replace(/:/g, "-")
      const filename = `everyone-journal-complete-export-${date}-${time}.xlsx`

      // Create binary string from workbook
      const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" })

      // Create blob and download
      const blob = new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
      const url = window.URL.createObjectURL(blob)

      // Create temporary download link
      const link = document.createElement("a")
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()

      // Cleanup
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      console.log("[v0] Complete Excel export successful:", filename)

      // Show success message with details
      const totalRecords = [
        missions.length || 0,
        profiles.length || 0,
        submissions.length || 0,
        resources.length || 0,
        noticeboard_items.length || 0,
      ].reduce((sum, count) => sum + count, 0)

      alert(
        `Complete database export successful!\n\n` +
          `📊 ${sheetsAdded} sheets exported\n` +
          `📝 ${totalRecords} total records\n` +
          `📋 Includes: ${workbook.SheetNames.join(", ")}\n\n` +
          `File: ${filename}`,
      )
    } catch (error) {
      console.error("[v0] Failed to export complete database:", error)
      alert(`Failed to export data: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim() || isLoading) return

    const userMessage = chatInput.trim()
    setChatInput("")
    setChatMessages((prev) => [...prev, { role: "user", content: userMessage, timestamp: new Date().toISOString() }])
    setIsLoading(true)

    try {
      const response = await fetch("/api/admin/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
          conversationHistory: chatMessages,
        }),
      })

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      if (data.conversationHistory) {
        setChatMessages(data.conversationHistory)
      } else {
        setChatMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.response, timestamp: new Date().toISOString() },
        ])
      }
    } catch (error) {
      console.error("Chat error:", error)
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I encountered an error processing your request. Please try again.",
          timestamp: new Date().toISOString(),
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleDragStart = (e: React.DragEvent, mission: Mission, index: number) => {
    console.log("[v0] Drag started:", mission.title, "at index", index)
    setDraggedMission(mission)
    setDraggedIndex(index) // Set the dragged index
    e.dataTransfer.effectAllowed = "move"
    // Add a slight delay to allow the drag image to be set
    setTimeout(() => {
      const target = e.target as HTMLElement
      target.style.opacity = "0.5"
    }, 0)
  }

  const handleDragEnd = (e: React.DragEvent) => {
    console.log("[v0] Drag ended")
    const target = e.target as HTMLElement
    target.style.opacity = "1"
    setDraggedMission(null)
    setDraggedIndex(null) // Clear the dragged index
    setDragOverIndex(null)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDragOverIndex(index)
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = async (e: React.DragEvent, targetMission: Mission, targetIndex: number) => {
    e.preventDefault()
    console.log("[v0] Drop triggered on:", targetMission.title, "at index", targetIndex)
    setDragOverIndex(null)

    if (!draggedMission || draggedMission.id === targetMission.id) {
      console.log("[v0] Drop cancelled - same mission or no dragged mission")
      return
    }

    console.log("[v0] Reordering from", draggedMission.title, "to", targetMission.title)

    // Create a new array with reordered missions
    const reorderedMissions = [...missions]
    const draggedIndex = reorderedMissions.findIndex((m) => m.id === draggedMission.id)

    // Remove dragged item and insert at new position
    reorderedMissions.splice(draggedIndex, 1)
    reorderedMissions.splice(targetIndex, 0, draggedMission)

    // Update display_order for all affected missions
    const updatedMissions = reorderedMissions.map((mission, index) => ({
      ...mission,
      display_order: index,
    }))

    console.log(
      "[v0] Updated missions order:",
      updatedMissions.map((m) => `${m.title}:${m.display_order}`),
    )

    // Optimistically update UI
    setMissions(updatedMissions)

    try {
      console.log("[v0] Calling server action to update mission order...")

      // Prepare data for server action
      const missionsToUpdate = updatedMissions.map((mission) => ({
        id: mission.id,
        display_order: mission.display_order,
      }))

      await updateMissionOrder(missionsToUpdate)

      console.log("[v0] Server action completed successfully")
      toast({
        title: "Order Updated",
        description: "Mission order has been saved successfully.",
      })
    } catch (error) {
      console.error("[v0] Failed to update mission order:", error)
      toast({
        title: "Update Failed",
        description: "Failed to save mission order. Please try again.",
        variant: "destructive",
      })
      // Revert on error
      fetchMissions()
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      fetchMissions()
      fetchResources()
      fetchQuotes()
    }
  }, [isAuthenticated])

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-3 sm:p-4 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
          <div
            className="absolute top-40 right-20 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: "2s" }}
          ></div>
          <div
            className="absolute bottom-20 left-1/3 w-80 h-80 bg-accent/10 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: "4s" }}
          ></div>
        </div>

        <Card className="w-full max-w-md bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 relative z-10">
          <CardHeader className="text-center p-4 sm:p-6">
            <div className="flex justify-center mb-3 sm:mb-4">
              <div className="p-2 sm:p-3 bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 rounded-lg">
                <Settings className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-foreground text-xl sm:text-2xl">Admin Access</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <Label htmlFor="password" className="text-foreground text-sm sm:text-base">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground placeholder:text-muted-foreground h-11 sm:h-10"
                />
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground hover:scale-105 transition-all duration-300 h-11 sm:h-10"
              >
                Submit
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-3 sm:p-4 relative overflow-hidden bg-gradient-to-br from-background via-background to-primary/5">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute top-40 right-20 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "2s" }}
        ></div>
        <div
          className="absolute bottom-20 left-1/3 w-80 h-80 bg-accent/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "4s" }}
        ></div>
      </div>

      <div className="max-w-6xl mx-auto space-y-6 sm:space-8 relative z-10">
        <header className="sticky top-0 z-50 py-3 sm:py-6 mb-6 sm:mb-12 bg-white/10 dark:bg-black/20 backdrop-blur-xl border-b border-white/20 dark:border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-4xl font-bold text-foreground mb-1 sm:mb-2 text-balance">
                Journal Management
              </h1>
              <p className="text-muted-foreground text-sm sm:text-lg">Create and manage journal missions for users</p>
            </div>
            <div className="relative flex items-center">
              <div className="flex items-center gap-2 sm:gap-4 flex-wrap pb-2 sm:pb-0">
                {/* Navigation Group */}
                <Link href="/" className="flex-shrink-0">
                  <Button
                    variant="outline"
                    className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground hover:bg-primary hover:text-white hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2 h-12 sm:h-11 px-4 sm:px-6 whitespace-nowrap"
                  >
                    <Home className="h-4 w-4" />
                    <span className="hidden sm:inline">Back to Home</span>
                  </Button>
                </Link>

                {/* Management Group */}
                <Link href="/admin/submissions" className="flex-shrink-0">
                  <Button
                    variant="outline"
                    className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground hover:bg-primary hover:text-white hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2 h-12 sm:h-11 px-4 sm:px-6 whitespace-nowrap"
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span className="hidden sm:inline">Review Submissions</span>
                  </Button>
                </Link>
                <Link href="/admin/quotes" className="flex-shrink-0">
                  <Button
                    variant="outline"
                    className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground hover:bg-primary hover:text-white hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2 h-12 sm:h-11 px-4 sm:px-6 whitespace-nowrap"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span className="hidden sm:inline">Manage Noticeboard</span>
                  </Button>
                </Link>

                {/* Tools Group */}
                <Button
                  onClick={exportToExcel}
                  variant="outline"
                  className="flex-shrink-0 bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground hover:bg-primary hover:text-white hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2 h-12 sm:h-11 px-4 sm:px-6 whitespace-nowrap"
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Export Excel</span>
                </Button>
                <Button
                  onClick={() => setIsChatOpen(true)}
                  variant="outline"
                  className="flex-shrink-0 bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground hover:bg-primary hover:text-white hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2 h-12 sm:h-11 px-4 sm:px-6 whitespace-nowrap"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span className="hidden sm:inline">AI Chat</span>
                </Button>

                {/* Action Group */}
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="flex-shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2 h-12 sm:h-11 px-4 sm:px-6 whitespace-nowrap">
                      <Plus className="h-4 w-4" />
                      <span className="hidden sm:inline">Add New Activity</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 mx-3 sm:mx-0 max-w-md sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="text-foreground">Add New Mission</DialogTitle>
                    </DialogHeader>
                    <form action={handleCreateMission} className="space-y-4">
                      <div>
                        <Label htmlFor="title" className="text-foreground">
                          Title
                        </Label>
                        <Input
                          id="title"
                          name="title"
                          required
                          className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground placeholder:text-muted-foreground"
                        />
                      </div>
                      <div>
                        <Label htmlFor="description" className="text-foreground">
                          Description
                        </Label>
                        <Textarea
                          id="description"
                          name="description"
                          required
                          className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground placeholder:text-muted-foreground"
                        />
                      </div>
                      <div>
                        <Label htmlFor="instructions" className="text-foreground">
                          Mission Instructions (Optional)
                        </Label>
                        <Textarea
                          id="instructions"
                          name="instructions"
                          placeholder="Enter step-by-step instructions for completing this mission..."
                          className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground placeholder:text-muted-foreground"
                          rows={4}
                        />
                      </div>
                      <div>
                        <Label htmlFor="tips_inspiration" className="text-foreground">
                          {" "}
                          {/* Updated label */}
                          Tips & Inspiration (Optional)
                        </Label>
                        <Textarea
                          id="tips_inspiration" // Updated id
                          name="tips_inspiration" // Updated name
                          placeholder="Share helpful tips, inspiration, or examples to guide users..."
                          className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground placeholder:text-muted-foreground"
                          rows={4}
                        />
                      </div>
                      <div>
                        <Label htmlFor="mission-image" className="text-foreground">
                          Mission Image (Optional)
                        </Label>
                        <Input
                          id="mission-image"
                          name="mission_image"
                          type="file"
                          accept="image/*"
                          className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground file:bg-primary file:text-primary-foreground file:border-0 file:rounded-md file:px-3 file:py-1 file:mr-3"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Upload an image to make the mission more engaging
                        </p>
                      </div>
                      <div>
                        <Label htmlFor="duration" className="text-foreground">
                          Duration
                        </Label>
                        <Input
                          id="duration"
                          name="duration"
                          placeholder="e.g., 1 Day, 2 Hours, 1 Week"
                          className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground placeholder:text-muted-foreground"
                        />
                      </div>
                      <div>
                        <Label htmlFor="coordinator" className="text-foreground">
                          Coordinator
                        </Label>
                        <Input
                          id="coordinator"
                          name="coordinator"
                          placeholder="e.g., With Coordinator, Self-Guided"
                          className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground placeholder:text-muted-foreground"
                        />
                      </div>
                      <div>
                        <Label htmlFor="support_status" className="text-foreground">
                          Support Status
                        </Label>
                        <Input
                          id="support_status"
                          name="support_status"
                          placeholder="e.g., Supported, Independent, Team-Based"
                          className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground placeholder:text-muted-foreground"
                        />
                      </div>
                      <div>
                        <Label htmlFor="due_date" className="text-foreground">
                          Due Date (Optional)
                        </Label>
                        <Input
                          id="due_date"
                          name="due_date"
                          type="date"
                          className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground placeholder:text-muted-foreground"
                        />
                      </div>
                      <div>
                        <Label htmlFor="type" className="text-foreground">
                          Mission Type
                        </Label>
                        <Select name="type" required>
                          <SelectTrigger className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground">
                            <SelectValue placeholder="Select mission type" />
                          </SelectTrigger>
                          <SelectContent className="bg-white/90 dark:bg-black/90 backdrop-blur-lg border border-white/20 dark:border-white/10">
                            {missionTypes.map((type) => (
                              <SelectItem
                                key={type.value}
                                value={type.value}
                                className="text-foreground hover:bg-primary/20"
                              >
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="resource_id" className="text-foreground">
                          Linked Resource (Optional)
                        </Label>
                        <Select name="resource_id">
                          <SelectTrigger className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground">
                            <SelectValue placeholder="Select a resource (optional)" />
                          </SelectTrigger>
                          <SelectContent className="bg-white/90 dark:bg-black/90 backdrop-blur-lg border border-white/20 dark:border-white/10">
                            <SelectItem value="none" className="text-foreground hover:bg-primary/20">
                              <span className="text-muted-foreground">None</span>
                            </SelectItem>
                            {resources.map((resource) => {
                              const typeConfig = resourceTypes.find((t) => t.value === resource.type)
                              return (
                                <SelectItem
                                  key={resource.id}
                                  value={resource.id}
                                  className="text-foreground hover:bg-primary/20"
                                >
                                  <div className="flex items-center gap-2">
                                    {typeConfig && <typeConfig.icon className="h-4 w-4" />}
                                    <span className="truncate max-w-[200px]">{resource.title}</span>
                                  </div>
                                </SelectItem>
                              )
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="quote_id" className="text-foreground">
                          Linked Quote (Optional)
                        </Label>
                        <Select name="quote_id">
                          <SelectTrigger className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground">
                            <SelectValue placeholder="Select a quote (optional)" />
                          </SelectTrigger>
                          <SelectContent className="bg-white/90 dark:bg-black/90 backdrop-blur-lg border border-white/20 dark:border-white/10">
                            <SelectItem value="none" className="text-foreground hover:bg-primary/20">
                              <span className="text-muted-foreground">None</span>
                            </SelectItem>
                            {quotes.map((quote) => (
                              <SelectItem
                                key={quote.id}
                                value={quote.id}
                                className="text-foreground hover:bg-primary/20"
                              >
                                <div className="flex flex-col gap-1 max-w-[300px]">
                                  <span className="truncate text-sm font-medium">
                                    {quote.content?.substring(0, 50)}...
                                  </span>
                                  <span className="text-xs text-muted-foreground">— {quote.author}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="points_value" className="text-foreground">
                          Points Value
                        </Label>
                        <Input
                          id="points_value"
                          name="points_value"
                          type="number"
                          required
                          className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground placeholder:text-muted-foreground"
                        />
                      </div>
                      <div>
                        <Label htmlFor="max_submissions_per_user" className="text-foreground">
                          Max Submissions Per User
                        </Label>
                        <Input
                          id="max_submissions_per_user"
                          name="max_submissions_per_user"
                          type="number"
                          defaultValue="1"
                          min="1"
                          max="10"
                          className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground placeholder:text-muted-foreground"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          How many times can each user submit this mission? (1-10)
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="mission_number" className="text-foreground">
                            Mission Number
                          </Label>
                          <Input
                            id="mission_number"
                            name="mission_number"
                            type="number"
                            min="1"
                            placeholder="e.g., 1, 2, 3..."
                            className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground placeholder:text-muted-foreground"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Mission number for identification (optional)
                          </p>
                        </div>
                        <div>
                          <Label htmlFor="display_order" className="text-foreground">
                            Display Order
                          </Label>
                          <Input
                            id="display_order"
                            name="display_order"
                            type="number"
                            min="0"
                            defaultValue="0"
                            placeholder="0"
                            className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground placeholder:text-muted-foreground"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Lower numbers appear first (0 = highest priority)
                          </p>
                        </div>
                      </div>

                      <div className="border-t border-white/20 dark:border-white/10 pt-6">
                        <SchemaBuilder initialSchema={null} onSchemaChange={setCreateMissionSchema} />
                      </div>

                      <Button
                        type="submit"
                        disabled={isCreatingMission}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                      >
                        {isCreatingMission ? "Creating..." : "Create Mission"}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2 h-12 sm:h-11 px-4 sm:px-6">
                      <Edit className="h-4 w-4" />
                      <span className="sm:inline">Edit Activity</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 mx-3 sm:mx-0 max-w-md sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="text-foreground">Edit Mission</DialogTitle>
                    </DialogHeader>
                    <form action={handleUpdateMission} className="space-y-4">
                      {editingMission && (
                        <>
                          <input type="hidden" name="id" value={editingMission.id} />
                          <div>
                            <Label htmlFor="edit-title" className="text-foreground">
                              Title
                            </Label>
                            <Input
                              id="edit-title"
                              name="title"
                              defaultValue={editingMission.title}
                              required
                              className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground placeholder:text-muted-foreground"
                            />
                          </div>
                          <div>
                            <Label htmlFor="edit-description" className="text-foreground">
                              Description
                            </Label>
                            <Textarea
                              id="edit-description"
                              name="description"
                              defaultValue={editingMission.description}
                              required
                              className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground placeholder:text-muted-foreground"
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="edit-mission_number" className="text-foreground">
                                Mission Number
                              </Label>
                              <Input
                                id="edit-mission_number"
                                name="mission_number"
                                type="number"
                                min="1"
                                defaultValue={editingMission.mission_number?.toString() || ""}
                                placeholder="e.g., 1, 2, 3..."
                                className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground placeholder:text-muted-foreground"
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                Mission number for identification (optional)
                              </p>
                            </div>
                            <div>
                              <Label htmlFor="edit-display_order" className="text-foreground">
                                Display Order
                              </Label>
                              <Input
                                id="edit-display_order"
                                name="display_order"
                                type="number"
                                min="0"
                                defaultValue={editingMission.display_order?.toString() || "0"}
                                placeholder="0"
                                className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground placeholder:text-muted-foreground"
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                Lower numbers appear first (0 = highest priority)
                              </p>
                            </div>
                          </div>

                          <div>
                            <Label htmlFor="edit-mission-image" className="text-foreground">
                              Mission Image (Optional)
                            </Label>
                            <Input
                              id="edit-mission-image"
                              name="mission_image"
                              type="file"
                              accept="image/*"
                              className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground file:bg-primary file:text-primary-foreground file:border-0 file:rounded-md file:px-3 file:py-1 file:mr-3"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Upload an image to make the mission more engaging
                            </p>
                          </div>
                          <div>
                            <Label htmlFor="edit-duration" className="text-foreground">
                              Duration
                            </Label>
                            <Input
                              id="edit-duration"
                              name="duration"
                              defaultValue={editingMission.duration || ""}
                              placeholder="e.g., 1 Day, 2 Hours, 1 Week"
                              className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground placeholder:text-muted-foreground"
                            />
                          </div>
                          <div>
                            <Label htmlFor="edit-coordinator" className="text-foreground">
                              Coordinator
                            </Label>
                            <Input
                              id="edit-coordinator"
                              name="coordinator"
                              defaultValue={editingMission.coordinator || ""}
                              placeholder="e.g., With Coordinator, Self-Guided"
                              className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground placeholder:text-muted-foreground"
                            />
                          </div>
                          <div>
                            <Label htmlFor="edit-support_status" className="text-foreground">
                              Support Status
                            </Label>
                            <Input
                              id="edit-support_status"
                              name="support_status"
                              defaultValue={editingMission.support_status || ""}
                              placeholder="e.g., Supported, Independent, Team-Based"
                              className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground placeholder:text-muted-foreground"
                            />
                          </div>
                          <div>
                            <Label htmlFor="edit-due_date" className="text-foreground">
                              Due Date (Optional)
                            </Label>
                            <Input
                              id="edit-due_date"
                              name="due_date"
                              type="date"
                              defaultValue={editingMission.due_date || ""}
                              className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground placeholder:text-muted-foreground"
                            />
                          </div>
                          <div>
                            <Label htmlFor="edit-type" className="text-foreground">
                              Mission Type
                            </Label>
                            <Select
                              key={`type-${editingMission.id}`}
                              name="type"
                              required
                              defaultValue={editingMission.type || ""}
                            >
                              <SelectTrigger className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground">
                                <SelectValue placeholder="Select mission type" />
                              </SelectTrigger>
                              <SelectContent className="bg-white/90 dark:bg-black/90 backdrop-blur-lg border border-white/20 dark:border-white/10">
                                {missionTypes.map((type) => (
                                  <SelectItem
                                    key={type.value}
                                    value={type.value}
                                    className="text-foreground hover:bg-primary/20"
                                  >
                                    {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="edit-resource_id" className="text-foreground">
                              Linked Resource (Optional)
                            </Label>
                            <Select name="resource_id" defaultValue={editingMission.resource_id || ""}>
                              <SelectTrigger className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground">
                                <SelectValue placeholder="Select a resource (optional)" />
                              </SelectTrigger>
                              <SelectContent className="bg-white/90 dark:bg-black/90 backdrop-blur-lg border border-white/20 dark:border-white/10">
                                <SelectItem value="none" className="text-foreground hover:bg-primary/20">
                                  <span className="text-muted-foreground">None</span>
                                </SelectItem>
                                {resources.map((resource) => {
                                  const typeConfig = resourceTypes.find((t) => t.value === resource.type)
                                  return (
                                    <SelectItem
                                      key={resource.id}
                                      value={resource.id}
                                      className="text-foreground hover:bg-primary/20"
                                    >
                                      <div className="flex items-center gap-2">
                                        {typeConfig && <typeConfig.icon className="h-4 w-4" />}
                                        <span className="truncate max-w-[200px]">{resource.title}</span>
                                      </div>
                                    </SelectItem>
                                  )
                                })}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="edit-quote_id" className="text-foreground">
                              Linked Quote (Optional)
                            </Label>
                            <Select name="quote_id" defaultValue={editingMission.quote_id || ""}>
                              <SelectTrigger className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground">
                                <SelectValue placeholder="Select a quote (optional)" />
                              </SelectTrigger>
                              <SelectContent className="bg-white/90 dark:bg-black/90 backdrop-blur-lg border border-white/20 dark:border-white/10">
                                <SelectItem value="none" className="text-foreground hover:bg-primary/20">
                                  <span className="text-muted-foreground">None</span>
                                </SelectItem>
                                {quotes.map((quote) => (
                                  <SelectItem
                                    key={quote.id}
                                    value={quote.id}
                                    className="text-foreground hover:bg-primary/20"
                                  >
                                    <div className="flex flex-col gap-1 max-w-[300px]">
                                      <span className="truncate text-sm font-medium">
                                        {quote.content?.substring(0, 50)}...
                                      </span>
                                      <span className="text-xs text-muted-foreground">— {quote.author}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="edit-points_value" className="text-foreground">
                              Points Value
                            </Label>
                            <Input
                              id="edit-points_value"
                              name="points_value"
                              type="number"
                              defaultValue={editingMission.points_value.toString()}
                              required
                              className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground placeholder:text-muted-foreground"
                            />
                          </div>
                          <div>
                            <Label htmlFor="edit-max_submissions_per_user" className="text-foreground">
                              Max Submissions Per User
                            </Label>
                            <Input
                              id="edit-max_submissions_per_user"
                              name="max_submissions_per_user"
                              type="number"
                              defaultValue={editingMission.max_submissions_per_user?.toString() || "1"}
                              min="1"
                              max="10"
                              className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground placeholder:text-muted-foreground"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              How many times can each user submit this mission? (1-10)
                            </p>
                          </div>

                          <div>
                            <Label htmlFor="edit-instructions" className="text-foreground">
                              Mission Instructions (Optional)
                            </Label>
                            <Textarea
                              id="edit-instructions"
                              name="instructions"
                              defaultValue={editingMission.instructions || ""}
                              placeholder="Enter step-by-step instructions for completing this mission..."
                              className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground placeholder:text-muted-foreground"
                              rows={4}
                            />
                          </div>
                          <div>
                            <Label htmlFor="edit-tips_inspiration" className="text-foreground">
                              {" "}
                              {/* Updated label */}
                              Tips & Inspiration (Optional)
                            </Label>
                            <Textarea
                              id="edit-tips_inspiration" // Updated id
                              name="tips_inspiration" // Updated name
                              defaultValue={editingMission.tips_inspiration || ""}
                              placeholder="Share helpful tips, inspiration, or examples to guide users..."
                              className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground placeholder:text-muted-foreground"
                              rows={4}
                            />
                          </div>

                          <div className="border-t border-white/20 dark:border-white/10 pt-6">
                            <SchemaBuilder
                              initialSchema={editingMission.submission_schema || null}
                              onSchemaChange={setEditMissionSchema}
                            />
                          </div>

                          <Button
                            type="submit"
                            disabled={isUpdatingMission}
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                          >
                            {isUpdatingMission ? "Updating..." : "Update Mission"}
                          </Button>
                        </>
                      )}
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white/20 dark:from-black/20 to-transparent pointer-events-none"></div>
            </div>
          </div>
        </header>

        <Card className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10">
          <CardContent className="p-3 sm:p-6">
            <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-sm text-foreground flex items-center gap-2">
                <GripVertical className="h-4 w-4" />
                <span>Drag and drop missions to reorder them. Changes are saved automatically.</span>
              </p>
            </div>
            <div className="bg-white/5 dark:bg-black/10 backdrop-blur-lg rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-white/10 dark:border-white/5">
                      <TableHead className="text-foreground font-semibold text-sm sm:text-base w-[40px]"></TableHead>
                      <TableHead className="text-foreground font-semibold text-sm sm:text-base min-w-[120px]">
                        Title
                      </TableHead>
                      <TableHead className="text-foreground font-semibold text-sm sm:text-base min-w-[80px]">
                        Mission #
                      </TableHead>
                      <TableHead className="text-foreground font-semibold text-sm sm:text-base min-w-[80px]">
                        Order
                      </TableHead>
                      <TableHead className="text-foreground font-semibold text-sm sm:text-base min-w-[80px]">
                        Type
                      </TableHead>
                      <TableHead className="text-foreground font-semibold text-sm sm:text-base min-w-[120px]">
                        Resource
                      </TableHead>
                      <TableHead className="text-foreground font-semibold text-sm sm:text-base min-w-[80px]">
                        Points
                      </TableHead>
                      <TableHead className="text-foreground font-semibold text-sm sm:text-base min-w-[80px]">
                        Schema
                      </TableHead>
                      <TableHead className="text-foreground font-semibold text-sm sm:text-base min-w-[100px]">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {missions.map((mission, index) => {
                      const linkedResource = resources.find((r) => r.id === mission.resource_id)
                      const resourceTypeConfig = linkedResource
                        ? resourceTypes.find((t) => t.value === linkedResource.type)
                        : null

                      return (
                        <TableRow
                          key={mission.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, mission, index)}
                          onDragEnd={handleDragEnd}
                          onDragOver={(e) => handleDragOver(e, index)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, mission, index)}
                          className={`border-b border-white/5 dark:border-white/5 hover:bg-white/5 dark:hover:bg-black/10 transition-colors cursor-move ${
                            dragOverIndex === index ? "border-t-2 border-t-blue-500" : ""
                          }`}
                        >
                          <TableCell className="text-foreground">
                            <GripVertical className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors cursor-grab active:cursor-grabbing" />
                          </TableCell>
                          <TableCell className="text-foreground font-medium text-sm sm:text-base max-w-[200px] truncate">
                            {mission.title}
                          </TableCell>
                          <TableCell className="text-foreground text-sm sm:text-base">
                            {mission.mission_number || "-"}
                          </TableCell>
                          <TableCell className="text-foreground text-sm sm:text-base">
                            <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded-md text-xs whitespace-nowrap">
                              {mission.display_order || 0}
                            </span>
                          </TableCell>
                          <TableCell className="text-foreground">
                            <span className="capitalize bg-primary/20 text-primary px-2 py-1 rounded-md text-xs sm:text-sm whitespace-nowrap">
                              {mission.type || "action"}
                            </span>
                          </TableCell>
                          <TableCell className="text-foreground">
                            {linkedResource ? (
                              <div className="flex items-center gap-2">
                                {resourceTypeConfig && <resourceTypeConfig.icon className="h-4 w-4" />}
                                <span
                                  className="text-xs sm:text-sm truncate max-w-[100px]"
                                  title={linkedResource.title}
                                >
                                  {linkedResource.title}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs sm:text-sm">No resource</span>
                            )}
                          </TableCell>
                          <TableCell className="text-foreground text-sm sm:text-base">{mission.points_value}</TableCell>
                          <TableCell className="text-foreground">
                            {mission.submission_schema && mission.submission_schema.fields?.length > 0 ? (
                              <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded-md text-xs whitespace-nowrap">
                                Custom ({mission.submission_schema.fields.length} fields)
                              </span>
                            ) : (
                              <span className="bg-gray-500/20 text-gray-400 px-2 py-1 rounded-md text-xs whitespace-nowrap">
                                Default
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 sm:gap-2">
                              <Dialog
                                open={isEditDialogOpen && editingMission?.id === mission.id}
                                onOpenChange={(open) => {
                                  setIsEditDialogOpen(open)
                                  if (!open) {
                                    setEditingMission(null)
                                    setEditMissionSchema(null)
                                  }
                                }}
                              >
                                <DialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setEditingMission(mission)
                                      setEditMissionSchema(mission.submission_schema)
                                    }}
                                    className="h-8 w-8 sm:h-9 sm:w-9 p-0 bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground hover:bg-primary hover:text-white hover:scale-105 transition-all duration-300"
                                  >
                                    <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 mx-3 sm:mx-0 max-w-md sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                                  <DialogHeader>
                                    <DialogTitle className="text-foreground">Edit Mission</DialogTitle>
                                  </DialogHeader>
                                  <form action={handleUpdateMission} className="space-y-4">
                                    {editingMission && (
                                      <>
                                        <input type="hidden" name="id" value={editingMission.id} />
                                        <div>
                                          <Label htmlFor="edit-title" className="text-foreground">
                                            Title
                                          </Label>
                                          <Input
                                            id="edit-title"
                                            name="title"
                                            defaultValue={editingMission.title}
                                            required
                                            className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground placeholder:text-muted-foreground"
                                          />
                                        </div>
                                        <div>
                                          <Label htmlFor="edit-description" className="text-foreground">
                                            Description
                                          </Label>
                                          <Textarea
                                            id="edit-description"
                                            name="description"
                                            defaultValue={editingMission.description}
                                            required
                                            className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground placeholder:text-muted-foreground"
                                          />
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                          <div>
                                            <Label htmlFor="edit-mission_number" className="text-foreground">
                                              Mission Number
                                            </Label>
                                            <Input
                                              id="edit-mission_number"
                                              name="mission_number"
                                              type="number"
                                              min="1"
                                              defaultValue={editingMission.mission_number?.toString() || ""}
                                              placeholder="e.g., 1, 2, 3..."
                                              className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground placeholder:text-muted-foreground"
                                            />
                                            <p className="text-xs text-muted-foreground mt-1">
                                              Mission number for identification (optional)
                                            </p>
                                          </div>
                                          <div>
                                            <Label htmlFor="edit-display_order" className="text-foreground">
                                              Display Order
                                            </Label>
                                            <Input
                                              id="edit-display_order"
                                              name="display_order"
                                              type="number"
                                              min="0"
                                              defaultValue={editingMission.display_order?.toString() || "0"}
                                              placeholder="0"
                                              className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground placeholder:text-muted-foreground"
                                            />
                                            <p className="text-xs text-muted-foreground mt-1">
                                              Lower numbers appear first (0 = highest priority)
                                            </p>
                                          </div>
                                        </div>

                                        <div>
                                          <Label htmlFor="edit-mission-image" className="text-foreground">
                                            Mission Image (Optional)
                                          </Label>
                                          <Input
                                            id="edit-mission-image"
                                            name="mission_image"
                                            type="file"
                                            accept="image/*"
                                            className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground file:bg-primary file:text-primary-foreground file:border-0 file:rounded-md file:px-3 file:py-1 file:mr-3"
                                          />
                                          <p className="text-xs text-muted-foreground mt-1">
                                            Upload an image to make the mission more engaging
                                          </p>
                                        </div>
                                        <div>
                                          <Label htmlFor="edit-duration" className="text-foreground">
                                            Duration
                                          </Label>
                                          <Input
                                            id="edit-duration"
                                            name="duration"
                                            defaultValue={editingMission.duration || ""}
                                            placeholder="e.g., 1 Day, 2 Hours, 1 Week"
                                            className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground placeholder:text-muted-foreground"
                                          />
                                        </div>
                                        <div>
                                          <Label htmlFor="edit-coordinator" className="text-foreground">
                                            Coordinator
                                          </Label>
                                          <Input
                                            id="edit-coordinator"
                                            name="coordinator"
                                            defaultValue={editingMission.coordinator || ""}
                                            placeholder="e.g., With Coordinator, Self-Guided"
                                            className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground placeholder:text-muted-foreground"
                                          />
                                        </div>
                                        <div>
                                          <Label htmlFor="edit-support_status" className="text-foreground">
                                            Support Status
                                          </Label>
                                          <Input
                                            id="edit-support_status"
                                            name="support_status"
                                            defaultValue={editingMission.support_status || ""}
                                            placeholder="e.g., Supported, Independent, Team-Based"
                                            className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground placeholder:text-muted-foreground"
                                          />
                                        </div>
                                        <div>
                                          <Label htmlFor="edit-due_date" className="text-foreground">
                                            Due Date (Optional)
                                          </Label>
                                          <Input
                                            id="edit-due_date"
                                            name="due_date"
                                            type="date"
                                            defaultValue={editingMission.due_date || ""}
                                            className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground placeholder:text-muted-foreground"
                                          />
                                        </div>
                                        <div>
                                          <Label htmlFor="edit-type" className="text-foreground">
                                            Mission Type
                                          </Label>
                                          <Select
                                            key={`type-${editingMission.id}`}
                                            name="type"
                                            required
                                            defaultValue={editingMission.type || ""}
                                          >
                                            <SelectTrigger className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground">
                                              <SelectValue placeholder="Select mission type" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-white/90 dark:bg-black/90 backdrop-blur-lg border border-white/20 dark:border-white/10">
                                              {missionTypes.map((type) => (
                                                <SelectItem
                                                  key={type.value}
                                                  value={type.value}
                                                  className="text-foreground hover:bg-primary/20"
                                                >
                                                  {type.label}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        </div>
                                        <div>
                                          <Label htmlFor="edit-resource_id" className="text-foreground">
                                            Linked Resource (Optional)
                                          </Label>
                                          <Select name="resource_id" defaultValue={editingMission.resource_id || ""}>
                                            <SelectTrigger className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground">
                                              <SelectValue placeholder="Select a resource (optional)" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-white/90 dark:bg-black/90 backdrop-blur-lg border border-white/20 dark:border-white/10">
                                              <SelectItem value="none" className="text-foreground hover:bg-primary/20">
                                                <span className="text-muted-foreground">None</span>
                                              </SelectItem>
                                              {resources.map((resource) => {
                                                const typeConfig = resourceTypes.find((t) => t.value === resource.type)
                                                return (
                                                  <SelectItem
                                                    key={resource.id}
                                                    value={resource.id}
                                                    className="text-foreground hover:bg-primary/20"
                                                  >
                                                    <div className="flex items-center gap-2">
                                                      {typeConfig && <typeConfig.icon className="h-4 w-4" />}
                                                      <span className="truncate max-w-[200px]">{resource.title}</span>
                                                    </div>
                                                  </SelectItem>
                                                )
                                              })}
                                            </SelectContent>
                                          </Select>
                                        </div>
                                        <div>
                                          <Label htmlFor="edit-quote_id" className="text-foreground">
                                            Linked Quote (Optional)
                                          </Label>
                                          <Select name="quote_id" defaultValue={editingMission.quote_id || ""}>
                                            <SelectTrigger className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground">
                                              <SelectValue placeholder="Select a quote (optional)" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-white/90 dark:bg-black/90 backdrop-blur-lg border border-white/20 dark:border-white/10">
                                              <SelectItem value="none" className="text-foreground hover:bg-primary/20">
                                                <span className="text-muted-foreground">None</span>
                                              </SelectItem>
                                              {quotes.map((quote) => (
                                                <SelectItem
                                                  key={quote.id}
                                                  value={quote.id}
                                                  className="text-foreground hover:bg-primary/20"
                                                >
                                                  <div className="flex flex-col gap-1 max-w-[300px]">
                                                    <span className="truncate text-sm font-medium">
                                                      {quote.content?.substring(0, 50)}...
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                      — {quote.author}
                                                    </span>
                                                  </div>
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        </div>
                                        <div>
                                          <Label htmlFor="edit-points_value" className="text-foreground">
                                            Points Value
                                          </Label>
                                          <Input
                                            id="edit-points_value"
                                            name="points_value"
                                            type="number"
                                            defaultValue={editingMission.points_value.toString()}
                                            required
                                            className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground placeholder:text-muted-foreground"
                                          />
                                        </div>
                                        <div>
                                          <Label htmlFor="edit-max_submissions_per_user" className="text-foreground">
                                            Max Submissions Per User
                                          </Label>
                                          <Input
                                            id="edit-max_submissions_per_user"
                                            name="max_submissions_per_user"
                                            type="number"
                                            defaultValue={editingMission.max_submissions_per_user?.toString() || "1"}
                                            min="1"
                                            max="10"
                                            className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground placeholder:text-muted-foreground"
                                          />
                                          <p className="text-xs text-muted-foreground mt-1">
                                            How many times can each user submit this mission? (1-10)
                                          </p>
                                        </div>

                                        <div>
                                          <Label htmlFor="edit-instructions" className="text-foreground">
                                            Mission Instructions (Optional)
                                          </Label>
                                          <Textarea
                                            id="edit-instructions"
                                            name="instructions"
                                            defaultValue={editingMission.instructions || ""}
                                            placeholder="Enter step-by-step instructions for completing this mission..."
                                            className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground placeholder:text-muted-foreground"
                                            rows={4}
                                          />
                                        </div>
                                        <div>
                                          <Label htmlFor="edit-tips_inspiration" className="text-foreground">
                                            {" "}
                                            {/* Updated label */}
                                            Tips & Inspiration (Optional)
                                          </Label>
                                          <Textarea
                                            id="edit-tips_inspiration" // Updated id
                                            name="tips_inspiration" // Updated name
                                            defaultValue={editingMission.tips_inspiration || ""}
                                            placeholder="Share helpful tips, inspiration, or examples to guide users..."
                                            className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground placeholder:text-muted-foreground"
                                            rows={4}
                                          />
                                        </div>

                                        <div className="border-t border-white/20 dark:border-white/10 pt-6">
                                          <SchemaBuilder
                                            initialSchema={editingMission.submission_schema || null}
                                            onSchemaChange={setEditMissionSchema}
                                          />
                                        </div>

                                        <Button
                                          type="submit"
                                          disabled={isUpdatingMission}
                                          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                                        >
                                          {isUpdatingMission ? "Updating..." : "Update Mission"}
                                        </Button>
                                      </>
                                    )}
                                  </form>
                                </DialogContent>
                              </Dialog>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 w-8 sm:h-9 sm:w-9 p-0 bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-red-400 hover:text-red-300 hover:bg-red-500/10 hover:scale-105 transition-all duration-300"
                                  >
                                    <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 mx-3 sm:mx-0">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="text-foreground">Delete Mission</AlertDialogTitle>
                                    <AlertDialogDescription className="text-muted-foreground">
                                      Are you sure you want to delete "{mission.title}"? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground hover:bg-white/20 dark:hover:bg-black/30">
                                      Cancel
                                    </AlertDialogCancel>
                                    <form action={handleDeleteMission}>
                                      <input type="hidden" name="id" value={mission.id} />
                                      <AlertDialogAction
                                        type="submit"
                                        className="bg-red-500 hover:bg-red-600 text-white"
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </form>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resources Management Section */}
        <Card className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-foreground text-xl sm:text-2xl">Resources Management</CardTitle>
              <Dialog open={isAddResourceDialogOpen} onOpenChange={setIsAddResourceDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-primary hover:bg-primary/90 text-primary-foreground hover:scale-105 transition-all duration-300 flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add Resource
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 mx-3 sm:mx-0 max-w-md sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="text-foreground">Add New Resource</DialogTitle>
                  </DialogHeader>
                  <form action={handleCreateResource} className="space-y-4">
                    <div>
                      <Label htmlFor="resource-title" className="text-foreground">
                        Title
                      </Label>
                      <Input
                        id="resource-title"
                        name="title"
                        required
                        className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground placeholder:text-muted-foreground"
                      />
                    </div>
                    <div>
                      <Label htmlFor="resource-description" className="text-foreground">
                        Description
                      </Label>
                      <Textarea
                        id="resource-description"
                        name="description"
                        required
                        className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground placeholder:text-muted-foreground"
                      />
                    </div>
                    <div>
                      <Label htmlFor="resource-type" className="text-foreground">
                        Type
                      </Label>
                      <Select name="type" required>
                        <SelectTrigger className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground">
                          <SelectValue placeholder="Select resource type" />
                        </SelectTrigger>
                        <SelectContent className="bg-white/90 dark:bg-black/90 backdrop-blur-lg border border-white/20 dark:border-white/10">
                          {resourceTypes.map((type) => (
                            <SelectItem
                              key={type.value}
                              value={type.value}
                              className="text-foreground hover:bg-primary/20"
                            >
                              <div className="flex items-center gap-2">
                                <type.icon className="h-4 w-4" />
                                {type.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="resource-url" className="text-foreground">
                        URL
                      </Label>
                      <Input
                        id="resource-url"
                        name="url"
                        type="url"
                        required
                        className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground placeholder:text-muted-foreground"
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground hover:scale-105 transition-all duration-300"
                    >
                      Create Resource
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            <div className="bg-white/5 dark:bg-black/10 backdrop-blur-lg rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-white/10 dark:border-white/5">
                      <TableHead className="text-foreground font-semibold text-sm sm:text-base min-w-[120px]">
                        Title
                      </TableHead>
                      <TableHead className="text-foreground font-semibold text-sm sm:text-base min-w-[80px]">
                        Type
                      </TableHead>
                      <TableHead className="text-foreground font-semibold text-sm sm:text-base min-w-[200px]">
                        URL
                      </TableHead>
                      <TableHead className="text-foreground font-semibold text-sm sm:text-base min-w-[100px]">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resources.map((resource) => {
                      const typeConfig = resourceTypes.find((t) => t.value === resource.type)
                      return (
                        <TableRow
                          key={resource.id}
                          className="border-b border-white/5 dark:border-white/5 hover:bg-white/5 dark:hover:bg-black/10 transition-colors"
                        >
                          <TableCell className="text-foreground font-medium text-sm sm:text-base max-w-[200px] truncate">
                            {resource.title}
                          </TableCell>
                          <TableCell className="text-foreground">
                            <div className="flex items-center gap-2">
                              {typeConfig && <typeConfig.icon className="h-4 w-4" />}
                              <span className="text-xs sm:text-sm">{resource.type}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-foreground">
                            <a
                              href={resource.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:text-primary/80 text-xs sm:text-sm truncate max-w-[200px] block"
                            >
                              {resource.url}
                            </a>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 sm:gap-2">
                              <Dialog
                                open={isEditResourceDialogOpen && editingResource?.id === resource.id}
                                onOpenChange={(open) => {
                                  setIsEditResourceDialogOpen(open)
                                  if (!open) setEditingResource(null)
                                }}
                              >
                                <DialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setEditingResource(resource)}
                                    className="h-8 w-8 sm:h-9 sm:w-9 p-0 bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground hover:bg-primary hover:text-white hover:scale-105 transition-all duration-300"
                                  >
                                    <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 mx-3 sm:mx-0 max-w-md sm:max-w-lg">
                                  <DialogHeader>
                                    <DialogTitle className="text-foreground">Edit Resource</DialogTitle>
                                  </DialogHeader>
                                  <form action={handleUpdateResource} className="space-y-4">
                                    <input type="hidden" name="id" value={resource.id} />
                                    <div>
                                      <Label htmlFor="edit-resource-title" className="text-foreground">
                                        Title
                                      </Label>
                                      <Input
                                        id="edit-resource-title"
                                        name="title"
                                        defaultValue={resource.title}
                                        required
                                        className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground placeholder:text-muted-foreground"
                                      />
                                    </div>
                                    <div>
                                      <Label htmlFor="edit-resource-description" className="text-foreground">
                                        Description
                                      </Label>
                                      <Textarea
                                        id="edit-resource-description"
                                        name="description"
                                        defaultValue={resource.description}
                                        required
                                        className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground placeholder:text-muted-foreground"
                                      />
                                    </div>
                                    <div>
                                      <Label htmlFor="edit-resource-type" className="text-foreground">
                                        Type
                                      </Label>
                                      <Select name="type" defaultValue={resource.type}>
                                        <SelectTrigger className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground">
                                          <SelectValue placeholder="Select resource type" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white/90 dark:bg-black/90 backdrop-blur-lg border border-white/20 dark:border-white/10">
                                          {resourceTypes.map((type) => (
                                            <SelectItem
                                              key={type.value}
                                              value={type.value}
                                              className="text-foreground hover:bg-primary/20"
                                            >
                                              <div className="flex items-center gap-2">
                                                <type.icon className="h-4 w-4" />
                                                {type.label}
                                              </div>
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div>
                                      <Label htmlFor="edit-resource-url" className="text-foreground">
                                        URL
                                      </Label>
                                      <Input
                                        id="edit-resource-url"
                                        name="url"
                                        type="url"
                                        defaultValue={resource.url}
                                        required
                                        className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground placeholder:text-muted-foreground"
                                      />
                                    </div>
                                    <Button
                                      type="submit"
                                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground hover:scale-105 transition-all duration-300"
                                    >
                                      Update Resource
                                    </Button>
                                  </form>
                                </DialogContent>
                              </Dialog>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 w-8 sm:h-9 sm:w-9 p-0 bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-red-400 hover:text-red-300 hover:bg-red-500/10 hover:scale-105 transition-all duration-300"
                                  >
                                    <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 mx-3 sm:mx-0">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="text-foreground">Delete Resource</AlertDialogTitle>
                                    <AlertDialogDescription className="text-muted-foreground">
                                      Are you sure you want to delete "{resource.title}"? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground hover:bg-white/20 dark:hover:bg-black/30">
                                      Cancel
                                    </AlertDialogCancel>
                                    <form action={handleDeleteResource}>
                                      <input type="hidden" name="id" value={resource.id} />
                                      <AlertDialogAction
                                        type="submit"
                                        className="bg-red-500 hover:bg-red-600 text-white"
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </form>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Chat Dialog */}
      <Dialog open={isChatOpen} onOpenChange={setIsChatOpen}>
        <DialogContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl mx-2 sm:mx-0 max-w-[95vw] sm:max-w-2xl max-h-[90vh] sm:max-h-[80vh] flex flex-col rounded-lg z-50">
          <DialogHeader className="border-b border-slate-200 dark:border-slate-700 pb-4">
            <DialogTitle className="text-slate-800 dark:text-slate-100 flex items-center gap-3 text-lg sm:text-xl font-semibold">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
              </div>
              Everyone Journal Assistant
            </DialogTitle>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              for enterprise - grade platform analytics and insights
            </p>
          </DialogHeader>

          <div className="flex-1 flex flex-col min-h-0 pt-4">
            <div className="flex-1 overflow-y-auto space-y-3 sm:space-y-4 p-3 sm:p-4 bg-slate-50 dark:bg-slate-800 rounded-lg mb-4 border border-slate-200 dark:border-slate-700">
              {chatMessages.length === 0 ? (
                <div className="text-center text-slate-600 dark:text-slate-400 py-6 sm:py-8">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl mb-4 inline-block">
                    <MessageCircle className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-blue-500 dark:text-blue-400 opacity-60" />
                  </div>
                  <p className="font-medium text-base sm:text-lg mb-2">Welcome to your Corporate Admin Assistant</p>
                  <p className="text-sm sm:text-base mb-3">
                    Ask me about employee engagement, platform metrics, or performance analytics
                  </p>
                  <div className="text-xs sm:text-sm space-y-1 text-slate-500 dark:text-slate-500">
                    <p>• "Show me top performing employees"</p>
                    <p>• "What are our engagement metrics?"</p>
                    <p>• "Analyze mission completion rates"</p>
                  </div>
                </div>
              ) : (
                chatMessages.map((message, index) => (
                  <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] sm:max-w-[80%] p-3 sm:p-4 rounded-2xl shadow-sm ${
                        message.role === "user"
                          ? "bg-blue-600 dark:bg-blue-500 text-white"
                          : "bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-600"
                      }`}
                    >
                      <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                ))
              )}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-600 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="animate-spin h-4 w-4 sm:h-5 sm:w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                      <span className="text-sm sm:text-base">Analyzing enterprise data...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleChatSubmit} className="flex gap-2 sm:gap-3">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask about employee engagement, metrics, or analytics..."
                disabled={isLoading}
                className="flex-1 h-12 sm:h-11 bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400 text-slate-800 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 rounded-xl text-sm sm:text-base px-4"
              />
              <Button
                type="submit"
                disabled={isLoading || !chatInput.trim()}
                className="h-12 sm:h-11 px-4 sm:px-6 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white border-0 rounded-xl font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
              >
                <Send className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="sr-only">Send message</span>
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
