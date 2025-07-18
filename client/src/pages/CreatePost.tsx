import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createPost } from "@/api/posts"
import { getSocialAccounts, SocialAccount, getDiscordChannels, refreshDiscordChannels, DiscordChannel, DiscordChannelsResponse, refreshDiscordMetadata } from "@/api/socialAccounts"
import { MediaUpload } from "@/components/MediaUpload"
import { EmojiPickerComponent } from "@/components/EmojiPicker"
import { useToast } from "@/hooks/useToast"
import { useNavigate } from "react-router-dom"
import {
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  Youtube,
  Image,
  Video,
  Smile,
  Hash,
  Calendar as CalendarIcon,
  Clock,
  Sparkles,
  Upload,
  X,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Link as LinkIcon,
  Settings,
  Pin,
  MessageCircle,
  Send,
  MessageSquare,
  Camera,
  Circle,
  Tv,
  Square,
  Users
} from "lucide-react"
import { format } from "date-fns"

const platforms = [
  { id: 'facebook', name: 'Facebook', icon: Facebook, color: 'bg-blue-500', limit: 63206 },
  { id: 'messenger', name: 'Messenger', icon: MessageSquare, color: 'bg-blue-600', limit: 20000 },
  { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'bg-pink-500', limit: 2200 },
  { id: 'twitter', name: 'Twitter/X', icon: Twitter, color: 'bg-sky-500', limit: 280 },
  { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, color: 'bg-blue-700', limit: 3000 },
  { id: 'youtube', name: 'YouTube', icon: Youtube, color: 'bg-red-500', limit: 5000 },
  { id: 'tiktok', name: 'TikTok', icon: Video, color: 'bg-black', limit: 2200 },
  { id: 'pinterest', name: 'Pinterest', icon: Pin, color: 'bg-red-600', limit: 500 },
  { id: 'discord', name: 'Discord', icon: MessageCircle, color: 'bg-purple-500', limit: 2000 },
  { id: 'telegram', name: 'Telegram', icon: Send, color: 'bg-blue-400', limit: 4096 },
  { id: 'whatsapp', name: 'WhatsApp', icon: MessageSquare, color: 'bg-green-500', limit: 65536 },
  { id: 'snapchat', name: 'Snapchat', icon: Camera, color: 'bg-yellow-400', limit: 250 },
  { id: 'reddit', name: 'Reddit', icon: Circle, color: 'bg-orange-500', limit: 40000 },
  { id: 'vimeo', name: 'Vimeo', icon: Video, color: 'bg-blue-600', limit: 500 },
  { id: 'threads', name: 'Threads', icon: Hash, color: 'bg-black', limit: 500 },
  { id: 'twitch', name: 'Twitch', icon: Tv, color: 'bg-purple-600', limit: 500 },
  { id: 'line', name: 'Line', icon: MessageSquare, color: 'bg-green-400', limit: 500 },
  { id: 'tumblr', name: 'Tumblr', icon: Square, color: 'bg-blue-900', limit: 4096 },
  { id: 'vk', name: 'VK (Vkontakte)', icon: Users, color: 'bg-blue-500', limit: 15000 }
]

const toneOptions = [
  'Professional',
  'Casual',
  'Promotional',
  'Humorous',
  'Inspirational',
  'Educational',
  'Conversational'
]

export function CreatePost() {
  const [content, setContent] = useState("")
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([])
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([])
  const [accountsLoading, setAccountsLoading] = useState(true)
  // Discord channel selection state
  const [discordChannels, setDiscordChannels] = useState<Record<string, DiscordChannel[]>>({}) // accountId -> channels
  const [selectedDiscordChannels, setSelectedDiscordChannels] = useState<Record<string, string>>({}) // accountId -> channelId
  const [channelsLoading, setChannelsLoading] = useState<Record<string, boolean>>({})
  const [scheduledDate, setScheduledDate] = useState<Date>()
  const [scheduledTime, setScheduledTime] = useState("")
  const [isScheduled, setIsScheduled] = useState(false)
  const [media, setMedia] = useState<{ id: string; type: 'image' | 'video'; url: string; file: File; name: string; size: number }[]>([])
  const [aiPrompt, setAiPrompt] = useState("")
  const [selectedTone, setSelectedTone] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  // Subreddit selection state
  const [userSubreddits, setUserSubreddits] = useState<any[]>([])
  const [selectedSubredditId, setSelectedSubredditId] = useState<string>("default")
  const [subredditsLoading, setSubredditsLoading] = useState(false)
  const { toast } = useToast()
  const navigate = useNavigate()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // LocalStorage keys
  const SELECTED_ACCOUNTS_KEY = 'nexsocial_selected_accounts'
  const SELECTED_PLATFORMS_KEY = 'nexsocial_selected_platforms'
  const DISCORD_CHANNELS_KEY = 'nexsocial_discord_channels'

  // Save selected accounts to localStorage
  const saveSelectedAccounts = (accounts: string[], platforms: string[]) => {
    try {
      localStorage.setItem(SELECTED_ACCOUNTS_KEY, JSON.stringify(accounts))
      localStorage.setItem(SELECTED_PLATFORMS_KEY, JSON.stringify(platforms))
    } catch (error) {
      console.warn('Failed to save selected accounts to localStorage:', error)
    }
  }

  // Load user's subreddits for Reddit posting
  const loadUserSubreddits = async () => {
    try {
      setSubredditsLoading(true)
      const token = localStorage.getItem('accessToken')
      if (!token) return

      const response = await fetch('/api/subreddits?verified=true', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setUserSubreddits(data.subreddits || [])
      }
    } catch (error) {
      console.error('Error loading subreddits:', error)
    } finally {
      setSubredditsLoading(false)
    }
  }

  // Load selected accounts from localStorage
  const loadSelectedAccounts = (): { accounts: string[], platforms: string[] } => {
    try {
      const savedAccounts = localStorage.getItem(SELECTED_ACCOUNTS_KEY)
      const savedPlatforms = localStorage.getItem(SELECTED_PLATFORMS_KEY)
      
      return {
        accounts: savedAccounts ? JSON.parse(savedAccounts) : [],
        platforms: savedPlatforms ? JSON.parse(savedPlatforms) : []
      }
    } catch (error) {
      console.warn('Failed to load selected accounts from localStorage:', error)
      return { accounts: [], platforms: [] }
    }
  }

  // Save Discord channel selections to localStorage
  const saveDiscordChannelSelections = (selections: Record<string, string>) => {
    try {
      localStorage.setItem(DISCORD_CHANNELS_KEY, JSON.stringify(selections))
    } catch (error) {
      console.warn('Failed to save Discord channel selections to localStorage:', error)
    }
  }

  // Load Discord channel selections from localStorage
  const loadDiscordChannelSelections = (): Record<string, string> => {
    try {
      const saved = localStorage.getItem(DISCORD_CHANNELS_KEY)
      return saved ? JSON.parse(saved) : {}
    } catch (error) {
      console.warn('Failed to load Discord channel selections from localStorage:', error)
      return {}
    }
  }

  // Handle emoji insertion
  const handleEmojiSelect = (emoji: string) => {
    const textarea = textareaRef.current
    if (!textarea) {
      setContent(prev => prev + emoji)
      return
    }

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const newContent = content.slice(0, start) + emoji + content.slice(end)
    
    setContent(newContent)
    
    // Restore cursor position after emoji
    setTimeout(() => {
      const newPosition = start + emoji.length
      textarea.setSelectionRange(newPosition, newPosition)
      textarea.focus()
    }, 0)
  }

  // Refresh Discord metadata for an account
  const refreshDiscordData = async (accountId: string) => {
    try {
      setChannelsLoading(prev => ({ ...prev, [accountId]: true }))
      console.log(`🔄 Refreshing Discord metadata for account: ${accountId}`)
      
      const refreshResult = await refreshDiscordMetadata(accountId)
      
      toast({
        title: "Discord Connection Fixed!",
        description: `Found ${refreshResult.guildsFound} servers. Primary: ${refreshResult.primaryGuild || 'None'}`,
      })
      
      // Now try to fetch channels again
      await fetchDiscordChannels(accountId, false, false)
      
    } catch (error: any) {
      console.error('❌ Error refreshing Discord metadata:', error)
      toast({
        title: "Discord Refresh Failed",
        description: error.message || "Failed to refresh Discord connection. Try reconnecting your account.",
        variant: "destructive"
      })
    } finally {
      setChannelsLoading(prev => ({ ...prev, [accountId]: false }))
    }
  }

  // Fetch Discord channels for a specific account
  const fetchDiscordChannels = async (accountId: string, forceRefresh: boolean = false, silent: boolean = false) => {
    try {
      setChannelsLoading(prev => ({ ...prev, [accountId]: true }))
      console.log(`🎮 Fetching Discord channels for account: ${accountId}${forceRefresh ? ' (force refresh)' : ''}${silent ? ' (silent)' : ''}`)
      
      const channelsData = await getDiscordChannels(accountId, forceRefresh)
      
      setDiscordChannels(prev => ({
        ...prev,
        [accountId]: channelsData.channels
      }))
      
      // Auto-select saved channel or first channel if none is selected
      if (!selectedDiscordChannels[accountId] && channelsData.channels.length > 0) {
        const newSelection = {
          ...selectedDiscordChannels,
          [accountId]: channelsData.channels[0].id
        }
        setSelectedDiscordChannels(newSelection)
        // Save the selection
        saveDiscordChannelSelections(newSelection)
      }
      
      const cacheStatus = channelsData.cached ? '(cached)' : '(fresh from Discord API)'
      console.log(`✅ Loaded ${channelsData.channels.length} channels for ${channelsData.guildName} ${cacheStatus}`)
      
      // Only show toast notifications if not silent
      if (!silent) {
        if (channelsData.cached && channelsData.cachedAt) {
          const cacheAge = Math.round((Date.now() - new Date(channelsData.cachedAt).getTime()) / (1000 * 60))
          toast({
            title: "Discord Channels Loaded",
            description: `Loaded ${channelsData.channels.length} cached channels (${cacheAge}m old)`,
          })
        } else if (channelsData.freshlyFetched) {
          toast({
            title: "Discord Channels Refreshed",
            description: `Loaded ${channelsData.channels.length} fresh channels from Discord`,
          })
        }
      }
      
    } catch (error: any) {
      console.error('❌ Error fetching Discord channels:', error)
      
      // Only show error toasts if not silent
      if (!silent) {
        // Check if this is a bot permission error with invite URL
        if (error.message.includes('bot needs to be invited') && error.response?.data?.botInviteUrl) {
          toast({
            title: "Discord Bot Needs Permissions",
            description: (
              <div className="space-y-2">
                <p>The bot needs to be invited to your Discord server with proper permissions.</p>
                <button 
                  onClick={() => window.open(error.response.data.botInviteUrl, '_blank')}
                  className="text-blue-600 underline hover:text-blue-800"
                >
                  Click here to invite the bot
                </button>
              </div>
            ),
            variant: "destructive"
          })
        } else {
          toast({
            title: "Discord Channels Error",
            description: error.message || "Failed to load Discord channels",
            variant: "destructive"
          })
        }
      }
    } finally {
      setChannelsLoading(prev => ({ ...prev, [accountId]: false }))
    }
  }

  // Force refresh Discord channels for a specific account
  const forceRefreshDiscordChannels = async (accountId: string) => {
    try {
      setChannelsLoading(prev => ({ ...prev, [accountId]: true }))
      console.log(`🔄 Force refreshing Discord channels for account: ${accountId}`)
      
      await fetchDiscordChannels(accountId, true)
      
    } catch (error: any) {
      console.error('❌ Error force refreshing Discord channels:', error)
      toast({
        title: "Discord Refresh Failed",
        description: error.message || "Failed to refresh Discord channels",
        variant: "destructive"
      })
    }
  }

  // Fetch social accounts on component mount
  useEffect(() => {
    const fetchSocialAccounts = async () => {
      try {
        setAccountsLoading(true)
        console.log('📊 Fetching social accounts for Create Post...')
        const response = await getSocialAccounts()
        console.log('✅ Social accounts response:', response)
        setSocialAccounts(response || [])
        
        // Load user's subreddits for Reddit posting
        await loadUserSubreddits()
        
        // Load saved Discord channel selections
        const savedChannelSelections = loadDiscordChannelSelections()
        setSelectedDiscordChannels(savedChannelSelections)
        console.log('🎮 Restored Discord channel selections:', Object.keys(savedChannelSelections).length)
        
        // Load previously selected accounts from localStorage
        const { accounts: savedAccounts, platforms: savedPlatforms } = loadSelectedAccounts()
        
        if (savedAccounts.length > 0) {
          // Filter out accounts that are no longer connected or don't exist
          const availableAccounts = response?.filter((acc: SocialAccount) => acc.is_connected) || []
          const validSavedAccounts = savedAccounts.filter(accountId => 
            availableAccounts.some(acc => acc.id === accountId)
          )
          
          if (validSavedAccounts.length > 0) {
            setSelectedAccounts(validSavedAccounts)
            // Update platforms based on valid accounts
            const validPlatforms = availableAccounts
              .filter(acc => validSavedAccounts.includes(acc.id))
              .map(acc => acc.platform)
            setSelectedPlatforms(validPlatforms)
            console.log('🔄 Restored saved account selection:', validSavedAccounts.length, 'accounts')
          } else {
            // If no valid saved accounts, auto-select all connected accounts (first-time user)
            const connectedAccounts = availableAccounts || []
            setSelectedAccounts(connectedAccounts.map((acc: SocialAccount) => acc.id))
            setSelectedPlatforms(connectedAccounts.map((acc: SocialAccount) => acc.platform))
            console.log('🎯 Auto-selected all connected accounts:', connectedAccounts.length)
          }
        } else {
          // If no saved selection, auto-select all connected accounts (first-time user)
        const connectedAccounts = response?.filter((acc: SocialAccount) => acc.is_connected) || []
        setSelectedAccounts(connectedAccounts.map((acc: SocialAccount) => acc.id))
        setSelectedPlatforms(connectedAccounts.map((acc: SocialAccount) => acc.platform))
          console.log('🎯 Auto-selected all connected accounts:', connectedAccounts.length)
        }

        // Auto-load Discord channels for all connected Discord accounts
        const discordAccounts = response?.filter((acc: SocialAccount) => 
          acc.platform === 'discord' && acc.is_connected
        ) || []
        
        if (discordAccounts.length > 0) {
          console.log(`🎮 Auto-loading channels for ${discordAccounts.length} Discord accounts...`)
          // Load channels silently for all Discord accounts
          discordAccounts.forEach(account => {
            fetchDiscordChannels(account.id, false, true) // silent = true
          })
        }

      } catch (error: any) {
        console.error('Error fetching social accounts:', error)
        toast({
          title: "Error",
          description: "Failed to load social accounts",
          variant: "destructive"
        })
      } finally {
        setAccountsLoading(false)
      }
    }

    fetchSocialAccounts()
  }, [toast])

  const handleAccountToggle = (accountId: string, platform: string) => {
    setSelectedAccounts(prev => {
      const newSelection = prev.includes(accountId)
        ? prev.filter(id => id !== accountId)
        : [...prev, accountId]
      
      // If Discord account is being selected and channels aren't loaded yet, fetch them
      if (platform === 'discord' && newSelection.includes(accountId) && !discordChannels[accountId]) {
        fetchDiscordChannels(accountId, false, false) // Not silent when user manually selects
      }
      
      // Update selected platforms based on selected accounts
      const accountsAfterToggle = socialAccounts.filter(acc => 
        newSelection.includes(acc.id)
      )
      const newPlatforms = accountsAfterToggle.map(acc => acc.platform)
      setSelectedPlatforms(newPlatforms)
      
      // Save to localStorage
      saveSelectedAccounts(newSelection, newPlatforms)
      
      return newSelection
    })
  }

  const handlePlatformToggle = (platformId: string) => {
    // Get all accounts for this platform
    const platformAccounts = socialAccounts.filter(acc => acc.platform === platformId)
    const connectedAccounts = platformAccounts.filter(acc => acc.is_connected)
    
    if (connectedAccounts.length === 0) {
      toast({
        title: "No Connected Account",
        description: `Please connect a ${platformId} account first`,
        variant: "destructive"
      })
      return
    }
    
    // Toggle all connected accounts for this platform
    const platformAccountIds = connectedAccounts.map(acc => acc.id)
    const allSelected = platformAccountIds.every(id => selectedAccounts.includes(id))
    
    let newSelectedAccounts: string[]
    let newSelectedPlatforms: string[]
    
    if (allSelected) {
      // Remove all platform accounts
      newSelectedAccounts = selectedAccounts.filter(id => !platformAccountIds.includes(id))
      newSelectedPlatforms = selectedPlatforms.filter(p => p !== platformId)
    } else {
      // Add all platform accounts
      newSelectedAccounts = [...new Set([...selectedAccounts, ...platformAccountIds])]
      newSelectedPlatforms = [...new Set([...selectedPlatforms, platformId])]
    }
    
    setSelectedAccounts(newSelectedAccounts)
    setSelectedPlatforms(newSelectedPlatforms)
    
    // Save to localStorage
    saveSelectedAccounts(newSelectedAccounts, newSelectedPlatforms)
  }

  const getCharacterLimit = () => {
    if (selectedPlatforms.length === 0) return 280
    return Math.min(...selectedPlatforms.map(id =>
      platforms.find(p => p.id === id)?.limit || 280
    ))
  }

  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) {
      toast({
        title: "Error",
        description: "Please enter a prompt for AI content generation",
        variant: "destructive"
      })
      return
    }

    setAiLoading(true)
    try {
      // Import the generateAIContent function
      const { generateAIContent } = await import('../api/posts')
      
      // Get selected platforms for better content optimization
      const selectedPlatformNames = selectedAccounts
        .map(accountId => {
          const account = socialAccounts.find(acc => acc.id === accountId)
          return account?.platform
        })
        .filter((platform): platform is NonNullable<typeof platform> => Boolean(platform))
      
      const uniquePlatforms = [...new Set(selectedPlatformNames)]
      
      // Generate AI content
      const response = await generateAIContent({
        prompt: aiPrompt.trim(),
        tone: selectedTone ? selectedTone.toLowerCase() : 'professional',
        platforms: uniquePlatforms
      })

      if (response.success) {
        setContent(response.content || "")
        toast({
          title: "Success",
          description: "AI content generated successfully!",
        })
      } else {
        throw new Error('Failed to generate AI content')
      }
    } catch (error: any) {
      console.error('AI generation error:', error)
      
      // Handle specific error types
      if (error.message.includes('API key')) {
        toast({
          title: "Configuration Error",
          description: "OpenAI API key is not configured. Please contact your administrator.",
          variant: "destructive"
        })
      } else if (error.message.includes('rate limit')) {
        toast({
          title: "Rate Limit",
          description: "AI service is temporarily busy. Please try again in a few minutes.",
          variant: "destructive"
        })
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to generate AI content. Please try again.",
          variant: "destructive"
        })
      }
    } finally {
      setAiLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast({
        title: "Error",
        description: "Please enter post content",
        variant: "destructive"
      })
      return
    }

    if (selectedAccounts.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one social media account",
        variant: "destructive"
      })
      return
    }

    // Check Instagram media requirement
    const instagramAccounts = selectedAccounts.filter(accountId => {
      const account = socialAccounts.find(acc => acc.id === accountId)
      return account?.platform === 'instagram'
    })

    if (instagramAccounts.length > 0 && media.length === 0) {
      toast({
        title: "Instagram Media Required",
        description: "Instagram posts require at least one image or video. Please add media or deselect Instagram accounts.",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      const scheduledAt = isScheduled && scheduledDate && scheduledTime
        ? new Date(`${format(scheduledDate, 'yyyy-MM-dd')}T${scheduledTime}:00`)
        : undefined

      // Convert media files to base64 for server upload
      const mediaData = await Promise.all(
        media.map(async (item) => {
          return new Promise<{name: string, type: string, data: string}>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => {
              const base64 = reader.result as string
              resolve({
                name: item.name,
                type: item.type,
                data: base64 // This includes the data:image/jpeg;base64, prefix
              })
            }
            reader.onerror = reject
            reader.readAsDataURL(item.file)
          })
        })
      )

      const response = await createPost({
        content,
        platforms: selectedPlatforms,
        selectedAccounts,
        scheduledAt: scheduledAt?.toISOString(),
        media: mediaData,
        discordChannels: selectedDiscordChannels, // Add Discord channel selections
        subredditSettings: selectedSubredditId && selectedSubredditId !== "default" ? { selectedSubredditId } : undefined // Add subreddit selection
      })

      if (response.success) {
        const successCount = Object.values(response.results || {}).filter(r => r.success).length
        const totalCount = Object.keys(response.results || {}).length
        
        // Check for platform-specific issues in results
        const failedResults = Object.values(response.results || {}).filter(r => !r.success)
        const twitterTokenIssues = failedResults.filter(r => 
          r.platform === 'twitter' && (r.requiresTokenRefresh || r.requiresReconnect)
        )
        const redditAuthIssues = failedResults.filter(r => 
          r.platform === 'reddit' && (
            r.error?.includes('authentication expired') || 
            r.error?.includes('Authentication Required') ||
            r.error?.includes('Authentication Issue') ||
            r.error?.includes('disconnect and reconnect')
          )
        )
        
        // Show success notification
        toast({
          title: "🎉 Post Published Successfully!",
          description: isScheduled 
            ? `Post scheduled successfully! You can continue creating more posts.` 
            : `Post published to ${successCount} of ${totalCount} accounts! Your account selection has been saved for next time.`,
        })

        // Show additional notification for Reddit authentication issues
        if (redditAuthIssues.length > 0) {
          toast({
            title: "🔧 Reddit Authentication Required",
            description: "Your Reddit account connection has expired. Go to Settings → Social Accounts → Disconnect and reconnect your Reddit account.",
            variant: "destructive",
            duration: 10000
          })
          return
        }

        // Show additional notification for Twitter token issues
        if (twitterTokenIssues.length > 0) {
          const issue = twitterTokenIssues[0]
          toast({
            title: "🔄 Twitter Authentication Issue",
            description: issue.requiresTokenRefresh 
              ? "Twitter token needs refresh. Go to Settings → Social Accounts to refresh your Twitter connection."
              : "Twitter token expired. Please reconnect your Twitter account in Settings → Social Accounts.",
            variant: "destructive"
          })
          return
        }



        // Clear only content and media, keep account selections
        setContent("")
        setMedia([])
        setAiPrompt("")
        setScheduledDate(undefined)
        setScheduledTime("")
        setIsScheduled(false)
        
        // Don't navigate away - stay on the create post page!
        console.log('✅ Post successful - staying on create page with saved account selection')
      } else {
        // Handle complete failure
        const results = response.results || {}
        const allFailed = Object.values(results).every(r => !r.success)
        
        if (allFailed) {
          // Check for Reddit authentication issues first
          const redditAuthIssues = Object.values(results).filter(r => 
            r.platform === 'reddit' && (
              r.error?.includes('authentication expired') || 
              r.error?.includes('Authentication Required') ||
              r.error?.includes('Authentication Issue') ||
              r.error?.includes('disconnect and reconnect')
            )
          )
          
          if (redditAuthIssues.length > 0) {
            toast({
              title: "🔧 Reddit Authentication Required",
              description: "Your Reddit account connection has expired. Go to Settings → Social Accounts → Disconnect and reconnect your Reddit account.",
              variant: "destructive",
              duration: 10000, // Show for 10 seconds
              action: {
                altText: "Go to Settings",
                onClick: () => navigate('/settings')
              }
            })
            return
          }
          
          // Check for Twitter token issues
          const twitterTokenIssues = Object.values(results).filter(r => 
            r.platform === 'twitter' && (r.requiresTokenRefresh || r.requiresReconnect)
          )
          
          if (twitterTokenIssues.length > 0) {
            const issue = twitterTokenIssues[0]
            toast({
              title: "🔄 Twitter Authentication Issue",
              description: issue.requiresTokenRefresh 
                ? "Twitter token needs refresh. Go to Settings → Social Accounts to refresh your Twitter connection."
                : "Twitter token expired. Please reconnect your Twitter account in Settings → Social Accounts.",
              variant: "destructive"
            })
            return
          }
        }
        
        throw new Error(response.message || 'Failed to create post')
      }
    } catch (error: any) {
      // Check if this is a Reddit authentication error
      if (error.message && (
        error.message.includes('authentication expired') || 
        error.message.includes('Authentication Required') ||
        error.message.includes('Authentication Issue') ||
        error.message.includes('disconnect and reconnect')
      )) {
        toast({
          title: "🔧 Reddit Authentication Required",
          description: "Your Reddit account connection has expired. Go to Settings → Social Accounts → Disconnect and reconnect your Reddit account.",
          variant: "destructive",
          duration: 10000, // Show for 10 seconds
          action: {
            altText: "Go to Settings",
            onClick: () => navigate('/settings')
          }
        })
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to create post",
          variant: "destructive"
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const characterLimit = getCharacterLimit()
  const remainingChars = characterLimit - content.length

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Create New Post
          </h1>
          <p className="text-muted-foreground mt-1">
            Create engaging content for your social media platforms
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/')}>
          Cancel
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="manual" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="manual">Manual Creation</TabsTrigger>
              <TabsTrigger value="ai">AI Assistant</TabsTrigger>
            </TabsList>

            <TabsContent value="manual" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smile className="h-5 w-5" />
                    Post Content
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Textarea
                      ref={textareaRef}
                      placeholder="What's on your mind? Share your thoughts, updates, or stories..."
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="min-h-[150px] resize-none"
                    />
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Hash className="h-4 w-4" />
                        <span>Use hashtags to increase reach</span>
                      </div>
                      <div className={`text-sm ${remainingChars < 0 ? 'text-red-500' : remainingChars < 50 ? 'text-orange-500' : 'text-muted-foreground'}`}>
                        {remainingChars} characters remaining
                      </div>
                    </div>
                  </div>

                  {/* Media Upload */}
                  <MediaUpload 
                    media={media} 
                    onMediaChange={setMedia}
                    maxFiles={4}
                    maxFileSize={50}
                  />

                  {/* Media Upload Status Info */}
                  {media.length > 0 && (
                    <Card className="border-blue-100 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
                      <CardContent className="p-3">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <div className="text-sm text-blue-800 dark:text-blue-200">
                            <p className="font-medium mb-1">Media Upload Status by Platform:</p>
                            <ul className="text-xs space-y-1">
                              <li>• <strong>Twitter:</strong> Media referenced in text (full upload needs OAuth 1.0a)</li>
                              <li>• <strong>Facebook/LinkedIn:</strong> Text posted with media note</li>
                              <li>• <strong>Instagram:</strong> Media upload in development</li>
                            </ul>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Emoji Picker and Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-4 items-end">
                    <div className="flex-1">
                      <Label className="text-sm font-medium mb-2 block">Add Emojis</Label>
                      <EmojiPickerComponent 
                        onEmojiSelect={handleEmojiSelect}
                        disabled={loading}
                      />
                    </div>
                    <div className="flex flex-col gap-2 sm:w-48">
                      <Button
                        onClick={handleSubmit}
                        disabled={loading || !content.trim() || selectedAccounts.length === 0}
                        className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                      >
                        {loading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            {isScheduled ? 'Scheduling...' : 'Publishing...'}
                          </>
                        ) : (
                          <>
                            {isScheduled ? 'Schedule Post' : 'Publish Now'}
                          </>
                        )}
                      </Button>
                      <Button variant="outline" className="w-full">
                        Save as Draft
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ai" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    AI Content Generator
                  </CardTitle>
                  <CardDescription>
                    Let AI help you create engaging content based on your ideas
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="ai-prompt">What would you like to post about?</Label>
                    <Textarea
                      id="ai-prompt"
                      placeholder="e.g., Our new product launch, team achievement, industry insights..."
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="tone">Tone of Voice</Label>
                    <Select value={selectedTone} onValueChange={setSelectedTone}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select tone" />
                      </SelectTrigger>
                      <SelectContent>
                        {toneOptions.map((tone) => (
                          <SelectItem key={tone} value={tone.toLowerCase()}>
                            {tone}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    onClick={handleAIGenerate}
                    disabled={aiLoading || !aiPrompt.trim()}
                    className="w-full"
                  >
                    {aiLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate Content
                      </>
                    )}
                  </Button>

                  {content && (
                    <div className="mt-4 space-y-4">
                      <Label>Generated Content (Edit as needed)</Label>
                      <Textarea
                        ref={textareaRef}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="mt-2 min-h-[150px]"
                      />
                      
                      {/* Media Upload for AI tab */}
                      <MediaUpload 
                        media={media} 
                        onMediaChange={setMedia}
                        maxFiles={4}
                        maxFileSize={50}
                      />

                      {/* Media Upload Status Info for AI tab */}
                      {media.length > 0 && (
                        <Card className="border-blue-100 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
                          <CardContent className="p-3">
                            <div className="flex items-start gap-2">
                              <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                              <div className="text-sm text-blue-800 dark:text-blue-200">
                                <p className="font-medium mb-1">Media Upload Status by Platform:</p>
                                <ul className="text-xs space-y-1">
                                  <li>• <strong>Twitter:</strong> Media referenced in text (full upload needs OAuth 1.0a)</li>
                                  <li>• <strong>Facebook/LinkedIn:</strong> Text posted with media note</li>
                                  <li>• <strong>Instagram:</strong> Media upload in development</li>
                                </ul>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Emoji Picker and Action Buttons for AI tab */}
                      <div className="flex flex-col sm:flex-row gap-4 items-end">
                        <div className="flex-1">
                          <Label className="text-sm font-medium mb-2 block">Add Emojis</Label>
                          <EmojiPickerComponent 
                            onEmojiSelect={handleEmojiSelect}
                            disabled={loading}
                          />
                        </div>
                        <div className="flex flex-col gap-2 sm:w-48">
                          <Button
                            onClick={handleSubmit}
                            disabled={loading || !content.trim() || selectedAccounts.length === 0}
                            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                          >
                            {loading ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                {isScheduled ? 'Scheduling...' : 'Publishing...'}
                              </>
                            ) : (
                              <>
                                {isScheduled ? 'Schedule Post' : 'Publish Now'}
                              </>
                            )}
                          </Button>
                          <Button variant="outline" className="w-full">
                            Save as Draft
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Preview */}
          {(content || media.length > 0) && selectedAccounts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Preview</CardTitle>
                <CardDescription>
                  How your post will appear
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {selectedAccounts.slice(0, 3).map((accountId) => {
                    const account = socialAccounts.find(acc => acc.id === accountId)
                    if (!account) return null
                    const platform = platforms.find(p => p.id === account.platform)
                    if (!platform) return null
                    const IconComponent = platform.icon

                    return (
                      <div key={accountId} className="border rounded-lg p-3 bg-slate-50 dark:bg-slate-800">
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`p-1 rounded ${platform.color}`}>
                            <IconComponent className="h-3 w-3 text-white" />
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-medium">{platform.name}</span>
                            <span className="text-xs text-muted-foreground">• @{account.username}</span>
                          </div>
                        </div>
                        
                        {/* Media preview */}
                        {media.length > 0 && (
                          <div className="mb-2">
                            <div className="grid grid-cols-2 gap-1 mb-2">
                              {media.slice(0, 4).map((item) => (
                                <div key={item.id} className="aspect-square bg-muted rounded overflow-hidden">
                                  {item.type === 'image' ? (
                                    <img
                                      src={item.url}
                                      alt={item.name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-muted">
                                      <Video className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                            {media.length > 4 && (
                              <p className="text-xs text-muted-foreground">+{media.length - 4} more</p>
                            )}
                          </div>
                        )}

                        {/* Content preview */}
                        {content && (
                          <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-3">
                            {content.slice(0, platform.limit)}
                            {content.length > platform.limit && '...'}
                          </p>
                        )}

                        {/* Platform-specific notes */}
                        {account.platform === 'instagram' && media.length === 0 && (
                          <p className="text-xs text-orange-500 mt-1">Instagram requires at least one image or video</p>
                        )}
                        {account.platform === 'twitter' && media.length > 0 && (
                          <p className="text-xs text-blue-500 mt-1">
                            📷 Media will be referenced in tweet text (direct upload requires OAuth 1.0a setup)
                          </p>
                        )}
                      </div>
                    )
                  })}
                  {selectedAccounts.length > 3 && (
                    <div className="text-center text-xs text-muted-foreground">
                      +{selectedAccounts.length - 3} more account{selectedAccounts.length - 3 > 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Scheduling */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Publishing Options
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="schedule"
                  checked={isScheduled}
                  onCheckedChange={(checked) => setIsScheduled(checked === true)}
                />
                <Label htmlFor="schedule">Schedule for later</Label>
              </div>

              {isScheduled && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal mt-2"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {scheduledDate ? format(scheduledDate, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={scheduledDate}
                          onSelect={setScheduledDate}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label htmlFor="time">Time</Label>
                    <Input
                      id="time"
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="mt-2"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Platform Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Connected Accounts</CardTitle>
              <CardDescription>
                Choose which accounts to publish to
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {accountsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : socialAccounts.length === 0 ? (
                <div className="text-center py-4">
                  <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-2">No social accounts connected</p>
                  <Button variant="outline" size="sm" onClick={() => navigate('/')}>
                    <LinkIcon className="h-4 w-4 mr-2" />
                    Connect Accounts
                  </Button>
                </div>
              ) : (
                <>
                  {/* Group accounts by platform */}
                  {platforms.map((platform) => {
                    const platformAccounts = socialAccounts.filter(acc => acc.platform === platform.id)
                    if (platformAccounts.length === 0) return null

                    const IconComponent = platform.icon
                    const connectedAccounts = platformAccounts.filter(acc => acc.is_connected)
                    const isAnySelected = connectedAccounts.some(acc => selectedAccounts.includes(acc.id))
                    const isAllSelected = connectedAccounts.length > 0 && connectedAccounts.every(acc => selectedAccounts.includes(acc.id))

                    return (
                      <div key={platform.id} className="space-y-2">
                        {/* Platform header */}
                        <div
                          className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-all ${
                            isAnySelected
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                              : connectedAccounts.length > 0
                              ? 'border-gray-200 hover:border-gray-300'
                              : 'border-gray-100 bg-gray-50 dark:bg-gray-800'
                          } ${connectedAccounts.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                          onClick={() => connectedAccounts.length > 0 && handlePlatformToggle(platform.id)}
                        >
                          <Checkbox
                            checked={isAllSelected}
                            onCheckedChange={() => connectedAccounts.length > 0 && handlePlatformToggle(platform.id)}
                            disabled={connectedAccounts.length === 0}
                          />
                          <div className={`p-2 rounded ${platform.color}`}>
                            <IconComponent className="h-4 w-4 text-white" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{platform.name}</p>
                              {connectedAccounts.length === 0 ? (
                                <Badge variant="secondary" className="text-xs">Not Connected</Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs">
                                  {connectedAccounts.length} account{connectedAccounts.length > 1 ? 's' : ''}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {platform.limit.toLocaleString()} char limit
                            </p>
                          </div>
                        </div>

                        {/* Individual accounts */}
                        {connectedAccounts.map((account) => {
                          const isSelected = selectedAccounts.includes(account.id)
                          return (
                            <div key={account.id} className="space-y-2">
                            <div
                              className={`ml-6 flex items-center space-x-3 p-2 rounded-lg border cursor-pointer transition-all ${
                                isSelected
                                  ? 'border-blue-400 bg-blue-25 dark:bg-blue-950/50'
                                  : 'border-gray-100 hover:border-gray-200'
                              }`}
                              onClick={() => handleAccountToggle(account.id, account.platform)}
                            >
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => handleAccountToggle(account.id, account.platform)}
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium">{account.display_name}</p>
                                  <CheckCircle className="h-3 w-3 text-green-500" />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  @{account.username} • {account.followers?.toLocaleString() || 0} followers
                                </p>
                              </div>
                              </div>

                              {/* Discord Channel Selector */}
                              {account.platform === 'discord' && isSelected && (
                                <div className="ml-12 p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
                                  <Label className="text-sm font-medium text-purple-700 dark:text-purple-300 mb-2 block">
                                    Select Discord Channel
                                  </Label>
                                  {channelsLoading[account.id] ? (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                                      Loading channels...
                                    </div>
                                  ) : discordChannels[account.id]?.length > 0 ? (
                                    <div className="space-y-2">
                                      <div className="flex gap-2">
                                        <Select
                                          value={selectedDiscordChannels[account.id] || ''}
                                          onValueChange={(channelId) => {
                                            const newSelection = {
                                              ...selectedDiscordChannels,
                                              [account.id]: channelId
                                            }
                                            setSelectedDiscordChannels(newSelection)
                                            // Save the selection to localStorage
                                            saveDiscordChannelSelections(newSelection)
                                          }}
                                        >
                                          <SelectTrigger className="flex-1 bg-white dark:bg-slate-900">
                                            <SelectValue placeholder="Choose a channel..." />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {discordChannels[account.id].map((channel) => (
                                              <SelectItem key={channel.id} value={channel.id}>
                                                <div className="flex items-center gap-2">
                                                  <Hash className="h-3 w-3 text-muted-foreground" />
                                                  <span>{channel.name}</span>
                                                  {channel.topic && (
                                                    <span className="text-xs text-muted-foreground">
                                                      - {channel.topic.substring(0, 30)}{channel.topic.length > 30 ? '...' : ''}
                                                    </span>
                                                  )}
                                                </div>
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => forceRefreshDiscordChannels(account.id)}
                                          disabled={channelsLoading[account.id]}
                                          className="px-3 border-purple-200 text-purple-600 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-400 dark:hover:bg-purple-950"
                                          title="Refresh channels from Discord"
                                        >
                                          {channelsLoading[account.id] ? (
                                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-purple-600"></div>
                                          ) : (
                                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                            </svg>
                                          )}
                                        </Button>
                                      </div>
                                      <p className="text-xs text-muted-foreground">
                                        {discordChannels[account.id].length} channels available
                                      </p>
                                    </div>
                                  ) : (
                                    <div className="text-sm space-y-2">
                                      <p className="text-muted-foreground">
                                        No channels available. Discord connection needs to be fixed.
                                      </p>
                                      <div className="flex gap-2">
                                        <button 
                                          onClick={() => refreshDiscordData(account.id)}
                                          className="bg-purple-600 text-white px-3 py-1 rounded text-xs hover:bg-purple-700 disabled:opacity-50"
                                          disabled={channelsLoading[account.id]}
                                        >
                                          {channelsLoading[account.id] ? 'Fixing...' : 'Fix Discord Connection'}
                                        </button>
                                        <button 
                                          onClick={() => fetchDiscordChannels(account.id, false, false)}
                                          className="text-blue-600 underline hover:text-blue-800 text-xs"
                                        >
                                          Retry
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Reddit Subreddit Selector */}
                              {account.platform === 'reddit' && isSelected && (
                                <div className="ml-12 p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-200 dark:border-orange-800">
                                  <Label className="text-sm font-medium text-orange-700 dark:text-orange-300 mb-2 block">
                                    Select Subreddit (Optional)
                                  </Label>
                                  {subredditsLoading ? (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600"></div>
                                      Loading subreddits...
                                    </div>
                                  ) : userSubreddits.length > 0 ? (
                                    <div className="space-y-2">
                                      <Select
                                        value={selectedSubredditId}
                                        onValueChange={setSelectedSubredditId}
                                      >
                                        <SelectTrigger className="w-full">
                                          <SelectValue placeholder="Use default subreddit or select one..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="default">Use default subreddit</SelectItem>
                                          {userSubreddits
                                            .filter(sub => sub.is_verified)
                                            .sort((a, b) => {
                                              // Sort by favorite first, then by subscriber count
                                              if (a.is_favorite && !b.is_favorite) return -1
                                              if (!a.is_favorite && b.is_favorite) return 1
                                              return b.subscriber_count - a.subscriber_count
                                            })
                                            .map((subreddit) => (
                                              <SelectItem key={subreddit.id} value={subreddit.id}>
                                                <div className="flex items-center gap-2">
                                                  r/{subreddit.subreddit_name}
                                                  {subreddit.is_favorite && (
                                                    <span className="text-yellow-500">⭐</span>
                                                  )}
                                                  <span className="text-xs text-muted-foreground">
                                                    ({subreddit.subscriber_count.toLocaleString()} members)
                                                  </span>
                                                </div>
                                              </SelectItem>
                                            ))}
                                        </SelectContent>
                                      </Select>
                                      <p className="text-xs text-muted-foreground">
                                        {userSubreddits.filter(sub => sub.is_verified).length} verified subreddits available.
                                        {(selectedSubredditId === "" || selectedSubredditId === "default") && " Will post to your profile or default subreddit."}
                                      </p>
                                    </div>
                                  ) : (
                                    <div className="text-sm text-muted-foreground">
                                      <p>No subreddits configured.</p>
                                      <p className="text-xs mt-1">
                                        Go to Settings → Subreddits to add your favorite subreddits for easier posting.
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </>
              )}
            </CardContent>
          </Card>



          {/* Twitter Reconnection Warning */}
          {media.length > 0 && (() => {
            const selectedTwitterAccounts = socialAccounts.filter(acc => 
              acc.platform === 'twitter' && 
              selectedAccounts.includes(acc.id) &&
              (!acc.oauth1_access_token || !acc.oauth1_access_token_secret)
            )
            
            if (selectedTwitterAccounts.length === 0) return null
            
            return (
              <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-amber-800 dark:text-amber-200 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Twitter Media Upload Issue
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm text-amber-700 dark:text-amber-300">
                    <p className="font-medium mb-2">The following Twitter accounts need to be reconnected for media upload:</p>
                    <ul className="space-y-1 mb-3">
                      {selectedTwitterAccounts.map(acc => (
                        <li key={acc.id} className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-amber-600 rounded-full"></span>
                          @{acc.username}
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs">
                      <strong>Current behavior:</strong> Media will be referenced in tweet text with a timestamp.
                      <br />
                      <strong>To fix:</strong> Reconnect these accounts to enable direct media upload.
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900"
                    onClick={() => navigate('/settings')}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Go to Settings to Reconnect
                  </Button>
                </CardContent>
              </Card>
            )
          })()}
        </div>
      </div>
    </div>
  )
}