"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
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
import { Plus, Trash2, Edit, Layers, Users, BookOpen, ArrowLeft, Check, X, Search, Loader2, AlertCircle, ChevronDown } from 'lucide-react'
import { getPrograms, createProgram, updateProgram, deleteProgram, assignProgramToUsers, getProgramMissions, removeMissionFromProgram, getAllMissions, addMissionsToProgram } from "@/lib/admin-actions"
import { toast } from "@/hooks/use-toast"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface Program {
  id: string
  title: string
  description: string | null
  is_default: boolean
  created_at?: string
}

interface Mission {
  id: string
  title: string
  type?: string
  points_value: number
}

export default function ProgramsPage() {
  const [programs, setPrograms] = useState<Program[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  
  // Create/Edit Program State
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingProgram, setEditingProgram] = useState<Program | null>(null)
  
  // Bulk Assign State
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null)
  const [emailList, setEmailList] = useState("")
  const [isAssigning, setIsAssigning] = useState(false)
  const [assignResult, setAssignResult] = useState<{count: number, notFound: string[]} | null>(null)

  // Manage Missions State
  const [isManageMissionsOpen, setIsManageMissionsOpen] = useState(false)
  const [programMissions, setProgramMissions] = useState<Mission[]>([])
  const [allMissions, setAllMissions] = useState<Mission[]>([])
  const [isLoadingMissions, setIsLoadingMissions] = useState(false)
  const [removingMissionId, setRemovingMissionId] = useState<string | null>(null)
  const [isAddingMission, setIsAddingMission] = useState(false)
  const [selectedMissionId, setSelectedMissionId] = useState<string>("")
  const [isComboboxOpen, setIsComboboxOpen] = useState(false)

  useEffect(() => {
    fetchPrograms()
  }, [])

  const fetchPrograms = async () => {
    setIsLoading(true)
    try {
      const data = await getPrograms()
      setPrograms(data)
    } catch (error) {
      console.error("Failed to fetch programs", error)
      toast({
        title: "Error",
        description: "Failed to load programs",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateProgram = async (formData: FormData) => {
    try {
      const title = formData.get("title") as string
      const description = formData.get("description") as string
      
      const result = await createProgram(title, description)
      
      if (result.success) {
        setIsAddDialogOpen(false)
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
        setIsEditDialogOpen(false)
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

  const openAssignDialog = (program: Program) => {
    setSelectedProgram(program)
    setEmailList("")
    setAssignResult(null)
    setIsAssignDialogOpen(true)
  }

  const handleBulkAssign = async () => {
    if (!selectedProgram || !emailList.trim()) return

    setIsAssigning(true)
    try {
      // Parse emails from textarea (comma, newline, space separated)
      const emails = emailList
        .split(/[\n, ]+/)
        .map(e => e.trim())
        .filter(e => e.length > 0 && e.includes('@'))

      if (emails.length === 0) {
        toast({
          title: "No valid emails",
          description: "Please enter at least one valid email address.",
          variant: "destructive",
        })
        setIsAssigning(false)
        return
      }

      const result = await assignProgramToUsers(selectedProgram.id, emails)
      
      setAssignResult({
        count: result.count,
        notFound: result.notFound
      })
      
      if (result.success) {
        toast({
          title: "Assignment Complete",
          description: `Successfully assigned program to ${result.count} users.`,
        })
      }
    } catch (error) {
      toast({
        title: "Assignment Failed",
        description: "Failed to assign users to program.",
        variant: "destructive",
      })
    } finally {
      setIsAssigning(false)
    }
  }

  const openManageMissions = async (program: Program) => {
    setSelectedProgram(program)
    setIsManageMissionsOpen(true)
    setIsLoadingMissions(true)
    try {
      const [pMissions, aMissions] = await Promise.all([
        getProgramMissions(program.id),
        getAllMissions()
      ])
      setProgramMissions(pMissions)
      setAllMissions(aMissions)
    } catch (error) {
      console.error("Failed to fetch missions", error)
      toast({
        title: "Error",
        description: "Failed to load missions",
        variant: "destructive",
      })
    } finally {
      setIsLoadingMissions(false)
    }
  }

  const handleAddMission = async () => {
    if (!selectedProgram || !selectedMissionId) return

    setIsAddingMission(true)
    try {
      await addMissionsToProgram(selectedProgram.id, [selectedMissionId])
      
      // Update local state
      const missionToAdd = allMissions.find(m => m.id === selectedMissionId)
      if (missionToAdd) {
        setProgramMissions(prev => [...prev, missionToAdd])
      }
      
      setSelectedMissionId("")
      toast({
        title: "Mission Added",
        description: "Mission added to program successfully.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add mission to program.",
        variant: "destructive",
      })
    } finally {
      setIsAddingMission(false)
    }
  }

  const handleRemoveMission = async (missionId: string) => {
    if (!selectedProgram) return
    setRemovingMissionId(missionId)
    try {
      await removeMissionFromProgram(selectedProgram.id, missionId)
      setProgramMissions(prev => prev.filter(m => m.id !== missionId))
      toast({
        title: "Mission Removed",
        description: "Mission removed from program.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove mission.",
        variant: "destructive",
      })
    } finally {
      setRemovingMissionId(null)
    }
  }

  const filteredPrograms = programs.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  // Filter out missions that are already in the program
  const availableMissions = allMissions.filter(
    am => !programMissions.some(pm => pm.id === am.id)
  )

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <Layers className="h-8 w-8" />
                Program Management
              </h1>
              <p className="text-muted-foreground">Create programs, manage missions, and bulk assign users.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search programs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-2 whitespace-nowrap">
                  <Plus className="h-4 w-4" />
                  Create Program
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800">
                <DialogHeader>
                  <DialogTitle>Create New Program</DialogTitle>
                  <DialogDescription>
                    Create a new program to group missions together.
                  </DialogDescription>
                </DialogHeader>
                <form action={handleCreateProgram} className="space-y-4">
                  <div>
                    <Label htmlFor="program-title">Title</Label>
                    <Input id="program-title" name="title" required placeholder="e.g. Leadership 101" />
                  </div>
                  <div>
                    <Label htmlFor="program-description">Description</Label>
                    <Textarea id="program-description" name="description" placeholder="Program description..." />
                  </div>
                  <Button type="submit" className="w-full">Create Program</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <CardTitle className="text-foreground">All Programs ({programs.length})</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-white/10 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 bg-white/5">
                    <TableHead className="w-[250px]">Title</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    [...Array(3)].map((_, i) => (
                      <TableRow key={i} className="border-white/10">
                        <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : filteredPrograms.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                          <Layers className="h-12 w-12 opacity-20" />
                          <p>{searchQuery ? "No programs found matching your search." : "No programs found. Create one to get started."}</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPrograms.map((program) => (
                      <TableRow key={program.id} className="border-white/10 hover:bg-white/5">
                        <TableCell className="font-medium">
                          {program.title}
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-md truncate">
                          {program.description || "No description"}
                        </TableCell>
                        <TableCell>
                          {program.is_default && (
                            <Badge variant="secondary">Default</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openManageMissions(program)}
                              title="View Missions"
                            >
                              <BookOpen className="h-4 w-4 mr-2" />
                              Missions
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openAssignDialog(program)}
                              title="Assign Users"
                            >
                              <Users className="h-4 w-4 mr-2" />
                              Assign
                            </Button>
                            <Dialog
                              open={isEditDialogOpen && editingProgram?.id === program.id}
                              onOpenChange={(open) => {
                                setIsEditDialogOpen(open)
                                if (!open) setEditingProgram(null)
                              }}
                            >
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setEditingProgram(program)}
                                  title="Edit Program"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800">
                                <DialogHeader>
                                  <DialogTitle>Edit Program</DialogTitle>
                                </DialogHeader>
                                <form action={handleUpdateProgram} className="space-y-4">
                                  <input type="hidden" name="id" value={program.id} />
                                  <div>
                                    <Label htmlFor="edit-title">Title</Label>
                                    <Input id="edit-title" name="title" defaultValue={program.title} required />
                                  </div>
                                  <div>
                                    <Label htmlFor="edit-description">Description</Label>
                                    <Textarea id="edit-description" name="description" defaultValue={program.description || ""} />
                                  </div>
                                  <Button type="submit" className="w-full">Update Program</Button>
                                </form>
                              </DialogContent>
                            </Dialog>
                            {!program.is_default && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" title="Delete Program">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Program</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "{program.title}"? This will not delete the missions, only the program grouping.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <form action={handleDeleteProgram}>
                                      <input type="hidden" name="id" value={program.id} />
                                      <AlertDialogAction type="submit" className="bg-red-500 hover:bg-red-600">Delete</AlertDialogAction>
                                    </form>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Assign Dialog */}
        <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
          <DialogContent className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Bulk Assign Users</DialogTitle>
              <DialogDescription>
                Assign "{selectedProgram?.title}" to users by pasting their emails.
                This will grant them access to all missions in this program.
              </DialogDescription>
            </DialogHeader>
            
            {!assignResult ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="emails">Paste Emails (comma or newline separated)</Label>
                  <Textarea
                    id="emails"
                    value={emailList}
                    onChange={(e) => setEmailList(e.target.value)}
                    placeholder="user1@example.com, user2@example.com..."
                    className="h-40 font-mono text-sm mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Only existing users with these emails will be assigned.
                  </p>
                </div>
                <Button 
                  onClick={handleBulkAssign} 
                  disabled={isAssigning || !emailList.trim()} 
                  className="w-full"
                >
                  {isAssigning ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Assigning...
                    </>
                  ) : (
                    "Assign Users"
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-500 bg-green-500/10 p-4 rounded-md border border-green-500/20">
                  <Check className="h-5 w-5" />
                  <span className="font-medium">Successfully assigned {assignResult.count} users.</span>
                </div>
                
                {assignResult.notFound.length > 0 && (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-md p-4">
                    <div className="flex items-center gap-2 text-yellow-500 mb-2">
                      <AlertCircle className="h-4 w-4" />
                      <span className="font-medium">Emails not found ({assignResult.notFound.length})</span>
                    </div>
                    <ScrollArea className="h-32 w-full rounded border border-white/10 bg-black/20 p-2">
                      <div className="text-sm font-mono text-muted-foreground">
                        {assignResult.notFound.map((email, i) => (
                          <div key={i}>{email}</div>
                        ))}
                      </div>
                    </ScrollArea>
                    <p className="text-xs text-muted-foreground mt-2">
                      These users must sign up before they can be assigned.
                    </p>
                  </div>
                )}
                
                <Button onClick={() => setIsAssignDialogOpen(false)} className="w-full">
                  Done
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Manage Missions Dialog */}
        <Dialog open={isManageMissionsOpen} onOpenChange={setIsManageMissionsOpen}>
          <DialogContent className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 sm:max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
            <DialogHeader>
              <DialogTitle className="truncate pr-8">Missions in "{selectedProgram?.title}"</DialogTitle>
              <DialogDescription>
                View, add, and remove missions from this program.
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex flex-col gap-4 py-4 flex-1 overflow-hidden">
              <div className="flex gap-2 items-end shrink-0">
                <div className="flex-1 space-y-2">
                  <Label>Add Mission to Program</Label>
                  <Popover open={isComboboxOpen} onOpenChange={setIsComboboxOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={isComboboxOpen}
                        className="w-full justify-between"
                      >
                        {selectedMissionId
                          ? availableMissions.find((mission) => mission.id === selectedMissionId)?.title
                          : "Select mission..."}
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0">
                      <Command>
                        <CommandInput placeholder="Search missions..." />
                        <CommandList>
                          <CommandEmpty>No mission found.</CommandEmpty>
                          <CommandGroup>
                            {availableMissions.map((mission) => (
                              <CommandItem
                                key={mission.id}
                                value={mission.title}
                                onSelect={() => {
                                  setSelectedMissionId(mission.id)
                                  setIsComboboxOpen(false)
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedMissionId === mission.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <span className="truncate">{mission.title}</span>
                                <span className="ml-auto text-xs text-muted-foreground">{mission.type}</span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <Button 
                  onClick={handleAddMission} 
                  disabled={!selectedMissionId || isAddingMission}
                >
                  {isAddingMission ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <div className="border-t border-border my-2"></div>

              <div className="flex-1 overflow-y-auto pr-1 min-h-[200px]">
                {isLoadingMissions ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : programMissions.length === 0 ? (
                  <div className="text-center py-12 border rounded-lg border-dashed">
                    <BookOpen className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                    <p className="text-muted-foreground">
                      No missions in this program yet.
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Points</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {programMissions.map((mission) => (
                        <TableRow key={mission.id}>
                          <TableCell className="font-medium">{mission.title}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{mission.type || "N/A"}</Badge>
                          </TableCell>
                          <TableCell>{mission.points_value} EP</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              onClick={() => handleRemoveMission(mission.id)}
                              disabled={removingMissionId === mission.id}
                            >
                              {removingMissionId === mission.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsManageMissionsOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  )
}
