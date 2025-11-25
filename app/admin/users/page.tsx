"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Users, Shield, Eye, UserCheck, Pencil, Trash2, ExternalLink, Mail, Loader2 } from "lucide-react"
import {
  getAllUsers,
  updateUserRole,
  adminUpdateUserProfile,
  fetchUserSubmissions,
  deleteSubmissionAdmin,
  deleteUser,
  inviteUser,
  type UserSubmission,
  getActivityTreeForAssignment,
  getUserMissionAssignments,
  updateUserMissionAssignments,
} from "@/lib/admin-actions"
import { toast } from "@/components/ui/use-toast"
import type { Profile, UserRole } from "@/types/database"
import Link from "next/link"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { format } from "date-fns"
import ActivityTreeSelector from "@/components/admin/activity-tree-selector"

export default function AdminUsersPage() {
  const [users, setUsers] = useState<Profile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editingUser, setEditingUser] = useState<Profile | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  const [userSubmissions, setUserSubmissions] = useState<UserSubmission[]>([])
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false)
  const [deletingSubmissionId, setDeletingSubmissionId] = useState<string | null>(null)
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)

  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteName, setInviteName] = useState("")
  const [isInviting, setIsInviting] = useState(false)

  const [activityTree, setActivityTree] = useState<any[]>([])
  const [selectedMissionIds, setSelectedMissionIds] = useState<string[]>([])
  const [isLoadingActivities, setIsLoadingActivities] = useState(false)
  const [isSavingAssignments, setIsSavingAssignments] = useState(false)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await getAllUsers()
      setUsers(data)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to load users"
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

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      setUpdatingUserId(userId)
      await updateUserRole(userId, newRole)

      setUsers(users.map((u) => (u.id === userId ? { ...u, role: newRole } : u)))

      toast({
        title: "Role Updated",
        description: "User role has been updated successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update user role",
        variant: "destructive",
      })
    } finally {
      setUpdatingUserId(null)
    }
  }

  const handleEditUser = (user: Profile) => {
    setEditingUser(user)
    setIsEditDialogOpen(true)
    setUserSubmissions([])
    loadUserSubmissions(user.id)
    loadActivityAssignments(user.id)
  }

  const loadUserSubmissions = async (userId: string) => {
    try {
      setIsLoadingSubmissions(true)
      const submissions = await fetchUserSubmissions(userId)
      setUserSubmissions(submissions)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load user submissions",
        variant: "destructive",
      })
    } finally {
      setIsLoadingSubmissions(false)
    }
  }

  const handleDeleteSubmission = async (submissionId: string) => {
    if (!confirm("Are you sure you want to delete this submission? This action cannot be undone.")) return

    try {
      setDeletingSubmissionId(submissionId)
      await deleteSubmissionAdmin(submissionId)

      setUserSubmissions(userSubmissions.filter((s) => s.id !== submissionId))

      toast({
        title: "Submission Deleted",
        description: "The submission has been permanently deleted.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete submission",
        variant: "destructive",
      })
    } finally {
      setDeletingSubmissionId(null)
    }
  }

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (
      !confirm(
        `Are you sure you want to delete ${userName}? This will mark their account as deleted and they will no longer have access. This action cannot be undone.`,
      )
    )
      return

    try {
      setDeletingUserId(userId)
      await deleteUser(userId)

      // Remove user from local state
      setUsers(users.filter((u) => u.id !== userId))

      toast({
        title: "User Deleted",
        description: `${userName} has been successfully deleted.`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      })
    } finally {
      setDeletingUserId(null)
    }
  }

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail || !inviteName) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      })
      return
    }

    setIsInviting(true)
    try {
      await inviteUser(inviteEmail, inviteName)
      toast({
        title: "Invitation Sent",
        description: `Invitation sent to ${inviteEmail}`,
      })
      setIsInviteOpen(false)
      setInviteEmail("")
      setInviteName("")
      loadUsers()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send invitation",
        variant: "destructive",
      })
    } finally {
      setIsInviting(false)
    }
  }

  const handleSaveUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingUser) return

    try {
      setUpdatingUserId(editingUser.id)
      const formData = new FormData(e.currentTarget)

      const updates = {
        name: formData.get("name") as string,
        job_title: formData.get("job_title") as string,
        department: formData.get("department") as string,
        country: formData.get("country") as string,
        bio: formData.get("bio") as string,
        customer_obsession: formData.get("customer_obsession") as string,
      }

      await adminUpdateUserProfile(editingUser.id, updates)

      setUsers(users.map((u) => (u.id === editingUser.id ? { ...u, ...updates } : u)))
      setIsEditDialogOpen(false)

      toast({
        title: "Profile Updated",
        description: "User profile has been updated successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update user profile",
        variant: "destructive",
      })
    } finally {
      setUpdatingUserId(null)
    }
  }

  const loadActivityAssignments = async (userId: string) => {
    try {
      setIsLoadingActivities(true)
      const [tree, assignments] = await Promise.all([getActivityTreeForAssignment(), getUserMissionAssignments(userId)])
      setActivityTree(tree)
      setSelectedMissionIds(assignments)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load activity assignments",
        variant: "destructive",
      })
    } finally {
      setIsLoadingActivities(false)
    }
  }

  const handleSaveAssignments = async () => {
    if (!editingUser) return

    try {
      setIsSavingAssignments(true)
      await updateUserMissionAssignments(editingUser.id, selectedMissionIds)

      toast({
        title: "Assignments Updated",
        description: "User activity assignments have been updated successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update activity assignments",
        variant: "destructive",
      })
    } finally {
      setIsSavingAssignments(false)
    }
  }

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case "admin":
        return (
          <Badge className="bg-red-500">
            <Shield className="h-3 w-3 mr-1" />
            Admin
          </Badge>
        )
      case "participant":
        return (
          <Badge className="bg-green-500">
            <UserCheck className="h-3 w-3 mr-1" />
            Participant
          </Badge>
        )
      case "view_only":
        return (
          <Badge className="bg-gray-500">
            <Eye className="h-3 w-3 mr-1" />
            View Only
          </Badge>
        )
      default:
        return <Badge>{role}</Badge>
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-500 hover:bg-green-600"
      case "rejected":
        return "bg-red-500 hover:bg-red-600"
      default:
        return "bg-yellow-500 hover:bg-yellow-600"
    }
  }

  const roleStats = {
    admin: users.filter((u) => u.role === "admin").length,
    participant: users.filter((u) => u.role === "participant").length,
    view_only: users.filter((u) => u.role === "view_only").length,
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Users className="h-8 w-8" />
                User Management
              </h1>
            </div>
            <Link href="/admin">
              <Button variant="outline">Back to Admin</Button>
            </Link>
          </div>
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-destructive mb-4">{error}</p>
              <Button onClick={loadUsers}>Retry</Button>
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
              <Users className="h-8 w-8" />
              User Management
            </h1>
            <p className="text-muted-foreground mt-1">Manage user roles and permissions</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Mail className="mr-2 h-4 w-4" />
                  Invite User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite New User</DialogTitle>
                  <DialogDescription>
                    Send an email invitation to a new user. They will receive a link to set up their account.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleInviteUser} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="invite-name">Name</Label>
                    <Input
                      id="invite-name"
                      placeholder="John Doe"
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invite-email">Email</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      placeholder="john@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      required
                    />
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsInviteOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isInviting}>
                      {isInviting ? "Sending..." : "Send Invitation"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
            <Link href="/admin">
              <Button variant="outline">Back to Admin</Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Shield className="h-4 w-4 text-red-500" />
                Admins
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{roleStats.admin}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-green-500" />
                Participants
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{roleStats.participant}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Eye className="h-4 w-4 text-gray-500" />
                View Only
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{roleStats.view_only}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Users ({users.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading users...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Current Role</TableHead>
                    <TableHead>Change Role</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={user.avatar_url || undefined} />
                            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{user.name}</div>
                            <div className="text-sm text-muted-foreground">{user.job_title}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.department}</TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>
                        <Select
                          value={user.role}
                          onValueChange={(value) => handleRoleChange(user.id, value as UserRole)}
                          disabled={updatingUserId === user.id || deletingUserId === user.id}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="participant">Participant</SelectItem>
                            <SelectItem value="view_only">View Only</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditUser(user)}
                            disabled={updatingUserId === user.id || deletingUserId === user.id}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteUser(user.id, user.name)}
                            disabled={updatingUserId === user.id || deletingUserId === user.id}
                            className="text-red-500 hover:text-red-700 hover:bg-red-500/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Manage User: {editingUser?.name}</DialogTitle>
              <DialogDescription>Update profile details, manage submissions, or assign activities.</DialogDescription>
            </DialogHeader>

            {editingUser && (
              <Tabs defaultValue="profile" className="flex-1 flex flex-col overflow-hidden">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="profile">Profile Details</TabsTrigger>
                  <TabsTrigger value="submissions">Submissions</TabsTrigger>
                  <TabsTrigger value="assignments">Activities Assignments</TabsTrigger>
                </TabsList>

                <TabsContent value="profile" className="flex-1 overflow-y-auto py-4">
                  <form onSubmit={handleSaveUser} id="edit-user-form">
                    <div className="grid gap-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                          Name
                        </Label>
                        <Input id="name" name="name" defaultValue={editingUser.name} className="col-span-3" required />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="job_title" className="text-right">
                          Job Title
                        </Label>
                        <Input
                          id="job_title"
                          name="job_title"
                          defaultValue={editingUser.job_title || ""}
                          className="col-span-3"
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="department" className="text-right">
                          Department
                        </Label>
                        <Input
                          id="department"
                          name="department"
                          defaultValue={editingUser.department || ""}
                          className="col-span-3"
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="country" className="text-right">
                          Country
                        </Label>
                        <Input
                          id="country"
                          name="country"
                          defaultValue={editingUser.country || ""}
                          className="col-span-3"
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="bio" className="text-right">
                          Bio
                        </Label>
                        <Textarea id="bio" name="bio" defaultValue={editingUser.bio || ""} className="col-span-3" />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="customer_obsession" className="text-right">
                          Customer Obsession
                        </Label>
                        <Textarea
                          id="customer_obsession"
                          name="customer_obsession"
                          defaultValue={editingUser.customer_obsession || ""}
                          className="col-span-3"
                        />
                      </div>
                    </div>
                  </form>
                </TabsContent>

                <TabsContent value="submissions" className="flex-1 overflow-y-auto py-4">
                  {isLoadingSubmissions ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : userSubmissions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No submissions found for this user.</div>
                  ) : (
                    <div className="space-y-4">
                      {userSubmissions.map((submission) => (
                        <Card key={submission.id} className="overflow-hidden">
                          <CardHeader className="p-4 bg-muted/50 pb-2">
                            <div className="flex justify-between items-start">
                              <div>
                                <CardTitle className="text-sm font-medium">
                                  {submission.mission?.title || "Unknown Mission"}
                                </CardTitle>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {format(new Date(submission.created_at), "MMM d, yyyy • h:mm a")}
                                </div>
                              </div>
                              <Badge className={getStatusBadgeVariant(submission.status)}>{submission.status}</Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="p-4 pt-2">
                            {submission.text_submission && (
                              <div className="mb-3">
                                <p className="text-xs font-semibold mb-1">Text Submission:</p>
                                <p className="text-sm text-muted-foreground line-clamp-3 bg-muted p-2 rounded-md">
                                  {submission.text_submission}
                                </p>
                              </div>
                            )}

                            {submission.media_url && (
                              <div className="mb-3">
                                <p className="text-xs font-semibold mb-1">Media:</p>
                                <a
                                  href={submission.media_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-blue-500 hover:underline flex items-center gap-1"
                                >
                                  <ExternalLink className="h-3 w-3" /> View Attachment
                                </a>
                              </div>
                            )}

                            <div className="flex justify-between items-center mt-4 pt-2 border-t">
                              <div className="text-xs font-medium">
                                Points: {submission.points_awarded} / {submission.mission?.points_value || 0}
                              </div>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="h-8"
                                onClick={() => handleDeleteSubmission(submission.id)}
                                disabled={deletingSubmissionId === submission.id}
                              >
                                <Trash2 className="h-3 w-3 mr-1" />
                                Delete
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="assignments" className="flex-1 overflow-hidden flex flex-col">
                  <div className="space-y-4 flex-1 flex flex-col overflow-hidden">
                    <div>
                      <h3 className="text-lg font-semibold">Assign Activities</h3>
                      <p className="text-sm text-muted-foreground">Select which activities to assign to this user</p>
                    </div>

                    {isLoadingActivities ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : (
                      <div className="flex-1 overflow-hidden">
                        <ActivityTreeSelector
                          activities={activityTree}
                          selectedMissionIds={selectedMissionIds}
                          onSelectionChange={setSelectedMissionIds}
                        />
                      </div>
                    )}

                    <div className="flex justify-end gap-2 pt-4 border-t">
                      <Button
                        variant="outline"
                        onClick={() => setIsEditDialogOpen(false)}
                        disabled={isSavingAssignments}
                      >
                        Cancel
                      </Button>
                      <Button onClick={handleSaveAssignments} disabled={isSavingAssignments}>
                        {isSavingAssignments ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          "Save Assignments"
                        )}
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
