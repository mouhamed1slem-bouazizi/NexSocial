import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/useToast"
import { getSocialAccounts, disconnectSocialAccount, initiateOAuth, syncTelegramSubscribers } from "@/api/socialAccounts"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from "recharts"
import {
  Users,
  MessageSquare,
  Heart,
  Share2,
  TrendingUp,
  Calendar,
  Plus,
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  Youtube,
  Trash2,
  AlertCircle,
  CheckCircle,
  Video,
  Pin,
  Send,
  Camera,
  Circle,
  Hash,
  Tv,
  Square,
  RefreshCw
} from "lucide-react"
import { SocialAccount } from "@/api/socialAccounts"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const platformIcons = {
  facebook: Facebook,
  instagram: Instagram,
  twitter: Twitter,
  linkedin: Linkedin,
  youtube: Youtube,
  tiktok: Video,
  pinterest: Pin,
  discord: MessageSquare,
  telegram: Send,
  whatsapp: MessageSquare,
  snapchat: Camera,
  reddit: Circle,
  vimeo: Video,
  threads: Hash,
  twitch: Tv,
  line: MessageSquare,
  tumblr: Square,
  vk: Users
}

const platformColors = {
  facebook: "#1877F2",
  instagram: "#E4405F",
  twitter: "#1DA1F2",
  linkedin: "#0A66C2",
  youtube: "#FF0000",
  tiktok: "#000000",
  pinterest: "#E60023",
  discord: "#7289DA",
  telegram: "#0088CC",
  whatsapp: "#25D366",
  snapchat: "#FFFC00",
  reddit: "#FF4500",
  vimeo: "#1AB7EA",
  threads: "#000000",
  twitch: "#9146FF",
  line: "#00C300",
  tumblr: "#001935",
  vk: "#4680C2"
}

export function Dashboard() {
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [connecting, setConnecting] = useState<string | null>(null)
  const [syncing, setSyncing] = useState<string | null>(null)
  const { toast } = useToast()

  // Mock data for charts
  const engagementData = [
    { name: 'Mon', likes: 45, comments: 12, shares: 8 },
    { name: 'Tue', likes: 52, comments: 18, shares: 12 },
    { name: 'Wed', likes: 38, comments: 15, shares: 6 },
    { name: 'Thu', likes: 61, comments: 22, shares: 14 },
    { name: 'Fri', likes: 55, comments: 19, shares: 11 },
    { name: 'Sat', likes: 67, comments: 25, shares: 16 },
    { name: 'Sun', likes: 48, comments: 16, shares: 9 }
  ]

  const followerGrowth = [
    { name: 'Jan', followers: 1200 },
    { name: 'Feb', followers: 1350 },
    { name: 'Mar', followers: 1580 },
    { name: 'Apr', followers: 1720 },
    { name: 'May', followers: 1890 },
    { name: 'Jun', followers: 2100 }
  ]

  const platformDistribution = [
    { name: 'Facebook', value: 35, color: '#1877F2' },
    { name: 'Instagram', value: 28, color: '#E4405F' },
    { name: 'Twitter', value: 22, color: '#1DA1F2' },
    { name: 'LinkedIn', value: 15, color: '#0A66C2' }
  ]

  useEffect(() => {
    fetchSocialAccounts()
    
    // Check for OAuth callback results
    const urlParams = new URLSearchParams(window.location.search)
    const success = urlParams.get('success')
    const error = urlParams.get('error')
    
    if (success) {
      const platform = success.replace('_connected', '')
      toast({
        title: "Success",
        description: `${platform.charAt(0).toUpperCase() + platform.slice(1)} account connected successfully!`
      })
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname)
      // Refresh accounts
      fetchSocialAccounts()
    }
    
    if (error) {
      let errorMessage = "Failed to connect account"
      switch (error) {
        case 'access_denied':
          errorMessage = "Access was denied. Please try again."
          break
        case 'token_exchange_failed':
          errorMessage = "Failed to exchange authorization code. Please try again."
          break
        case 'profile_fetch_failed':
          errorMessage = "Failed to fetch profile information. Please try again."
          break
        case 'connection_failed':
          errorMessage = "Connection failed. Please try again."
          break
        case 'no_instagram_account':
          errorMessage = "No Instagram business account found. Please ensure you have a business account."
          break
        case 'no_youtube_channel':
          errorMessage = "No YouTube channel found. Please create a channel first."
          break
        case 'invalid_twitter_credentials':
          errorMessage = "Invalid Twitter credentials. Please check your TWITTER_CLIENT_ID and TWITTER_CLIENT_SECRET in your .env file."
          break
        case 'invalid_authorization_code':
          errorMessage = "Invalid authorization code. Please try connecting again."
          break
        case 'invalid_oauth_request':
          errorMessage = "Invalid OAuth request. Please check your Twitter app configuration."
          break
      }
      
      toast({
        title: "Connection Failed",
        description: errorMessage,
        variant: "destructive"
      })
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

  const fetchSocialAccounts = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log('📊 Fetching social accounts...')
      const response = await getSocialAccounts()
      console.log('✅ Social accounts response:', response)
      setSocialAccounts(response || [])
    } catch (err: any) {
      console.error('❌ Error fetching social accounts:', err)
      setError(err.message)
      toast({
        title: "Error",
        description: "Failed to load social accounts",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleConnectAccount = async (platform: string) => {
    if (platform === 'new') {
      return
    }

    try {
      setConnecting(platform)
      console.log(`🔗 Initiating OAuth for ${platform}...`)
      
      const response = await initiateOAuth(platform)
      
      if (response.success) {
        if (platform === 'telegram') {
          // Handle Telegram connection with modal/instructions
          const { connectionCode, instructions, botUsername } = response
          
          // Show a modal or alert with instructions
          const message = `To connect your Telegram group/channel:

1. Add our bot (@${botUsername}) to your group/channel
2. Make the bot an admin with posting permissions  
3. Send this code to the bot: ${connectionCode}
4. You'll receive a confirmation message

Connection code: ${connectionCode}
(This code expires in 10 minutes)

The bot will confirm when the connection is successful.`

          toast({
            title: "Telegram Connection Instructions",
            description: message,
            duration: 15000, // Show for 15 seconds
          })
          
          // Also log to console for easy copying
          console.log('📱 Telegram Connection Instructions:')
          console.log(instructions)
          console.log(`🤖 Bot Username: @${botUsername}`)
          console.log(`🔐 Connection Code: ${connectionCode}`)
          
        } else if (response.authUrl) {
          console.log(`✅ OAuth URL received for ${platform}, redirecting...`)
          window.location.href = response.authUrl
        } else {
          throw new Error('Failed to get OAuth URL')
        }
      } else {
        throw new Error('Failed to initiate connection')
      }
    } catch (err: any) {
      console.error(`❌ Error initiating OAuth for ${platform}:`, err)
      toast({
        title: "Connection Failed",
        description: err.message || `Failed to connect ${platform} account`,
        variant: "destructive"
      })
    } finally {
      setConnecting(null)
    }
  }

  const handleDisconnectAccount = async (accountId: string, platform: string) => {
    try {
      console.log(`🔌 Disconnecting ${platform} account...`)
      await disconnectSocialAccount(accountId)
      toast({
        title: "Success",
        description: `${platform} account disconnected successfully`,
      })
      // Refresh the accounts list
      fetchSocialAccounts()
    } catch (err: any) {
      console.error('❌ Error disconnecting account:', err)
      toast({
        title: "Error",
        description: err.message || "Failed to disconnect account",
        variant: "destructive"
      })
    }
  }

  const handleSyncTelegram = async (accountId: string, accountName: string) => {
    try {
      setSyncing(accountId)
      console.log(`🔄 Syncing Telegram subscribers for ${accountName}...`)
      
      const response = await syncTelegramSubscribers(accountId)
      
      toast({
        title: "✅ Telegram Sync Complete",
        description: `${accountName}: ${response.newCount.toLocaleString()} subscribers (${response.difference >= 0 ? '+' : ''}${response.difference.toLocaleString()} change)`,
      })
      
      // Refresh the accounts list to show updated counts
      fetchSocialAccounts()
    } catch (err: any) {
      console.error('❌ Error syncing Telegram subscribers:', err)
      toast({
        title: "Sync Failed",
        description: err.message || "Failed to sync Telegram subscribers",
        variant: "destructive"
      })
    } finally {
      setSyncing(null)
    }
  }

  const totalFollowers = socialAccounts.reduce((sum, account) => sum + (account.followers || 0), 0)
  const connectedPlatforms = socialAccounts.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Welcome back! Here's what's happening with your social media accounts.
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button disabled={connecting !== null}>
              <Plus className="mr-2 h-4 w-4" />
              {connecting ? `Connecting ${connecting}...` : 'Connect New Account'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => handleConnectAccount('facebook')} disabled={connecting !== null}>
              <Facebook className="mr-2 h-4 w-4" />
              Facebook
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleConnectAccount('instagram')} disabled={connecting !== null}>
              <Instagram className="mr-2 h-4 w-4" />
              Instagram
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleConnectAccount('twitter')} disabled={connecting !== null}>
              <Twitter className="mr-2 h-4 w-4" />
              Twitter
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleConnectAccount('linkedin')} disabled={connecting !== null}>
              <Linkedin className="mr-2 h-4 w-4" />
              LinkedIn
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleConnectAccount('youtube')} disabled={connecting !== null}>
              <Youtube className="mr-2 h-4 w-4" />
              YouTube
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleConnectAccount('tiktok')} disabled={connecting !== null}>
              <Video className="mr-2 h-4 w-4" />
              TikTok
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleConnectAccount('pinterest')} disabled={connecting !== null}>
              <Pin className="mr-2 h-4 w-4" />
              Pinterest
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleConnectAccount('discord')} disabled={connecting !== null}>
              <MessageSquare className="mr-2 h-4 w-4" />
              Discord
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleConnectAccount('telegram')} disabled={connecting !== null}>
              <Send className="mr-2 h-4 w-4" />
              Telegram
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleConnectAccount('whatsapp')} disabled={connecting !== null}>
              <MessageSquare className="mr-2 h-4 w-4" />
              WhatsApp
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleConnectAccount('snapchat')} disabled={connecting !== null}>
              <Camera className="mr-2 h-4 w-4" />
              Snapchat
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleConnectAccount('reddit')} disabled={connecting !== null}>
              <Circle className="mr-2 h-4 w-4" />
              Reddit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleConnectAccount('vimeo')} disabled={connecting !== null}>
              <Video className="mr-2 h-4 w-4" />
              Vimeo
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleConnectAccount('threads')} disabled={connecting !== null}>
              <Hash className="mr-2 h-4 w-4" />
              Threads
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleConnectAccount('twitch')} disabled={connecting !== null}>
              <Tv className="mr-2 h-4 w-4" />
              Twitch
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleConnectAccount('line')} disabled={connecting !== null}>
              <MessageSquare className="mr-2 h-4 w-4" />
              Line
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleConnectAccount('tumblr')} disabled={connecting !== null}>
              <Square className="mr-2 h-4 w-4" />
              Tumblr
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleConnectAccount('vk')} disabled={connecting !== null}>
              <Users className="mr-2 h-4 w-4" />
              VK (Vkontakte)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Followers</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
              {totalFollowers.toLocaleString()}
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-400">
              +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
            <Heart className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700 dark:text-green-300">4.2%</div>
            <p className="text-xs text-green-600 dark:text-green-400">
              +0.3% from last week
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Posts This Month</CardTitle>
            <Calendar className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">24</div>
            <p className="text-xs text-purple-600 dark:text-purple-400">
              +4 from last month
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connected Platforms</CardTitle>
            <Share2 className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">
              {connectedPlatforms}
            </div>
            <p className="text-xs text-orange-600 dark:text-orange-400">
              of 18 available platforms
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Connected Accounts Section */}
      <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Connected Accounts
              </CardTitle>
              <CardDescription>
                Manage your connected social media accounts
              </CardDescription>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={connecting !== null}>
                  <Plus className="mr-2 h-4 w-4" />
                  {connecting ? `Connecting ${connecting}...` : 'Connect New Account'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleConnectAccount('facebook')} disabled={connecting !== null}>
                  <Facebook className="mr-2 h-4 w-4" />
                  Facebook
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleConnectAccount('instagram')} disabled={connecting !== null}>
                  <Instagram className="mr-2 h-4 w-4" />
                  Instagram
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleConnectAccount('twitter')} disabled={connecting !== null}>
                  <Twitter className="mr-2 h-4 w-4" />
                  Twitter
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleConnectAccount('linkedin')} disabled={connecting !== null}>
                  <Linkedin className="mr-2 h-4 w-4" />
                  LinkedIn
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleConnectAccount('youtube')} disabled={connecting !== null}>
                  <Youtube className="mr-2 h-4 w-4" />
                  YouTube
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleConnectAccount('tiktok')} disabled={connecting !== null}>
                  <Video className="mr-2 h-4 w-4" />
                  TikTok
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleConnectAccount('pinterest')} disabled={connecting !== null}>
                  <Pin className="mr-2 h-4 w-4" />
                  Pinterest
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleConnectAccount('discord')} disabled={connecting !== null}>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Discord
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleConnectAccount('telegram')} disabled={connecting !== null}>
                  <Send className="mr-2 h-4 w-4" />
                  Telegram
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleConnectAccount('whatsapp')} disabled={connecting !== null}>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  WhatsApp
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleConnectAccount('snapchat')} disabled={connecting !== null}>
                  <Camera className="mr-2 h-4 w-4" />
                  Snapchat
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleConnectAccount('reddit')} disabled={connecting !== null}>
                  <Circle className="mr-2 h-4 w-4" />
                  Reddit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleConnectAccount('vimeo')} disabled={connecting !== null}>
                  <Video className="mr-2 h-4 w-4" />
                  Vimeo
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleConnectAccount('threads')} disabled={connecting !== null}>
                  <Hash className="mr-2 h-4 w-4" />
                  Threads
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleConnectAccount('twitch')} disabled={connecting !== null}>
                  <Tv className="mr-2 h-4 w-4" />
                  Twitch
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleConnectAccount('line')} disabled={connecting !== null}>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Line
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleConnectAccount('tumblr')} disabled={connecting !== null}>
                  <Square className="mr-2 h-4 w-4" />
                  Tumblr
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleConnectAccount('vk')} disabled={connecting !== null}>
                  <Users className="mr-2 h-4 w-4" />
                  VK (Vkontakte)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-8 text-red-600">
              <AlertCircle className="mr-2 h-5 w-5" />
              {error}
            </div>
          ) : socialAccounts.length === 0 ? (
            <div className="text-center py-8">
              <div className="mx-auto w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                <Users className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium mb-2">No Connected Accounts</h3>
              <p className="text-muted-foreground mb-4">
                Connect your social media accounts to start managing your content
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {['Facebook', 'Instagram', 'Twitter', 'LinkedIn', 'YouTube', 'TikTok', 'Pinterest', 'Discord', 'Telegram', 'WhatsApp', 'Snapchat', 'Reddit', 'Vimeo', 'Threads', 'Twitch', 'Line', 'Tumblr', 'VK'].map((platform) => (
                  <Button
                    key={platform}
                    variant="outline"
                    size="sm"
                    onClick={() => handleConnectAccount(platform.toLowerCase())}
                    disabled={connecting !== null}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {connecting === platform.toLowerCase() ? `Connecting...` : platform}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {socialAccounts.map((account) => {
                const IconComponent = platformIcons[account.platform as keyof typeof platformIcons]
                const platformColor = platformColors[account.platform as keyof typeof platformColors]

                return (
                  <div
                    key={account.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="p-2 rounded-full"
                        style={{ backgroundColor: `${platformColor}20` }}
                      >
                        <IconComponent
                          className="h-5 w-5"
                          style={{ color: platformColor }}
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{account.display_name}</p>
                          {account.is_connected ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          @{account.username} • {account.followers?.toLocaleString() || 0} followers
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Last sync: {new Date(account.last_sync || new Date()).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {account.platform === 'telegram' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSyncTelegram(account.id, account.display_name)}
                          disabled={syncing === account.id}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          {syncing === account.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDisconnectAccount(account.id, account.platform)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charts Section */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Weekly Engagement
            </CardTitle>
            <CardDescription>
              Likes, comments, and shares over the past week
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={engagementData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="likes" fill="#3b82f6" />
                <Bar dataKey="comments" fill="#10b981" />
                <Bar dataKey="shares" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Follower Growth
            </CardTitle>
            <CardDescription>
              Your audience growth over the past 6 months
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={followerGrowth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="followers" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}