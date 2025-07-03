import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/useToast"
import {
  MessageSquare,
  Send,
  Search,
  Filter,
  Heart,
  MessageCircle,
  Share,
  Flag,
  Clock,
  CheckCircle,
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  Smile
} from "lucide-react"

interface Message {
  _id: string
  platform: string
  type: 'comment' | 'mention' | 'direct_message'
  author: {
    name: string
    username: string
    avatar: string
  }
  content: string
  timestamp: string
  isRead: boolean
  sentiment: 'positive' | 'neutral' | 'negative'
  postContent?: string
}

const platformIcons = {
  facebook: Facebook,
  instagram: Instagram,
  twitter: Twitter,
  linkedin: Linkedin
}

const platformColors = {
  facebook: "bg-blue-500",
  instagram: "bg-pink-500",
  twitter: "bg-sky-500",
  linkedin: "bg-blue-700"
}

export function Inbox() {
  const [messages, setMessages] = useState<Message[]>([])
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [replyText, setReplyText] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [filterPlatform, setFilterPlatform] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    // Mock data for inbox messages
    const mockMessages: Message[] = [
      {
        _id: '1',
        platform: 'facebook',
        type: 'comment',
        author: {
          name: 'Sarah Johnson',
          username: '@sarah_j',
          avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face'
        },
        content: 'Love this post! Really helpful insights about social media marketing.',
        timestamp: '2024-01-15T10:30:00Z',
        isRead: false,
        sentiment: 'positive',
        postContent: 'Excited to share our latest product update! 🚀 #innovation #tech'
      },
      {
        _id: '2',
        platform: 'instagram',
        type: 'mention',
        author: {
          name: 'Mike Chen',
          username: '@mike_chen_photo',
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face'
        },
        content: 'Thanks for the mention! Great collaboration opportunity.',
        timestamp: '2024-01-15T09:15:00Z',
        isRead: false,
        sentiment: 'positive'
      },
      {
        _id: '3',
        platform: 'twitter',
        type: 'direct_message',
        author: {
          name: 'Emma Wilson',
          username: '@emma_w',
          avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face'
        },
        content: 'Hi! I saw your recent post about automation. Would love to discuss a potential partnership.',
        timestamp: '2024-01-15T08:45:00Z',
        isRead: true,
        sentiment: 'neutral'
      },
      {
        _id: '4',
        platform: 'linkedin',
        type: 'comment',
        author: {
          name: 'David Rodriguez',
          username: '@david_r_marketing',
          avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face'
        },
        content: 'Interesting perspective on social media trends. However, I think there are some points that could be expanded.',
        timestamp: '2024-01-14T16:20:00Z',
        isRead: true,
        sentiment: 'neutral',
        postContent: 'Behind the scenes at our office! Great team collaboration today. 💪'
      }
    ]

    setMessages(mockMessages)
    setLoading(false)
  }, [])

  const filteredMessages = messages.filter(message => {
    const matchesSearch = message.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         message.author.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesPlatform = filterPlatform === 'all' || message.platform === filterPlatform
    const matchesType = filterType === 'all' || message.type === filterType

    return matchesSearch && matchesPlatform && matchesType
  })

  const unreadCount = messages.filter(m => !m.isRead).length

  const handleReply = async () => {
    if (!replyText.trim() || !selectedMessage) return

    try {
      // Mock reply functionality
      await new Promise(resolve => setTimeout(resolve, 1000))

      toast({
        title: "Success",
        description: "Reply sent successfully!",
      })

      setReplyText("")
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send reply",
        variant: "destructive"
      })
    }
  }

  const markAsRead = (messageId: string) => {
    setMessages(prev => prev.map(msg =>
      msg._id === messageId ? { ...msg, isRead: true } : msg
    ))
  }

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return 'text-green-600 bg-green-100'
      case 'negative':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return '😊'
      case 'negative':
        return '😞'
      default:
        return '😐'
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-24 bg-slate-200 rounded"></div>
              ))}
            </div>
            <div className="lg:col-span-2 h-96 bg-slate-200 rounded"></div>
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
            Social Inbox
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage all your social media conversations in one place
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            {unreadCount} unread
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filterPlatform} onValueChange={setFilterPlatform}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Platforms</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="twitter">Twitter</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="comment">Comments</SelectItem>
                  <SelectItem value="mention">Mentions</SelectItem>
                  <SelectItem value="direct_message">Direct Messages</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Messages List */}
        <div className="lg:col-span-1">
          <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Messages ({filteredMessages.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y max-h-[600px] overflow-y-auto">
                {filteredMessages.map((message) => {
                  const IconComponent = platformIcons[message.platform as keyof typeof platformIcons]
                  const platformColor = platformColors[message.platform as keyof typeof platformColors]

                  return (
                    <div
                      key={message._id}
                      className={`p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                        selectedMessage?._id === message._id ? 'bg-blue-50 dark:bg-blue-950 border-r-2 border-blue-500' : ''
                      } ${!message.isRead ? 'bg-blue-50/50 dark:bg-blue-950/50' : ''}`}
                      onClick={() => {
                        setSelectedMessage(message)
                        if (!message.isRead) {
                          markAsRead(message._id)
                        }
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={message.author.avatar} alt={message.author.name} />
                          <AvatarFallback>{message.author.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <div className={`p-1 rounded ${platformColor}`}>
                              <IconComponent className="h-3 w-3 text-white" />
                            </div>
                            <span className="font-medium text-sm">{message.author.name}</span>
                            {!message.isRead && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-1 line-clamp-2">
                            {message.content}
                          </p>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs capitalize">
                              {message.type.replace('_', ' ')}
                            </Badge>
                            <span className={`text-xs px-2 py-1 rounded-full ${getSentimentColor(message.sentiment)}`}>
                              {getSentimentIcon(message.sentiment)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(message.timestamp).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Message Detail */}
        <div className="lg:col-span-2">
          {selectedMessage ? (
            <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={selectedMessage.author.avatar} alt={selectedMessage.author.name} />
                    <AvatarFallback>{selectedMessage.author.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{selectedMessage.author.name}</h3>
                      <span className="text-muted-foreground">{selectedMessage.author.username}</span>
                      <div className={`p-1 rounded ${platformColors[selectedMessage.platform as keyof typeof platformColors]}`}>
                        {React.createElement(platformIcons[selectedMessage.platform as keyof typeof platformIcons], { className: "h-3 w-3 text-white" })}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs capitalize">
                        {selectedMessage.type.replace('_', ' ')}
                      </Badge>
                      <span className={`text-xs px-2 py-1 rounded-full ${getSentimentColor(selectedMessage.sentiment)}`}>
                        {getSentimentIcon(selectedMessage.sentiment)} {selectedMessage.sentiment}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(selectedMessage.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedMessage.postContent && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <p className="text-sm font-medium mb-1">Original Post:</p>
                    <p className="text-sm text-muted-foreground">{selectedMessage.postContent}</p>
                  </div>
                )}

                <div className="p-4 border rounded-lg">
                  <p className="text-sm">{selectedMessage.content}</p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Textarea
                      placeholder="Write your reply..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      className="flex-1"
                      rows={3}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        <Smile className="h-4 w-4 mr-2" />
                        Emoji
                      </Button>
                      <Button variant="outline" size="sm">
                        <Flag className="h-4 w-4 mr-2" />
                        Flag
                      </Button>
                    </div>
                    <Button onClick={handleReply} disabled={!replyText.trim()}>
                      <Send className="h-4 w-4 mr-2" />
                      Send Reply
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
              <CardContent className="p-12 text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Select a message</h3>
                <p className="text-muted-foreground">
                  Choose a message from the list to view details and reply
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}