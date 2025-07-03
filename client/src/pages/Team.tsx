import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/useToast"
import {
  Users,
  Plus,
  Mail,
  Shield,
  Edit,
  Trash2,
  Crown,
  UserCheck,
  Clock,
  Activity
} from "lucide-react"

interface TeamMember {
  _id: string
  name: string
  email: string
  avatar: string
  role: 'admin' | 'editor' | 'contributor' | 'viewer'
  status: 'active' | 'pending' | 'inactive'
  joinedAt: string
  lastActive: string
  permissions: string[]
}

const rolePermissions = {
  admin: ['manage_team', 'manage_accounts', 'create_posts', 'schedule_posts', 'view_analytics', 'manage_settings'],
  editor: ['create_posts', 'schedule_posts', 'view_analytics', 'manage_media'],
  contributor: ['create_posts', 'view_analytics'],
  viewer: ['view_analytics']
}

const roleColors = {
  admin: 'bg-red-100 text-red-800',
  editor: 'bg-blue-100 text-blue-800',
  contributor: 'bg-green-100 text-green-800',
  viewer: 'bg-gray-100 text-gray-800'
}

export function Team() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<string>('contributor')
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    // Mock team data
    const mockMembers: TeamMember[] = [
      {
        _id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
        role: 'admin',
        status: 'active',
        joinedAt: '2024-01-01T00:00:00Z',
        lastActive: '2024-01-15T10:30:00Z',
        permissions: rolePermissions.admin
      },
      {
        _id: '2',
        name: 'Sarah Wilson',
        email: 'sarah@example.com',
        avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face',
        role: 'editor',
        status: 'active',
        joinedAt: '2024-01-05T00:00:00Z',
        lastActive: '2024-01-15T09:15:00Z',
        permissions: rolePermissions.editor
      },
      {
        _id: '3',
        name: 'Mike Chen',
        email: 'mike@example.com',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
        role: 'contributor',
        status: 'active',
        joinedAt: '2024-01-10T00:00:00Z',
        lastActive: '2024-01-14T16:45:00Z',
        permissions: rolePermissions.contributor
      },
      {
        _id: '4',
        name: 'Emma Davis',
        email: 'emma@example.com',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
        role: 'viewer',
        status: 'pending',
        joinedAt: '2024-01-14T00:00:00Z',
        lastActive: '',
        permissions: rolePermissions.viewer
      }
    ]

    setMembers(mockMembers)
    setLoading(false)
  }, [])

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive"
      })
      return
    }

    try {
      // Mock invite functionality
      await new Promise(resolve => setTimeout(resolve, 1000))

      const newMember: TeamMember = {
        _id: Date.now().toString(),
        name: inviteEmail.split('@')[0],
        email: inviteEmail,
        avatar: '',
        role: inviteRole as any,
        status: 'pending',
        joinedAt: new Date().toISOString(),
        lastActive: '',
        permissions: rolePermissions[inviteRole as keyof typeof rolePermissions]
      }

      setMembers(prev => [...prev, newMember])
      setInviteEmail("")
      setInviteRole('contributor')
      setShowInviteDialog(false)

      toast({
        title: "Success",
        description: "Team member invited successfully!",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to invite team member",
        variant: "destructive"
      })
    }
  }

  const handleRoleChange = async (memberId: string, newRole: string) => {
    try {
      setMembers(prev => prev.map(member =>
        member._id === memberId
          ? { ...member, role: newRole as any, permissions: rolePermissions[newRole as keyof typeof rolePermissions] }
          : member
      ))

      toast({
        title: "Success",
        description: "Role updated successfully!",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update role",
        variant: "destructive"
      })
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    try {
      setMembers(prev => prev.filter(member => member._id !== memberId))

      toast({
        title: "Success",
        description: "Team member removed successfully!",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove team member",
        variant: "destructive"
      })
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return Crown
      case 'editor':
        return Edit
      case 'contributor':
        return UserCheck
      default:
        return Shield
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return Activity
      case 'pending':
        return Clock
      default:
        return Shield
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-slate-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Team Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your team members and their permissions
          </p>
        </div>
        <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-500 to-indigo-600">
              <Plus className="mr-2 h-4 w-4" />
              Invite Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Team Member</DialogTitle>
              <DialogDescription>
                Send an invitation to join your team
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="colleague@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="contributor">Contributor</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleInvite}>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Invite
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Team Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Users className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                  {members.filter(m => m.status === 'active').length}
                </p>
                <p className="text-sm text-blue-600 dark:text-blue-400">Active Members</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Crown className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                  {members.filter(m => m.role === 'admin').length}
                </p>
                <p className="text-sm text-green-600 dark:text-green-400">Admins</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Clock className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                  {members.filter(m => m.status === 'pending').length}
                </p>
                <p className="text-sm text-orange-600 dark:text-orange-400">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Shield className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                  {members.length}
                </p>
                <p className="text-sm text-purple-600 dark:text-purple-400">Total Members</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Members */}
      <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            Manage roles and permissions for your team
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {members.map((member) => {
              const RoleIcon = getRoleIcon(member.role)
              const StatusIcon = getStatusIcon(member.status)

              return (
                <div key={member._id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={member.avatar} alt={member.name} />
                      <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{member.name}</h3>
                        <Badge className={roleColors[member.role]}>
                          <RoleIcon className="h-3 w-3 mr-1" />
                          {member.role}
                        </Badge>
                        <Badge variant={member.status === 'active' ? 'secondary' : 'outline'}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {member.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                        <span>Joined {new Date(member.joinedAt).toLocaleDateString()}</span>
                        {member.lastActive && (
                          <span>Last active {new Date(member.lastActive).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Select
                      value={member.role}
                      onValueChange={(value) => handleRoleChange(member._id, value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="contributor">Contributor</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveMember(member._id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Role Permissions */}
      <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Role Permissions</CardTitle>
          <CardDescription>
            Understanding what each role can do
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Object.entries(rolePermissions).map(([role, permissions]) => {
              const RoleIcon = getRoleIcon(role)
              return (
                <div key={role} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <RoleIcon className="h-5 w-5" />
                    <h3 className="font-medium capitalize">{role}</h3>
                  </div>
                  <div className="space-y-1">
                    {permissions.map((permission) => (
                      <div key={permission} className="text-sm text-muted-foreground">
                        • {permission.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}