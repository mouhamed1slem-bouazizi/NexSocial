import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/useToast"
import { getSocialAccounts, disconnectSocialAccount, initiateOAuth, syncTelegramSubscribers, syncLinkedInConnections } from "@/api/socialAccounts"
import { getDashboardAnalytics, type DashboardAnalytics } from "@/api/analytics"
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
  RefreshCw,
  MessageCircle
} from "lucide-react"
import { SocialAccount } from "@/api/socialAccounts"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

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
  reddit: MessageCircle,
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

const platformNames = {
  facebook: "Facebook",
  instagram: "Instagram",
  twitter: "Twitter",
  linkedin: "LinkedIn",
  youtube: "YouTube",
  tiktok: "TikTok",
  pinterest: "Pinterest",
  discord: "Discord",
  telegram: "Telegram",
  whatsapp: "WhatsApp",
  snapchat: "Snapchat",
  reddit: "Reddit",
  vimeo: "Vimeo",
  threads: "Threads",
  twitch: "Twitch",
  line: "Line",
  tumblr: "Tumblr",
  vk: "VK"
}

export function Dashboard() {
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [connecting, setConnecting] = useState<string | null>(null)
  const [syncing, setSyncing] = useState<string | null>(null)
  
  // Analytics data state
  const [analyticsData, setAnalyticsData] = useState<DashboardAnalytics | null>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(true)
  const [analyticsError, setAnalyticsError] = useState<string | null>(null)
  
  // LinkedIn manual sync state
  const [linkedinModalOpen, setLinkedinModalOpen] = useState(false)
  const [linkedinAccount, setLinkedinAccount] = useState<SocialAccount | null>(null)
  const [linkedinConnectionsInput, setLinkedinConnectionsInput] = useState('')
  const { toast } = useToast()

  // Fetch analytics data
  const fetchAnalytics = async () => {
    try {
      setAnalyticsLoading(true)
      setAnalyticsError(null)
      console.log('📊 Fetching dashboard analytics...')
      const data = await getDashboardAnalytics()
      console.log('✅ Analytics data received:', data)
      setAnalyticsData(data)
    } catch (err: any) {
      console.error('❌ Error fetching analytics:', err)
      setAnalyticsError(err.message)
      // Set fallback data if analytics fail
      setAnalyticsData({
        postsStats: { currentMonth: 0, lastMonth: 0, difference: 0, posts: [] },
        engagementData: [],
        platformDistribution: []
      })
    } finally {
      setAnalyticsLoading(false)
    }
  }

  useEffect(() => {
    fetchSocialAccounts()
    fetchAnalytics()
    
    // Check for OAuth callback results
    const urlParams = new URLSearchParams(window.location.search)
    const success = urlParams.get('success')
    const error = urlParams.get('error')
    
    if (success) {
      const platform = success.replace('_connected', '')
      const manualSyncRequired = urlParams.get('manual_sync_required') === 'true'
      
      if (platform === 'linkedin' && manualSyncRequired) {
        toast({
          title: "✅ LinkedIn Connected Successfully",
          description: "Note: You can manually update your connection count using the sync button next to your LinkedIn account.",
          duration: 8000,
        })
      } else {
        toast({
          title: "Success",
          description: `${platform.charAt(0).toUpperCase() + platform.slice(1)} account connected successfully!`
        })
      }
      
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
        case 'vimeo_access_denied':
          errorMessage = "Vimeo access was denied. Please try again."
          break
        case 'vimeo_token_exchange_failed':
          errorMessage = "Failed to exchange Vimeo authorization code. Please try again."
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
          // Create a temporary link and click it to ensure a GET request
          const link = document.createElement('a');
          link.href = response.authUrl;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
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
      
      // Enhanced feedback based on sync results
      if (response.newCount === 0 && response.recommendations) {
        toast({
          title: "⚠️ Sync Complete - Setup Required",
          description: `${response.message}. Check the console for setup recommendations.`,
          variant: "destructive",
          duration: 10000
        })
        
        // Log detailed recommendations to console
        console.log('📋 Telegram Setup Recommendations:', response.recommendations)
        console.log('🔧 Troubleshooting Info:', response.troubleshooting)
        
        // Show detailed alert with recommendations
        alert(`🔧 Telegram Bot Setup Required for ${accountName}

Current Status: ${response.message}

Required Steps:
${response.recommendations.map((rec: string, index: number) => `${index + 1}. ${rec}`).join('\n')}

🔍 Troubleshooting:
- Chat ID: ${response.troubleshooting?.chatId}
- Check server logs for detailed API responses
- Ensure your bot token is correct and active

Next Steps:
${response.troubleshooting?.nextSteps?.map((step: string, index: number) => `${index + 1}. ${step}`).join('\n')}

Visit the bot setup guide for detailed instructions.`)
        
      } else {
        toast({
          title: "✅ Telegram Sync Complete",
          description: `${accountName}: ${response.newCount.toLocaleString()} subscribers (${response.difference >= 0 ? '+' : ''}${response.difference.toLocaleString()} change)`,
          duration: 5000
        })
      }
      
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

  const handleSyncLinkedIn = async (account: SocialAccount) => {
    setLinkedinAccount(account)
    setLinkedinConnectionsInput(account.followers?.toString() || '')
    setLinkedinModalOpen(true)
  }

  const handleLinkedInSubmit = async () => {
    if (!linkedinAccount) return
    
    const connectionsCount = parseInt(linkedinConnectionsInput)
    
    if (isNaN(connectionsCount) || connectionsCount < 0) {
      toast({
        title: "Invalid Input",
        description: "Please enter a valid number of connections (0 or more)",
        variant: "destructive"
      })
      return
    }
    
    try {
      setSyncing(linkedinAccount.id)
      setLinkedinModalOpen(false)
      
      console.log(`🔗 Updating LinkedIn connections for ${linkedinAccount.display_name} to ${connectionsCount}...`)
      
      const response = await syncLinkedInConnections(linkedinAccount.id, connectionsCount)
      
      toast({
        title: "✅ LinkedIn Connections Updated",
        description: `${linkedinAccount.display_name}: ${response.newCount.toLocaleString()} connections (${response.difference >= 0 ? '+' : ''}${response.difference.toLocaleString()} change)`,
        duration: 5000
      })
      
      // Refresh the accounts list to show updated counts
      fetchSocialAccounts()
    } catch (err: any) {
      console.error('❌ Error updating LinkedIn connections:', err)
      toast({
        title: "Update Failed",
        description: err.message || "Failed to update LinkedIn connections",
        variant: "destructive"
      })
    } finally {
      setSyncing(null)
      closeLinkedInModal()
    }
  }

  const closeLinkedInModal = () => {
    setLinkedinModalOpen(false)
    setLinkedinAccount(null)
    setLinkedinConnectionsInput('')
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
            <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
              {analyticsLoading ? '...' : analyticsData?.postsStats.currentMonth || 0}
            </div>
            <p className="text-xs text-purple-600 dark:text-purple-400">
              {analyticsLoading ? 'Loading...' : (
                (analyticsData?.postsStats?.difference || 0) >= 0 
                  ? `+${analyticsData?.postsStats?.difference || 0} from last month`
                  : `${analyticsData?.postsStats?.difference || 0} from last month`
              )}
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
                      <div className="flex items-center gap-2">
                        <div
                          className="p-2 rounded-full"
                          style={{ backgroundColor: `${platformColor}20` }}
                        >
                          <IconComponent
                            className="h-5 w-5"
                            style={{ color: platformColor }}
                          />
                        </div>
                        <Badge 
                          variant="secondary" 
                          className="text-xs font-medium"
                          style={{ backgroundColor: `${platformColor}10`, color: platformColor }}
                        >
                          {platformNames[account.platform as keyof typeof platformNames] || account.platform}
                        </Badge>
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
                      {account.platform === 'linkedin' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSyncLinkedIn(account)}
                          disabled={syncing === account.id}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          title="Update LinkedIn connections count manually"
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
              {analyticsLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <BarChart data={analyticsData?.engagementData || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="likes" fill="#3b82f6" />
                  <Bar dataKey="comments" fill="#10b981" />
                  <Bar dataKey="shares" fill="#f59e0b" />
                </BarChart>
              )}
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              Platform Distribution
            </CardTitle>
            <CardDescription>
              Your posting activity across platforms (last 30 days)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              {analyticsLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : analyticsData?.platformDistribution && analyticsData.platformDistribution.length > 0 ? (
                <PieChart>
                  <Pie
                    data={analyticsData.platformDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {analyticsData.platformDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <Share2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No posting data yet</p>
                    <p className="text-sm">Start posting to see platform distribution</p>
                  </div>
                </div>
              )}
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* LinkedIn Manual Sync Modal */}
      <Dialog open={linkedinModalOpen} onOpenChange={closeLinkedInModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Linkedin className="h-5 w-5 text-blue-600" />
              Update LinkedIn Connections
            </DialogTitle>
            <DialogDescription className="space-y-3">
              <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>ℹ️ LinkedIn API Limitation:</strong> Due to LinkedIn's privacy policies, connection counts cannot be imported automatically. 
                  Please manually enter your current number of LinkedIn connections.
                </p>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  To find your connection count:
                </p>
                <ol className="text-xs text-muted-foreground list-decimal list-inside space-y-1">
                  <li>Go to your LinkedIn profile</li>
                  <li>Look at your connections number (e.g., "400+ connections")</li>
                  <li>Enter that number below</li>
                </ol>
              </div>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="connections-count">Number of LinkedIn Connections</Label>
              <Input
                id="connections-count"
                type="number"
                min="0"
                placeholder="e.g., 400"
                value={linkedinConnectionsInput}
                onChange={(e) => setLinkedinConnectionsInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleLinkedInSubmit()
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                Current: {linkedinAccount?.followers?.toLocaleString() || 0} connections
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={closeLinkedInModal}>
              Cancel
            </Button>
            <Button 
              onClick={handleLinkedInSubmit}
              disabled={!linkedinConnectionsInput || isNaN(parseInt(linkedinConnectionsInput))}
            >
              Update Connections
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}