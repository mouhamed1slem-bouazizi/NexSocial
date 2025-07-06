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
import { getSocialAccounts, SocialAccount } from "@/api/socialAccounts"
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
  const [scheduledDate, setScheduledDate] = useState<Date>()
  const [scheduledTime, setScheduledTime] = useState("")
  const [isScheduled, setIsScheduled] = useState(false)
  const [media, setMedia] = useState<{ id: string; type: 'image' | 'video'; url: string; file: File; name: string; size: number }[]>([])
  const [aiPrompt, setAiPrompt] = useState("")
  const [selectedTone, setSelectedTone] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const { toast } = useToast()
  const navigate = useNavigate()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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

  // Fetch social accounts on component mount
  useEffect(() => {
    const fetchSocialAccounts = async () => {
      try {
        setAccountsLoading(true)
        console.log('📊 Fetching social accounts for Create Post...')
        const response = await getSocialAccounts()
        console.log('✅ Social accounts response:', response)
        setSocialAccounts(response || [])
        
        // Auto-select connected accounts
        const connectedAccounts = response?.filter((acc: SocialAccount) => acc.is_connected) || []
        setSelectedAccounts(connectedAccounts.map((acc: SocialAccount) => acc.id))
        setSelectedPlatforms(connectedAccounts.map((acc: SocialAccount) => acc.platform))
        console.log('🎯 Auto-selected accounts:', connectedAccounts.length)
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
      
      // Update selected platforms based on selected accounts
      const accountsAfterToggle = socialAccounts.filter(acc => 
        newSelection.includes(acc.id)
      )
      setSelectedPlatforms(accountsAfterToggle.map(acc => acc.platform))
      
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
    
    if (allSelected) {
      // Remove all platform accounts
      setSelectedAccounts(prev => prev.filter(id => !platformAccountIds.includes(id)))
      setSelectedPlatforms(prev => prev.filter(p => p !== platformId))
    } else {
      // Add all platform accounts
      setSelectedAccounts(prev => [...new Set([...prev, ...platformAccountIds])])
      setSelectedPlatforms(prev => [...new Set([...prev, platformId])])
    }
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
        setContent(response.content)
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
        media: mediaData
      })

      if (response.success) {
        const successCount = Object.values(response.results || {}).filter(r => r.success).length
        const totalCount = Object.keys(response.results || {}).length
        
        toast({
          title: "Success",
          description: isScheduled 
            ? "Post scheduled successfully!" 
            : `Post published to ${successCount} of ${totalCount} accounts!`,
        })

        navigate('/')
      } else {
        throw new Error(response.message || 'Failed to create post')
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create post",
        variant: "destructive"
      })
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

                  {/* Emoji Picker */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Add Emojis</Label>
                    <EmojiPickerComponent 
                      onEmojiSelect={handleEmojiSelect}
                      disabled={loading}
                    />
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

                      {/* Emoji Picker for AI tab */}
                      <div>
                        <Label className="text-sm font-medium mb-2 block">Add Emojis</Label>
                        <EmojiPickerComponent 
                          onEmojiSelect={handleEmojiSelect}
                          disabled={loading}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

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
                            <div
                              key={account.id}
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

          {/* Action Buttons */}
          <div className="space-y-3">
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
    </div>
  )
}