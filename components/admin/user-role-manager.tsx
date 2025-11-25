"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { updateUserRole } from "@/lib/admin-actions"
import { toast } from "@/components/ui/use-toast"
import { Search } from "lucide-react"
import type { Profile, UserRole } from "@/types/database"

interface UserRoleManagerProps {
  initialUsers: Profile[]
}

export function UserRoleManager({ initialUsers }: UserRoleManagerProps) {
  const [users, setUsers] = useState(initialUsers)
  const [searchQuery, setSearchQuery] = useState("")
  const [isUpdating, setIsUpdating] = useState<string | null>(null)

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setIsUpdating(userId)
    try {
      const result = await updateUserRole(userId, newRole)
      if (result.success) {
        setUsers(
          users.map((user) => (user.id === userId ? { ...user, role: newRole, is_admin: newRole === "admin" } : user)),
        )
        toast({
          title: "Role updated",
          description: "User role has been successfully updated.",
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to update user role.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update user role.",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(null)
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20"
      case "participant":
        return "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/20"
      case "view_only":
        return "bg-gray-500/10 text-gray-500 hover:bg-gray-500/20 border-gray-500/20"
      default:
        return "bg-gray-500/10 text-gray-500"
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 max-w-sm">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-9"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Current Role</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{user.name}</span>
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={getRoleBadgeColor(user.role || "participant")}>
                    {user.role || "participant"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Select
                    disabled={isUpdating === user.id}
                    value={user.role || "participant"}
                    onValueChange={(value) => handleRoleChange(user.id, value as UserRole)}
                  >
                    <SelectTrigger className="w-[140px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="participant">Participant</SelectItem>
                      <SelectItem value="view_only">View Only</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
            {filteredUsers.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  No users found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
