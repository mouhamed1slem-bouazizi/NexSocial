import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/useToast"
import { getUserPreferences, updateUserPreferences, UserPreferences } from "@/api/auth"
import api from "@/api/api"
import { SubredditManagement } from "@/components/SubredditManagement"
import {
  User,
  Bell,
  Shield,
  Palette,
  Globe,
  CreditCard,
  Download,
  Upload,
  Trash2,
  Eye,
  EyeOff,
  MessageSquare,
  Hash,
  X
} from "lucide-react"

export function Settings() {
  const [profile, setProfile] = useState({
    name: 'John Doe',
    email: 'john@example.com',
    bio: 'Social media manager passionate about creating engaging content.',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
    timezone: 'America/New_York',
    language: 'en'
  })

  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    pushNotifications: true,
    postPublished: true,
    postFailed: true,
    newComments: true,
    newMentions: true,
    weeklyReport: true,
    monthlyReport: false
  })

  const [privacy, setPrivacy] = useState({
    profileVisibility: 'team',
    analyticsSharing: false,
    dataExport: true
  })

  const [userPreferences, setUserPreferences] = useState<UserPreferences>({
    discord: {
      showChannelsWithRules: false,
      showChannelsWithAnnouncements: false,
      customChannelFilters: []
    }
  })

  const [showPassword, setShowPassword] = useState(false)
  const [telegramWebhook, setTelegramWebhook] = useState({
    url: '',
    isSetup: false,
    isLoading: false
  })
  const [telegramDatabase, setTelegramDatabase] = useState({
    isFixed: false,
    isLoading: false
  })
  const [newCustomFilter, setNewCustomFilter] = useState('')
  const { toast } = useToast()

  // Load user preferences on component mount
  const loadUserPreferences = async () => {
    try {
      const response = await getUserPreferences()
      if (response.success) {
        setUserPreferences(response.data.preferences)
      }
    } catch (error: any) {
      console.error('Failed to load user preferences:', error)
      // Use default preferences if loading fails
    }
  }

  // Save Discord preferences
  const handleSaveDiscordPreferences = async () => {
    try {
      const response = await updateUserPreferences(userPreferences)
      if (response.success) {
        toast({
          title: "Success",
          description: "Discord preferences updated successfully!",
        })
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update Discord preferences",
        variant: "destructive"
      })
    }
  }

  // Add custom channel filter
  const addCustomChannelFilter = () => {
    if (newCustomFilter.trim() && !userPreferences.discord.customChannelFilters.includes(newCustomFilter.trim())) {
      setUserPreferences(prev => ({
        ...prev,
        discord: {
          ...prev.discord,
          customChannelFilters: [...prev.discord.customChannelFilters, newCustomFilter.trim()]
        }
      }))
      setNewCustomFilter('')
    }
  }

  // Remove custom channel filter
  const removeCustomChannelFilter = (filter: string) => {
    setUserPreferences(prev => ({
      ...prev,
      discord: {
        ...prev.discord,
        customChannelFilters: prev.discord.customChannelFilters.filter(f => f !== filter)
      }
    }))
  }

  // Load preferences on component mount
  useEffect(() => {
    loadUserPreferences()
  }, [])

  const handleSaveProfile = async () => {
    try {
      // Mock save functionality
      await new Promise(resolve => setTimeout(resolve, 1000))
      toast({
        title: "Success",
        description: "Profile updated successfully!",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive"
      })
    }
  }

  const handleSaveNotifications = async () => {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      toast({
        title: "Success",
        description: "Notification preferences updated!",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update notifications",
        variant: "destructive"
      })
    }
  }

  const handleExportData = async () => {
    try {
      await new Promise(resolve => setTimeout(resolve, 2000))
      toast({
        title: "Success",
        description: "Data export started. You'll receive an email when ready.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export data",
        variant: "destructive"
      })
    }
  }

  const handleTelegramWebhookSetup = async () => {
    setTelegramWebhook(prev => ({ ...prev, isLoading: true }))
    
    try {
      const response = await api.post('/oauth/telegram/setup-webhook', {
        webhookUrl: telegramWebhook.url || undefined
      })

      if (response.data.success) {
        setTelegramWebhook(prev => ({ ...prev, isSetup: true }))
        toast({
          title: "Success",
          description: `Telegram webhook setup successfully! Bot: @${response.data.botInfo?.username}`,
        })
      } else {
        throw new Error(response.data.error || 'Setup failed')
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || error.message || "Failed to setup Telegram webhook",
        variant: "destructive"
      })
    } finally {
      setTelegramWebhook(prev => ({ ...prev, isLoading: false }))
    }
  }

  const handleTelegramDatabaseFix = async () => {
    setTelegramDatabase(prev => ({ ...prev, isLoading: true }))
    
    try {
      const response = await api.post('/oauth/telegram/fix-database')

      if (response.data.success) {
        setTelegramDatabase(prev => ({ ...prev, isFixed: true }))
        toast({
          title: "Success",
          description: "Database constraint fixed! Telegram connections are now enabled.",
        })
      } else {
        // Show manual instructions
        const manualSql = response.data.manual_sql?.join('\n\n') || 'Check console for SQL commands'
        toast({
          title: "Manual Fix Required",
          description: `${response.data.message}. Check console for SQL commands.`,
          variant: "destructive"
        })
        console.log('🔧 Manual SQL Commands:')
        console.log('========================')
        console.log(response.data.manual_sql?.join('\n\n'))
        console.log('========================')
        console.log(response.data.instructions)
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || error.message || "Failed to fix database constraint",
        variant: "destructive"
      })
    } finally {
      setTelegramDatabase(prev => ({ ...prev, isLoading: false }))
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your account settings and preferences
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
                  <TabsList className="grid w-full grid-cols-6">
                      <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="privacy">Privacy</TabsTrigger>
            <TabsTrigger value="subreddits">Subreddits</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Information
              </CardTitle>
              <CardDescription>
                Update your personal information and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={profile.avatar} alt={profile.name} />
                  <AvatarFallback>{profile.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <Button variant="outline">
                    <Upload className="mr-2 h-4 w-4" />
                    Change Avatar
                  </Button>
                  <Button variant="outline" className="text-red-600 hover:text-red-700">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remove
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={profile.name}
                    onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                    className="mt-2"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={profile.bio}
                  onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                  className="mt-2"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select value={profile.timezone} onValueChange={(value) => setProfile(prev => ({ ...prev, timezone: value }))}>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/New_York">Eastern Time</SelectItem>
                      <SelectItem value="America/Chicago">Central Time</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                      <SelectItem value="Europe/London">London</SelectItem>
                      <SelectItem value="Europe/Paris">Paris</SelectItem>
                      <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="language">Language</Label>
                  <Select value={profile.language} onValueChange={(value) => setProfile(prev => ({ ...prev, language: value }))}>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                      <SelectItem value="it">Italian</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveProfile}>
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>
                Update your password to keep your account secure
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="current-password">Current Password</Label>
                <div className="relative mt-2">
                  <Input
                    id="current-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter current password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div>
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Enter new password"
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Confirm new password"
                  className="mt-2"
                />
              </div>
              <div className="flex justify-end">
                <Button>Update Password</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Choose how you want to be notified about important events
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="email-notifications">Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                  </div>
                  <Switch
                    id="email-notifications"
                    checked={notifications.emailNotifications}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, emailNotifications: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="push-notifications">Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive browser push notifications</p>
                  </div>
                  <Switch
                    id="push-notifications"
                    checked={notifications.pushNotifications}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, pushNotifications: checked }))}
                  />
                </div>
              </div>

              <div className="border-t pt-6">
                <h4 className="font-medium mb-4">Post Notifications</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="post-published">Post Published</Label>
                      <p className="text-sm text-muted-foreground">When your posts are successfully published</p>
                    </div>
                    <Switch
                      id="post-published"
                      checked={notifications.postPublished}
                      onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, postPublished: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="post-failed">Post Failed</Label>
                      <p className="text-sm text-muted-foreground">When posts fail to publish</p>
                    </div>
                    <Switch
                      id="post-failed"
                      checked={notifications.postFailed}
                      onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, postFailed: checked }))}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h4 className="font-medium mb-4">Engagement Notifications</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="new-comments">New Comments</Label>
                      <p className="text-sm text-muted-foreground">When someone comments on your posts</p>
                    </div>
                    <Switch
                      id="new-comments"
                      checked={notifications.newComments}
                      onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, newComments: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="new-mentions">New Mentions</Label>
                      <p className="text-sm text-muted-foreground">When someone mentions you</p>
                    </div>
                    <Switch
                      id="new-mentions"
                      checked={notifications.newMentions}
                      onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, newMentions: checked }))}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h4 className="font-medium mb-4">Report Notifications</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="weekly-report">Weekly Report</Label>
                      <p className="text-sm text-muted-foreground">Weekly performance summary</p>
                    </div>
                    <Switch
                      id="weekly-report"
                      checked={notifications.weeklyReport}
                      onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, weeklyReport: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="monthly-report">Monthly Report</Label>
                      <p className="text-sm text-muted-foreground">Monthly analytics report</p>
                    </div>
                    <Switch
                      id="monthly-report"
                      checked={notifications.monthlyReport}
                      onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, monthlyReport: checked }))}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveNotifications}>
                  Save Preferences
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy" className="space-y-6">
          <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Privacy Settings
              </CardTitle>
              <CardDescription>
                Control your privacy and data sharing preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="profile-visibility">Profile Visibility</Label>
                  <p className="text-sm text-muted-foreground">Who can see your profile information</p>
                </div>
                <Select value={privacy.profileVisibility} onValueChange={(value) => setPrivacy(prev => ({ ...prev, profileVisibility: value }))}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="team">Team Only</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="analytics-sharing">Analytics Sharing</Label>
                  <p className="text-sm text-muted-foreground">Share anonymous analytics to improve the platform</p>
                </div>
                <Switch
                  id="analytics-sharing"
                  checked={privacy.analyticsSharing}
                  onCheckedChange={(checked) => setPrivacy(prev => ({ ...prev, analyticsSharing: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="data-export">Data Export</Label>
                  <p className="text-sm text-muted-foreground">Allow data export and backup</p>
                </div>
                <Switch
                  id="data-export"
                  checked={privacy.dataExport}
                  onCheckedChange={(checked) => setPrivacy(prev => ({ ...prev, dataExport: checked }))}
                />
              </div>

              <div className="border-t pt-6">
                <h4 className="font-medium mb-4">Data Management</h4>
                <div className="space-y-4">
                  <Button variant="outline" onClick={handleExportData}>
                    <Download className="mr-2 h-4 w-4" />
                    Export My Data
                  </Button>
                  <Button variant="outline" className="text-red-600 hover:text-red-700">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Account
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subreddits" className="space-y-6">
          <SubredditManagement />
        </TabsContent>

        <TabsContent value="billing" className="space-y-6">
          <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Billing & Subscription
              </CardTitle>
              <CardDescription>
                Manage your subscription and billing information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-medium">Pro Plan</h3>
                  <p className="text-sm text-muted-foreground">$29/month • Billed monthly</p>
                </div>
                <Badge className="bg-green-100 text-green-800">Active</Badge>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Payment Method</h4>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5" />
                    <div>
                      <p className="font-medium">•••• •••• •••• 4242</p>
                      <p className="text-sm text-muted-foreground">Expires 12/25</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Update
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Billing History</h4>
                <div className="space-y-2">
                  {[
                    { date: '2024-01-01', amount: '$29.00', status: 'Paid' },
                    { date: '2023-12-01', amount: '$29.00', status: 'Paid' },
                    { date: '2023-11-01', amount: '$29.00', status: 'Paid' }
                  ].map((invoice, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <p className="font-medium">{invoice.amount}</p>
                        <p className="text-sm text-muted-foreground">{invoice.date}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{invoice.status}</Badge>
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-6">
          <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Advanced Settings</CardTitle>
              <CardDescription>
                Advanced configuration options for power users
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-medium">API Access</h4>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Label>API Key</Label>
                    <Button variant="outline" size="sm">
                      Regenerate
                    </Button>
                  </div>
                  <Input
                    value="nx_1234567890abcdef"
                    readOnly
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Use this key to access the Nexura API
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Webhooks</h4>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Label>Webhook URL</Label>
                    <Button variant="outline" size="sm">
                      Test
                    </Button>
                  </div>
                  <Input
                    placeholder="https://your-app.com/webhooks/nexura"
                    className="mb-2"
                  />
                  <p className="text-xs text-muted-foreground">
                    Receive real-time notifications about post status changes
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Telegram Bot Configuration
                </h4>
                
                {/* Database Fix Section */}
                <div className="p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-yellow-800 dark:text-yellow-200">
                        Database Configuration
                      </p>
                      <p className="text-sm text-yellow-600 dark:text-yellow-300">
                        Fix database constraint to enable Telegram connections
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {telegramDatabase.isFixed && (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                          Fixed
                        </Badge>
                      )}
                      <Button 
                        onClick={handleTelegramDatabaseFix}
                        disabled={telegramDatabase.isLoading}
                        size="sm"
                        variant="outline"
                        className="border-yellow-300 text-yellow-800 hover:bg-yellow-100 dark:border-yellow-600 dark:text-yellow-300 dark:hover:bg-yellow-900/30"
                      >
                        {telegramDatabase.isLoading ? "Fixing..." : "Fix Database"}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Webhook Setup Section */}
                <div className="p-4 border rounded-lg">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="telegram-webhook-url">Custom Webhook URL (Optional)</Label>
                      <Input
                        id="telegram-webhook-url"
                        placeholder="https://yourserver.com/api/oauth/telegram/webhook"
                        value={telegramWebhook.url}
                        onChange={(e) => setTelegramWebhook(prev => ({ ...prev, url: e.target.value }))}
                        className="mt-2"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Leave empty to use the default webhook URL
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Setup Telegram Webhook</p>
                        <p className="text-sm text-muted-foreground">
                          Configure your Telegram bot to receive messages
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {telegramWebhook.isSetup && (
                          <Badge className="bg-green-100 text-green-800">
                            Active
                          </Badge>
                        )}
                        <Button 
                          onClick={handleTelegramWebhookSetup}
                          disabled={telegramWebhook.isLoading}
                          size="sm"
                        >
                          {telegramWebhook.isLoading ? "Setting up..." : "Setup Webhook"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Hash className="h-4 w-4 text-purple-600" />
                  Discord Channel Filtering
                </h4>
                
                <div className="p-4 border rounded-lg bg-purple-50 dark:bg-purple-900/20">
                  <div className="space-y-4">
                    <div>
                      <p className="font-medium text-purple-800 dark:text-purple-200 mb-2">
                        Channel Visibility Settings
                      </p>
                      <p className="text-sm text-purple-600 dark:text-purple-300 mb-4">
                        Control which Discord channels are shown in the channel selector when creating posts.
                      </p>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="show-rules-channels">Show channels with "rules" in name</Label>
                          <p className="text-sm text-muted-foreground">Include channels containing "rules" in the channel list</p>
                        </div>
                        <Switch
                          id="show-rules-channels"
                          checked={userPreferences.discord.showChannelsWithRules}
                          onCheckedChange={(checked) => setUserPreferences(prev => ({
                            ...prev,
                            discord: { ...prev.discord, showChannelsWithRules: checked }
                          }))}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="show-announcements-channels">Show channels with "announcements" in name</Label>
                          <p className="text-sm text-muted-foreground">Include channels containing "announcements" in the channel list</p>
                        </div>
                        <Switch
                          id="show-announcements-channels"
                          checked={userPreferences.discord.showChannelsWithAnnouncements}
                          onCheckedChange={(checked) => setUserPreferences(prev => ({
                            ...prev,
                            discord: { ...prev.discord, showChannelsWithAnnouncements: checked }
                          }))}
                        />
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <Label htmlFor="custom-filters">Custom Channel Filters</Label>
                      <p className="text-sm text-muted-foreground mb-3">
                        Add keywords to hide channels containing these terms (case-insensitive)
                      </p>
                      
                      <div className="flex gap-2 mb-3">
                        <Input
                          id="custom-filters"
                          placeholder="Enter channel keyword to filter"
                          value={newCustomFilter}
                          onChange={(e) => setNewCustomFilter(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && addCustomChannelFilter()}
                        />
                        <Button onClick={addCustomChannelFilter} size="sm" disabled={!newCustomFilter.trim()}>
                          Add
                        </Button>
                      </div>

                      {userPreferences.discord.customChannelFilters.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Active Filters:</p>
                          <div className="flex flex-wrap gap-2">
                            {userPreferences.discord.customChannelFilters.map((filter, index) => (
                              <Badge
                                key={index}
                                variant="secondary"
                                className="flex items-center gap-1"
                              >
                                {filter}
                                <X 
                                  className="h-3 w-3 cursor-pointer hover:text-destructive" 
                                  onClick={() => removeCustomChannelFilter(filter)}
                                />
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end pt-3 border-t">
                      <Button onClick={handleSaveDiscordPreferences} size="sm">
                        Save Discord Settings
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h4 className="font-medium mb-4 text-red-600">Danger Zone</h4>
                <div className="space-y-4">
                  <Button variant="outline" className="text-red-600 hover:text-red-700">
                    Reset All Settings
                  </Button>
                  <Button variant="outline" className="text-red-600 hover:text-red-700">
                    Clear All Data
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}