"use client"

import { useState, useEffect, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import { Plus, Trash2, Edit, MessageCircle, Send, Download, BookOpen, Video, FileText, Headphones, Home, GripVertical, Users, Target, CheckCircle, List, Layers, FileSpreadsheet } from 'lucide-react'
import { createClient } from "@/lib/supabase/client"
import { SchemaBuilder } from "@/components/schema-builder"
import { createMission, updateMission, deleteMission, exportAllData, updateMissionOrder } from "@/lib/actions"
import { getPrograms, createProgram, updateProgram, deleteProgram, getMissionPrograms, getFullExportData } from "@/lib/admin-actions"
import { toast } from "@/hooks/use-toast"
import Link from "next/link"
import { Checkbox } from "@/components/ui/checkbox"

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
  tips_inspiration?: string | null
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

interface Program {
  id: string
  title: string
  description: string | null
  is_default: boolean
}

interface DashboardItem {
  title: string
  description: string
  icon: React.ElementType
  href: string
}

const dashboardItems: DashboardItem[] = [
  {
    title: "User Management",
    description: "Manage user roles and permissions",
    icon: Users,
    href: "/admin/users",
  },
  {
    title: "Program Management",
    description: "Create programs and bulk assign users",
    icon: Layers,
    href: "/admin/programs",
  },
  {
    title: "Mission Assignments",
    description: "Assign missions to participants",
    icon: Target,
    href: "/admin/missions",
  },
  {
    title: "Submissions",
    description: "Review and approve submissions",
    icon: CheckCircle,
    href: "/admin/submissions",
  },
  {
    title: "Quotes",
    description: "Manage inspirational quotes",
    icon: List,
    href: "/admin/quotes",
  },
]

export default function AdminPage() {
  const [missions, setMissions] = useState<Mission[]>([])
  const [resources, setResources] = useState<Resource[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingMission, setEditingMission] = useState<Mission | null>(null)
  const [selectedProgramIds, setSelectedProgramIds] = useState<string[]>([])
  
  const [isAddProgramDialogOpen, setIsAddProgramDialogOpen] = useState(false)
  const [isEditProgramDialogOpen, setIsEditProgramDialogOpen] = useState(false)
  const [editingProgram, setEditingProgram] = useState<Program | null>(null)

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
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [selectedMissionType, setSelectedMissionType] = useState<string>("")
  const [autoMissionNumber, setAutoMissionNumber] = useState<number>(1)
  const [isExporting, setIsExporting] = useState(false)

  const [isCreatingMission, startCreateTransition] = useTransition()
  const [isUpdatingMission, startUpdateTransition] = useTransition()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.size > 4 * 1024 * 1024) { // 4MB limit
      toast({
        title: "File too large",
        description: "Image must be less than 4MB",
        variant: "destructive",
      })
      e.target.value = "" // Clear the input
    }
  }

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

  useEffect(() => {
    fetchMissions()
    fetchResources()
    fetchQuotes()
    fetchPrograms()
  }, [])

  useEffect(() => {
    if (selectedMissionType) {
      const typeMissions = missions.filter((m) => m.type === selectedMissionType)
      const maxNumber = typeMissions.reduce((max, m) => Math.max(max, m.mission_number || 0), 0)
      setAutoMissionNumber(maxNumber + 1)
    }
  }, [selectedMissionType, missions])

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
        const resourceId = formData.get("resource_id") as string
        const quoteId = formData.get("quote_id") as string

        if (resourceId === "none" || !resourceId) {
          formData.delete("resource_id")
        }

        if (quoteId === "none" || !quoteId) {
          formData.delete("quote_id")
        }

        const dueDate = formData.get("due_date") as string
        if (dueDate) {
          const dateObj = new Date(dueDate)
          formData.set("due_date", dateObj.toISOString())
        } else {
          formData.delete("due_date")
        }

        if (createMissionSchema) {
          formData.set("submission_schema", JSON.stringify(createMissionSchema))
        }
        
        // Add selected programs
        formData.append("program_ids", JSON.stringify(selectedProgramIds))

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
        setSelectedProgramIds([]) // Reset selection
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
        const resourceId = formData.get("resource_id") as string
        const quoteId = formData.get("quote_id") as string

        if (resourceId === "none" || !resourceId) {
          formData.delete("resource_id")
        }

        if (quoteId === "none" || !quoteId) {
          formData.delete("quote_id")
        }

        const dueDate = formData.get("due_date") as string
        if (dueDate) {
          const dateObj = new Date(dueDate)
          formData.set("due_date", dateObj.toISOString())
        } else {
          formData.delete("due_date")
        }

        if (editMissionSchema !== undefined) {
          formData.set("submission_schema", editMissionSchema ? JSON.stringify(editMissionSchema) : "")
        }

        // Handle image deletion
        if (formData.get("delete_image") === "true") {
          formData.append("image_url", ""); // Clear image_url in backend if delete_image is true
        }

        // Add selected programs
        formData.append("program_ids", JSON.stringify(selectedProgramIds))

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
        setSelectedProgramIds([]) // Reset selection
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
      toast({
        title: "Mission Deleted",
        description: "The mission has been deleted successfully.",
      })
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: `Failed to delete mission: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      })
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
      toast({
        title: "Resource Created",
        description: "The resource has been created successfully.",
      })
    } catch (error) {
      toast({
        title: "Creation Failed",
        description: `Failed to create resource: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      })
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
      toast({
        title: "Resource Updated",
        description: "The resource has been updated successfully.",
      })
    } catch (error) {
      toast({
        title: "Update Failed",
        description: `Failed to update resource: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      })
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
      toast({
        title: "Resource Deleted",
        description: "The resource has been deleted successfully.",
      })
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: `Failed to delete resource: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      })
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
    setDraggedMission(mission)
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDragOverIndex(index)
  }

  const handleDragEnd = async () => {
    if (draggedIndex === null || dragOverIndex === null || draggedIndex === dragOverIndex) {
      setDraggedMission(null)
      setDraggedIndex(null)
      setDragOverIndex(null)
      return
    }

    const reorderedMissions = [...missions]
    const [movedMission] = reorderedMissions.splice(draggedIndex, 1)
    reorderedMissions.splice(dragOverIndex, 0, movedMission)

    const updatedMissions = reorderedMissions.map((mission, index) => ({
      ...mission,
      display_order: index,
    }))

    setMissions(updatedMissions)

    const orderUpdates = updatedMissions.map((mission) => ({
      id: mission.id,
      display_order: mission.display_order,
    }))

    try {
      await updateMissionOrder(orderUpdates)
      toast({
        title: "Order Updated",
        description: "Mission order has been saved successfully.",
      })
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to save mission order.",
        variant: "destructive",
      })
      fetchMissions()
    }

    setDraggedMission(null)
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleExport = async () => {
    try {
      setIsExporting(true)
      const data = await exportAllData()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `everyone-journal-export-${new Date().toISOString().split("T")[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast({
        title: "Export Successful",
        description: "Data has been exported successfully.",
      })
    } catch (error) {
      toast({
        title: "Export Failed",
        description: `Failed to export data: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportExcel = async () => {
    try {
      setIsExporting(true)
      toast({
        title: "Preparing Export",
        description: "Fetching all database records...",
      })

      const data = await getFullExportData()
      
      // Dynamically import xlsx to avoid bloating the bundle
      const XLSX = await import("xlsx")

      const wb = XLSX.utils.book_new()

      // Helper to add a sheet
      const addSheet = (name: string, jsonData: any[]) => {
        if (jsonData.length === 0) {
          XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{ info: "No data available" }]), name)
          return
        }
        const ws = XLSX.utils.json_to_sheet(jsonData)
        XLSX.utils.book_append_sheet(wb, ws, name)
      }

      // Add sheets for each table
      addSheet("Profiles", data.profiles)
      addSheet("Missions", data.missions)
      addSheet("Submissions", data.submissions)
      addSheet("Resources", data.resources)
      addSheet("Programs", data.programs)
      addSheet("Mission Programs", data.mission_programs)
      addSheet("Mission Assignments", data.mission_assignments)
      addSheet("Mission Types", data.mission_types)

      // Generate filename with date
      const date = new Date().toISOString().split("T")[0]
      const fileName = `everyone-journal-full-export-${date}.xlsx`

      // Write file
      XLSX.writeFile(wb, fileName)

      toast({
        title: "Export Complete",
        description: `Successfully exported data to ${fileName}`,
      })
    } catch (error) {
      console.error("Export failed:", error)
      toast({
        title: "Export Failed",
        description: "There was an error generating the Excel file.",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }


  // Programs Management Functions
  const fetchPrograms = async () => {
    try {
      const data = await getPrograms()
      setPrograms(data)
    } catch (error) {
      console.error("Failed to fetch programs", error)
    }
  }

  const handleCreateProgram = async (formData: FormData) => {
    try {
      const title = formData.get("title") as string
      const description = formData.get("description") as string
      
      const result = await createProgram(title, description)
      
      if (result.success) {
        setIsAddProgramDialogOpen(false)
        fetchPrograms()
        toast({
          title: "Program Created",
          description: "The program has been created successfully.",
        })
      }
    } catch (error) {
      toast({
        title: "Creation Failed",
        description: "Failed to create program",
        variant: "destructive",
      })
    }
  }

  const handleUpdateProgram = async (formData: FormData) => {
    try {
      const id = formData.get("id") as string
      const title = formData.get("title") as string
      const description = formData.get("description") as string
      
      const result = await updateProgram(id, title, description)
      
      if (result.success) {
        setIsEditProgramDialogOpen(false)
        setEditingProgram(null)
        fetchPrograms()
        toast({
          title: "Program Updated",
          description: "The program has been updated successfully.",
        })
      }
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update program",
        variant: "destructive",
      })
    }
  }

  const handleDeleteProgram = async (formData: FormData) => {
    try {
      const id = formData.get("id") as string
      await deleteProgram(id)
      fetchPrograms()
      toast({
        title: "Program Deleted",
        description: "The program has been deleted successfully.",
      })
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: "Failed to delete program",
        variant: "destructive",
      })
    }
  }

  const openEditMissionDialog = async (mission: Mission) => {
    setEditingMission(mission)
    setEditMissionSchema(mission.submission_schema)
    
    // Fetch assigned programs
    const assignedPrograms = await getMissionPrograms(mission.id)
    setSelectedProgramIds(assignedPrograms)
    
    setIsEditDialogOpen(true)
  }

  const toggleProgramSelection = (programId: string) => {
    setSelectedProgramIds(prev => 
      prev.includes(programId) 
        ? prev.filter(id => id !== programId)
        : [...prev, programId]
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage missions, submissions, and resources.</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setIsChatOpen(true)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <MessageCircle className="h-4 w-4" />
              AI Chat
            </Button>
            <Button 
              onClick={handleExportExcel} 
              variant="outline" 
              className="flex items-center gap-2"
              disabled={isExporting}
            >
              {isExporting ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
              ) : (
                <FileSpreadsheet className="h-4 w-4" />
              )}
              Export Excel
            </Button>
            <Button
              onClick={handleExport}
              variant="outline"
              className="flex items-center gap-2"
              disabled={isExporting}
            >
              {isExporting ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Export JSON
            </Button>
            <Link href="/">
              <Button variant="outline" className="gap-2">
                <Home className="h-4 w-4" />
                View Site
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {dashboardItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Card className="hover:bg-accent cursor-pointer transition-colors h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <item.icon className="h-5 w-5" />
                    {item.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Programs Management Section */}
        <Card className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-foreground text-xl sm:text-2xl flex items-center gap-2">
                <Layers className="h-6 w-6" />
                Programs & Categories
              </CardTitle>
              <Dialog open={isAddProgramDialogOpen} onOpenChange={setIsAddProgramDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-primary hover:bg-primary/90 text-primary-foreground hover:scale-105 transition-all duration-300 flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add Program
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 mx-3 sm:mx-0 max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-foreground">Add New Program</DialogTitle>
                  </DialogHeader>
                  <form action={handleCreateProgram} className="space-y-4">
                    <div>
                      <Label htmlFor="program-title" className="text-foreground">
                        Title
                      </Label>
                      <Input
                        id="program-title"
                        name="title"
                        required
                        className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground placeholder:text-muted-foreground"
                      />
                    </div>
                    <div>
                      <Label htmlFor="program-description" className="text-foreground">
                        Description
                      </Label>
                      <Textarea
                        id="program-description"
                        name="description"
                        className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground placeholder:text-muted-foreground"
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground hover:scale-105 transition-all duration-300"
                    >
                      Create Program
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
                      <TableHead className="text-foreground font-semibold text-sm sm:text-base min-w-[150px]">
                        Title
                      </TableHead>
                      <TableHead className="text-foreground font-semibold text-sm sm:text-base min-w-[200px]">
                        Description
                      </TableHead>
                      <TableHead className="text-foreground font-semibold text-sm sm:text-base min-w-[100px]">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {programs.map((program) => (
                      <TableRow
                        key={program.id}
                        className="border-b border-white/5 dark:border-white/5 hover:bg-white/5 dark:hover:bg-black/10 transition-colors"
                      >
                        <TableCell className="text-foreground font-medium text-sm sm:text-base">
                          {program.title}
                          {program.is_default && (
                            <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                              Default
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-foreground text-sm text-muted-foreground">
                          {program.description}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 sm:gap-2">
                            <Dialog
                              open={isEditProgramDialogOpen && editingProgram?.id === program.id}
                              onOpenChange={(open) => {
                                setIsEditProgramDialogOpen(open)
                                if (!open) setEditingProgram(null)
                              }}
                            >
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setEditingProgram(program)}
                                  className="h-8 w-8 sm:h-9 sm:w-9 p-0 bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground hover:bg-primary hover:text-white hover:scale-105 transition-all duration-300"
                                >
                                  <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 mx-3 sm:mx-0 max-w-md">
                                <DialogHeader>
                                  <DialogTitle className="text-foreground">Edit Program</DialogTitle>
                                </DialogHeader>
                                <form action={handleUpdateProgram} className="space-y-4">
                                  <input type="hidden" name="id" value={program.id} />
                                  <div>
                                    <Label htmlFor="edit-program-title" className="text-foreground">
                                      Title
                                    </Label>
                                    <Input
                                      id="edit-program-title"
                                      name="title"
                                      defaultValue={program.title}
                                      required
                                      className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground placeholder:text-muted-foreground"
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="edit-program-description" className="text-foreground">
                                      Description
                                    </Label>
                                    <Textarea
                                      id="edit-program-description"
                                      name="description"
                                      defaultValue={program.description || ""}
                                      className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground placeholder:text-muted-foreground"
                                    />
                                  </div>
                                  <Button
                                    type="submit"
                                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground hover:scale-105 transition-all duration-300"
                                  >
                                    Update Program
                                  </Button>
                                </form>
                              </DialogContent>
                            </Dialog>
                            {!program.is_default && (
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
                                <AlertDialogContent className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 mx-3 sm:mx-0">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="text-foreground">Delete Program</AlertDialogTitle>
                                    <AlertDialogDescription className="text-muted-foreground">
                                      Are you sure you want to delete "{program.title}"? Missions in this program will not be deleted.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground hover:bg-white/20 dark:hover:bg-black/30">
                                      Cancel
                                    </AlertDialogCancel>
                                    <form action={handleDeleteProgram}>
                                      <input type="hidden" name="id" value={program.id} />
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
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>


        <Card className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-foreground text-xl sm:text-2xl">Mission Management</CardTitle>
              <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
                setIsAddDialogOpen(open)
                if (open) setSelectedProgramIds([]) // Reset on open
              }}>
                <DialogTrigger asChild>
                  <Button className="bg-primary hover:bg-primary/90 text-primary-foreground hover:scale-105 transition-all duration-300 flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add Mission
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 mx-3 sm:mx-0 max-w-md sm:max-w-2xl max-h-[90vh] overflow-y-auto">
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
                    
                    {/* Add Programs Selection */}
                    <div>
                      <Label className="text-foreground mb-2 block">Programs / Categories</Label>
                      <div className="bg-white/5 dark:bg-black/10 border border-white/10 rounded-md p-3 max-h-40 overflow-y-auto space-y-2">
                        {programs.map((program) => (
                          <div key={program.id} className="flex items-center space-x-2">
                            <Checkbox 
                              id={`program-${program.id}`} 
                              checked={selectedProgramIds.includes(program.id)}
                              onCheckedChange={() => toggleProgramSelection(program.id)}
                            />
                            <label
                              htmlFor={`program-${program.id}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                              {program.title}
                            </label>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Select which programs this mission belongs to.
                      </p>
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
                        Tips & Inspiration (Optional)
                      </Label>
                      <Textarea
                        id="tips_inspiration"
                        name="tips_inspiration"
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
                        onChange={handleFileChange} // Added validation
                        className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground file:bg-primary file:text-primary-foreground file:border-0 file:rounded-md file:px-3 file:py-1 file:mr-3"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Upload an image to make the mission more engaging (max 4MB)
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
                      <Label htmlFor="type" className="text-foreground">
                        Mission Type
                      </Label>
                      <Select name="type" required onValueChange={(value) => setSelectedMissionType(value)}>
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
                          value={autoMissionNumber}
                          readOnly
                          className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground placeholder:text-muted-foreground"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Auto-generated based on mission type</p>
                      </div>
                      <div>
                        <Label htmlFor="points_value" className="text-foreground">
                          Points Value <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="points_value"
                          name="points_value"
                          type="number"
                          min="1"
                          max="1000"
                          required
                          placeholder="e.g., 10, 25, 50..."
                          className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground placeholder:text-muted-foreground"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Points awarded when mission is completed (required)
                        </p>
                      </div>
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
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            <div className="bg-white/5 dark:bg-black/10 backdrop-blur-lg rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-white/10 dark:border-white/5">
                      <TableHead className="text-foreground font-semibold text-sm sm:text-base w-8"></TableHead>
                      <TableHead className="text-foreground font-semibold text-sm sm:text-base min-w-[150px]">
                        Title
                      </TableHead>
                      <TableHead className="text-foreground font-semibold text-sm sm:text-base min-w-[80px]">
                        Type
                      </TableHead>
                      <TableHead className="text-foreground font-semibold text-sm sm:text-base min-w-[80px]">
                        Points
                      </TableHead>
                      <TableHead className="text-foreground font-semibold text-sm sm:text-base min-w-[100px]">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {missions.map((mission, index) => (
                      <TableRow
                        key={mission.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, mission, index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                        className={`border-b border-white/5 dark:border-white/5 hover:bg-white/5 dark:hover:bg-black/10 transition-colors cursor-move ${
                          dragOverIndex === index ? "bg-primary/10" : ""
                        }`}
                      >
                        <TableCell>
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                        </TableCell>
                        <TableCell className="text-foreground font-medium text-sm sm:text-base">
                          {mission.title}
                        </TableCell>
                        <TableCell className="text-foreground text-xs sm:text-sm">
                          {mission.type || "N/A"}
                        </TableCell>
                        <TableCell className="text-foreground text-xs sm:text-sm">
                          {mission.points_value}
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
                                  onClick={() => openEditMissionDialog(mission)}
                                  className="h-8 w-8 sm:h-9 sm:w-9 p-0 bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground hover:bg-primary hover:text-white hover:scale-105 transition-all duration-300"
                                >
                                  <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 mx-3 sm:mx-0 max-w-md sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle className="text-foreground">Edit Mission</DialogTitle>
                                </DialogHeader>
                                <form id="edit-mission-form" action={handleUpdateMission} className="space-y-4">
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
                                      
                                      {/* Edit Programs Selection */}
                                      <div>
                                        <Label className="text-foreground mb-2 block">Programs / Categories</Label>
                                        <div className="bg-white/5 dark:bg-black/10 border border-white/10 rounded-md p-3 max-h-40 overflow-y-auto space-y-2">
                                          {programs.map((program) => (
                                            <div key={program.id} className="flex items-center space-x-2">
                                              <Checkbox 
                                                id={`edit-program-${program.id}`} 
                                                checked={selectedProgramIds.includes(program.id)}
                                                onCheckedChange={() => toggleProgramSelection(program.id)}
                                              />
                                              <label
                                                htmlFor={`edit-program-${program.id}`}
                                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                              >
                                                {program.title}
                                              </label>
                                            </div>
                                          ))}
                                        </div>
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
                                          Tips & Inspiration (Optional)
                                        </Label>
                                        <Textarea
                                          id="edit-tips_inspiration"
                                          name="tips_inspiration"
                                          defaultValue={editingMission.tips_inspiration || ""}
                                          placeholder="Share helpful tips, inspiration, or examples to guide users..."
                                          className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground placeholder:text-muted-foreground"
                                          rows={4}
                                        />
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
                                          onChange={handleFileChange} // Added validation
                                          className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground file:bg-primary file:text-primary-foreground file:border-0 file:rounded-md file:px-3 file:py-1 file:mr-3"
                                        />
                                        {editingMission.image_url && (
                                          <div className="mt-2 relative group">
                                            <p className="text-xs text-muted-foreground mb-1">Current Image:</p>
                                            <div className="relative">
                                              <img
                                                src={editingMission.image_url || "/placeholder.svg"}
                                                alt="Current mission image"
                                                className="w-full max-w-[200px] h-auto rounded-md border border-white/10"
                                              />
                                              <Button
                                                type="button"
                                                variant="destructive"
                                                size="icon"
                                                className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => {
                                                  // Add a hidden input to signal image deletion
                                                  const form = document.getElementById("edit-mission-form") as HTMLFormElement
                                                  if (form) {
                                                    const input = document.createElement("input")
                                                    input.type = "hidden"
                                                    input.name = "delete_image"
                                                    input.value = "true"
                                                    form.appendChild(input)
                                                    
                                                    // Update local state to hide image immediately
                                                    setEditingMission({
                                                      ...editingMission,
                                                      image_url: null
                                                    })
                                                  }
                                                }}
                                              >
                                                <Trash2 className="h-3 w-3" />
                                              </Button>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1">
                                              Upload a new image to replace, or click trash icon to remove
                                            </p>
                                          </div>
                                        )}
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
                                        <Label htmlFor="edit-type" className="text-foreground">
                                          Mission Type
                                        </Label>
                                        <Select name="type" defaultValue={editingMission.type}>
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
                                        <Select name="resource_id" defaultValue={editingMission.resource_id || "none"}>
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
                                          <Label htmlFor="edit-points_value" className="text-foreground">
                                            Points Value
                                          </Label>
                                          <Input
                                            id="edit-points_value"
                                            name="points_value"
                                            type="number"
                                            min="1"
                                            max="1000"
                                            defaultValue={editingMission.points_value}
                                            required
                                            className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground placeholder:text-muted-foreground"
                                          />
                                        </div>
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
                              <AlertDialogContent className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 mx-3 sm:mx-0">
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
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>

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
                <DialogContent className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 mx-3 sm:mx-0 max-w-md sm:max-w-lg">
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
                                <DialogContent className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 mx-3 sm:mx-0 max-w-md sm:max-w-lg">
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
                                <AlertDialogContent className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 mx-3 sm:mx-0">
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
              for enterprise-grade platform analytics and insights
            </p>
          </DialogHeader>

          <div className="flex-1 flex flex-col min-h-0 pt-4">
            <div className="flex-1 overflow-y-auto space-y-3 sm:space-y-4 p-3 sm:p-4 bg-slate-50 dark:bg-slate-800 rounded-lg mb-4 border border-slate-200 dark:border-slate-700">
              {chatMessages.length === 0 ? (
                <div className="text-center text-slate-600 dark:text-slate-400 py-6 sm:py-8">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl mb-4 inline-block">
                    <MessageCircle className="h-10 w-10 sm:h-12 sm:w-10 mx-auto text-blue-500 dark:text-blue-400 opacity-60" />
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
