"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Checkbox } from "@/components/ui/checkbox"
import { Target, UserPlus, Users, X, Search, AlertCircle, Loader2, Filter, Trash2 } from 'lucide-react'
import {
  getAllUsers,
  getMissionAssignments,
  assignMissionToUser,
  assignMissionToAllParticipants,
  removeMissionAssignment,
  assignMissionToUsers,
  removeMissionFromUsers,
} from "@/lib/admin-actions"
import { toast } from "@/components/ui/use-toast"
import type { Profile, Mission, MissionAssignment } from "@/types/database"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

export default function AdminMissionsPage() {
  const [missions, setMissions] = useState<Mission[]>([])
  const [users, setUsers] = useState<Profile[]>([])
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null)
  const [assignments, setAssignments] = useState<Array<MissionAssignment & { profile: { name: string; avatar_url: string | null } }>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false)
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [missionSearchQuery, setMissionSearchQuery] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [assigningUserId, setAssigningUserId] = useState<string | null>(null)
  const [removingUserId, setRemovingUserId] = useState<string | null>(null)
  const [isAssigningAll, setIsAssigningAll] = useState(false)
  const [userToRemove, setUserToRemove] = useState<{ userId: string; userName: string } | null>(null)
  const [assignmentCounts, setAssignmentCounts] = useState<Map<string, number>>(new Map())
  
  const [selectedType, setSelectedType] = useState<string>("all")
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [isBulkAssigning, setIsBulkAssigning] = useState(false)
  const [isBulkRemoving, setIsBulkRemoving] = useState(false)
  const [showUnassignedOnly, setShowUnassignedOnly] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const supabase = createClient()
      
      const [missionsResult, usersResult] = await Promise.all([
        supabase.from("missions").select("*").order("title"),
        getAllUsers(),
      ])

      if (missionsResult.error) throw missionsResult.error

      if (missionsResult.data) {
        setMissions(missionsResult.data)
        await loadAssignmentCounts(missionsResult.data.map(m => m.id))
      }
      setUsers(usersResult)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to load data"
      setError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const loadAssignmentCounts = async (missionIds: string[]) => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("mission_assignments")
        .select("mission_id")
        .in("mission_id", missionIds)

      if (error) throw error

      const counts = new Map<string, number>()
      data?.forEach((assignment) => {
        counts.set(assignment.mission_id, (counts.get(assignment.mission_id) || 0) + 1)
      })
      setAssignmentCounts(counts)
    } catch (error) {
      console.error("Failed to load assignment counts:", error)
    }
  }

  const loadAssignments = async (missionId: string) => {
    try {
      setIsLoadingAssignments(true)
      const data = await getMissionAssignments(missionId)
      setAssignments(data)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load assignments",
        variant: "destructive",
      })
    } finally {
      setIsLoadingAssignments(false)
    }
  }

  const handleSelectMission = (mission: Mission) => {
    setSelectedMission(mission)
    setSearchQuery("")
    setSelectedUsers(new Set()) // Reset selection
    setShowUnassignedOnly(false)
    loadAssignments(mission.id)
    setIsAssignDialogOpen(true)
  }

  const handleBulkAssign = async () => {
    if (!selectedMission || selectedUsers.size === 0) return

    try {
      setIsBulkAssigning(true)
      const userIds = Array.from(selectedUsers)
      await assignMissionToUsers(selectedMission.id, userIds)
      
      await loadAssignments(selectedMission.id)
      setAssignmentCounts(prev => new Map(prev).set(selectedMission.id, (prev.get(selectedMission.id) || 0) + userIds.length))
      
      toast({
        title: "Success",
        description: `Assigned ${userIds.length} users successfully`,
      })
      setSelectedUsers(new Set())
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to assign users",
        variant: "destructive",
      })
    } finally {
      setIsBulkAssigning(false)
    }
  }

  const handleBulkRemove = async () => {
    if (!selectedMission || selectedUsers.size === 0) return

    try {
      setIsBulkRemoving(true)
      const userIds = Array.from(selectedUsers)
      await removeMissionFromUsers(selectedMission.id, userIds)
      
      await loadAssignments(selectedMission.id)
      setAssignmentCounts(prev => new Map(prev).set(selectedMission.id, Math.max(0, (prev.get(selectedMission.id) || 0) - userIds.length)))
      
      toast({
        title: "Success",
        description: `Removed ${userIds.length} users successfully`,
      })
      setSelectedUsers(new Set())
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove users",
        variant: "destructive",
      })
    } finally {
      setIsBulkRemoving(false)
    }
  }

  const handleAssignUser = async (userId: string) => {
    if (!selectedMission) return

    try {
      setAssigningUserId(userId)
      await assignMissionToUser(selectedMission.id, userId)
      
      const user = users.find(u => u.id === userId)
      if (user) {
        setAssignments(prev => [...prev, {
          id: crypto.randomUUID(),
          mission_id: selectedMission.id,
          user_id: userId,
          assigned_by: '',
          assigned_at: new Date().toISOString(),
          profile: { name: user.name, avatar_url: user.avatar_url }
        }])
        setAssignmentCounts(prev => new Map(prev).set(selectedMission.id, (prev.get(selectedMission.id) || 0) + 1))
      }
      
      toast({
        title: "Success",
        description: "Mission assigned successfully",
      })
      
      // Reload to ensure consistency
      await loadAssignments(selectedMission.id)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to assign mission",
        variant: "destructive",
      })
      // Revert optimistic update on error
      await loadAssignments(selectedMission.id)
    } finally {
      setAssigningUserId(null)
    }
  }

  const handleAssignAll = async () => {
    if (!selectedMission) return

    try {
      setIsAssigningAll(true)
      const result = await assignMissionToAllParticipants(selectedMission.id)
      await loadAssignments(selectedMission.id)
      setAssignmentCounts(prev => new Map(prev).set(selectedMission.id, result.count))
      toast({
        title: "Success",
        description: `Mission assigned to ${result.count} participants`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to assign mission to all",
        variant: "destructive",
      })
    } finally {
      setIsAssigningAll(false)
    }
  }

  const handleRemoveAssignment = async (userId: string) => {
    if (!selectedMission) return

    try {
      setRemovingUserId(userId)
      await removeMissionAssignment(selectedMission.id, userId)
      
      setAssignments(prev => prev.filter(a => a.user_id !== userId))
      setAssignmentCounts(prev => new Map(prev).set(selectedMission.id, Math.max(0, (prev.get(selectedMission.id) || 0) - 1)))
      
      toast({
        title: "Success",
        description: "Assignment removed",
      })
      
      setUserToRemove(null)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove assignment",
        variant: "destructive",
      })
      // Revert optimistic update on error
      await loadAssignments(selectedMission.id)
    } finally {
      setRemovingUserId(null)
    }
  }

  const assignedUserIds = new Set(assignments.map(a => a.user_id))
  
  const availableUsers = users.filter(u => 
    u.role === "participant" && 
    (!showUnassignedOnly || !assignedUserIds.has(u.id)) &&
    (u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
     u.email?.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const toggleUserSelection = (userId: string) => {
    const newSelected = new Set(selectedUsers)
    if (newSelected.has(userId)) {
      newSelected.delete(userId)
    } else {
      newSelected.add(userId)
    }
    setSelectedUsers(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedUsers.size === availableUsers.length) {
      setSelectedUsers(new Set())
    } else {
      setSelectedUsers(new Set(availableUsers.map(u => u.id)))
    }
  }

  const getTypeColor = (type?: string) => {
    const normalizedType = (type || "").toLowerCase()
    switch (normalizedType) {
      case "action": return "bg-[#B91C1C] text-[#FED6DE] border-[#B91C1C] hover:bg-[#B91C1C]/90"
      case "core": return "bg-[#0072CE] text-[#D9ECF8] border-[#0072CE] hover:bg-[#0072CE]/90"
      case "lite": return "bg-[#047857] text-[#CCF3E0] border-[#047857] hover:bg-[#047857]/90"
      case "elevate": return "bg-[#b45309] text-[#FEEFCE] border-[#b45309] hover:bg-[#b45309]/90"
      default: return "bg-[#404040] text-[#F2F2F2] border-[#404040] hover:bg-[#404040]/90"
    }
  }

  const filteredMissions = missions.filter(m => {
    const matchesSearch = m.title.toLowerCase().includes(missionSearchQuery.toLowerCase()) ||
      m.description.toLowerCase().includes(missionSearchQuery.toLowerCase())
    const matchesType = selectedType === "all" || m.type?.toLowerCase() === selectedType.toLowerCase()
    return matchesSearch && matchesType
  })

  const missionTypes = ["all", ...Array.from(new Set(missions.map(m => m.type).filter(Boolean)))]

  if (error) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Target className="h-8 w-8" />
                Mission Assignments
              </h1>
            </div>
            <Link href="/admin">
              <Button variant="outline">Back to Admin</Button>
            </Link>
          </div>
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <p className="text-destructive mb-4 font-semibold">{error}</p>
              <p className="text-sm text-muted-foreground mb-6">
                There was a problem loading the missions data. Please try again.
              </p>
              <Button onClick={loadData}>Retry</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Target className="h-8 w-8" />
              Mission Assignments
            </h1>
            <p className="text-muted-foreground mt-1">
              Assign missions to participants and manage access
            </p>
          </div>
          <Link href="/admin">
            <Button variant="outline">Back to Admin</Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <CardTitle>All Missions ({missions.length})</CardTitle>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
                  {missionTypes.map(type => (
                    <Button
                      key={type}
                      variant={selectedType === type ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedType(type as string)}
                      className={selectedType === type && type !== "all" ? getTypeColor(type as string) : ""}
                    >
                      {type === "all" ? "All" : (type as string).charAt(0).toUpperCase() + (type as string).slice(1)}
                    </Button>
                  ))}
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search missions..."
                    value={missionSearchQuery}
                    onChange={(e) => setMissionSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-12 flex-1" />
                    <Skeleton className="h-12 w-24" />
                    <Skeleton className="h-12 w-24" />
                    <Skeleton className="h-12 w-32" />
                  </div>
                ))}
              </div>
            ) : filteredMissions.length === 0 ? (
              <div className="text-center py-12">
                <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {missionSearchQuery ? "No missions found matching your search" : "No missions available"}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">Mission</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>Assigned</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMissions.map((mission) => (
                    <TableRow key={mission.id}>
                      <TableCell className="max-w-[300px]">
                        <div className="font-medium truncate" title={mission.title}>
                          {mission.title}
                        </div>
                        <div className="text-sm text-muted-foreground truncate" title={mission.description}>
                          {mission.description}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getTypeColor(mission.type)} border-0`}>
                          {mission.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{mission.points_value} EP</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {assignmentCounts.get(mission.id) || 0} users
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSelectMission(mission)}
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          Manage Access
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Manage Access: {selectedMission?.title}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Assigned Users ({assignments.length})
                  </h3>
                  <Button 
                    onClick={handleAssignAll} 
                    size="sm"
                    variant="outline"
                    disabled={isAssigningAll || isLoadingAssignments}
                  >
                    {isAssigningAll && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Assign to All Participants
                  </Button>
                </div>
                {isLoadingAssignments ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : assignments.length === 0 ? (
                  <div className="text-center py-8 border rounded-lg bg-muted/50">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">
                      No users assigned yet
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Assign users individually or assign to all participants
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {assignments.map((assignment) => (
                      <div
                        key={assignment.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={assignment.profile.avatar_url || undefined} />
                            <AvatarFallback>
                              {assignment.profile.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{assignment.profile.name}</span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setUserToRemove({ userId: assignment.user_id, userName: assignment.profile.name })}
                          disabled={removingUserId === assignment.user_id}
                        >
                          {removingUserId === assignment.user_id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <X className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Manage Users</h3>
                  {selectedUsers.size > 0 && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={handleBulkRemove}
                        disabled={isBulkRemoving}
                      >
                        {isBulkRemoving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                        Remove ({selectedUsers.size})
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleBulkAssign}
                        disabled={isBulkAssigning}
                      >
                        {isBulkAssigning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UserPlus className="h-4 w-4 mr-2" />}
                        Assign ({selectedUsers.size})
                      </Button>
                    </div>
                  )}
                </div>

                <div className="flex gap-4 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search users..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="show-unassigned" 
                      checked={showUnassignedOnly}
                      onCheckedChange={(checked) => setShowUnassignedOnly(checked as boolean)}
                    />
                    <label
                      htmlFor="show-unassigned"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Unassigned Only
                    </label>
                  </div>
                </div>

                <div className="flex items-center space-x-2 mb-2 px-3">
                  <Checkbox 
                    id="select-all" 
                    checked={availableUsers.length > 0 && selectedUsers.size === availableUsers.length}
                    onCheckedChange={toggleSelectAll}
                  />
                  <label
                    htmlFor="select-all"
                    className="text-sm text-muted-foreground"
                  >
                    Select All ({availableUsers.length})
                  </label>
                </div>

                {availableUsers.length === 0 ? (
                  <div className="text-center py-8 border rounded-lg bg-muted/50">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">
                      {searchQuery ? "No users found matching your search" : "No users available"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {availableUsers.map((user) => {
                      const isAssigned = assignedUserIds.has(user.id)
                      return (
                        <div
                          key={user.id}
                          className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
                            selectedUsers.has(user.id) ? "bg-primary/5 border-primary/50" : "hover:bg-muted/50"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox 
                              checked={selectedUsers.has(user.id)}
                              onCheckedChange={() => toggleUserSelection(user.id)}
                            />
                            <Avatar>
                              <AvatarImage src={user.avatar_url || undefined} />
                              <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium flex items-center gap-2">
                                {user.name}
                                {isAssigned && (
                                  <Badge variant="secondary" className="text-[10px] h-5">Assigned</Badge>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {user.job_title}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {isAssigned ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => setUserToRemove({ userId: user.id, userName: user.name })}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleAssignUser(user.id)}
                              >
                                <UserPlus className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!userToRemove} onOpenChange={(open) => !open && setUserToRemove(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Mission Assignment?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove this mission assignment from {userToRemove?.userName}? 
                They will no longer have access to this mission.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => userToRemove && handleRemoveAssignment(userToRemove.userId)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
