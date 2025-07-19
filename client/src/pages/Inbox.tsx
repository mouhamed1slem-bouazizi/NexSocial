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
  Smile,
  Plus,
  RefreshCw
} from "lucide-react"
import { 
  getLineConversations, 
  sendLineMessage, 
  markLineMessagesAsRead, 
  startLineConversation,
  type LineConversation,
  type LineMessage 
} from "@/api/lineMessaging"

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
  const [conversations, setConversations] = useState<LineConversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<LineConversation | null>(null)
  const [replyText, setReplyText] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [lineAccount, setLineAccount] = useState<{ displayName: string; profileImage: string } | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchLineConversations()
  }, [])

  const fetchLineConversations = async () => {
    try {
      setLoading(true)
      const response = await getLineConversations()
      setConversations(response.conversations || [])
      setLineAccount(response.lineAccount || null)
      
      if (response.conversations.length === 0 && response.lineAccount) {
        // No conversations yet, show a helpful message
        toast({
          title: "Line Connected! 📱",
          description: "Your Line account is connected. Start a new conversation to begin messaging.",
          duration: 5000,
        })
      }
    } catch (error: any) {
      console.error('Error fetching conversations:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to load Line conversations",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const refreshConversations = async () => {
    try {
      setRefreshing(true)
      await fetchLineConversations()
      toast({
        title: "Refreshed",
        description: "Conversations updated successfully",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to refresh conversations",
        variant: "destructive"
      })
    } finally {
      setRefreshing(false)
    }
  }

  const startNewConversation = async () => {
    try {
      const response = await startLineConversation()
      if (response.success) {
        await fetchLineConversations() // Refresh to show new conversation
        toast({
          title: "New Conversation",
          description: "Started a new Line conversation!",
        })
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to start new conversation",
        variant: "destructive"
      })
         }
   }

  const filteredConversations = conversations.filter(conversation => {
    const matchesSearch = conversation.lastMessage.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         conversation.participant.displayName.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  const unreadCount = conversations.reduce((total, conversation) => total + conversation.unreadCount, 0)

  const handleReply = async () => {
    if (!replyText.trim() || !selectedConversation) return

    try {
      await sendLineMessage(selectedConversation.participant.userId, replyText, selectedConversation.id)
      
      toast({
        title: "Success",
        description: "Line message sent successfully!",
      })

      setReplyText("")
      
      // Refresh conversations to show the new message
      await fetchLineConversations()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send Line message",
        variant: "destructive"
      })
    }
  }

  const markAsRead = async (conversationId: string) => {
    try {
      await markLineMessagesAsRead(conversationId)
      
      // Update local state
      setConversations(prev => prev.map(conv =>
        conv.id === conversationId ? { ...conv, unreadCount: 0, messages: conv.messages.map(msg => ({ ...msg, isRead: true })) } : conv
      ))
    } catch (error: any) {
      console.error('Error marking messages as read:', error)
    }
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
          <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
            Line Messaging 📱
          </h1>
          <p className="text-muted-foreground mt-1">
            {lineAccount ? `Connected as ${lineAccount.displayName}` : 'Connect your Line account to start messaging'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshConversations}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={startNewConversation}
            disabled={!lineAccount}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Chat
          </Button>
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            {unreadCount} unread
          </Badge>
        </div>
      </div>

      {/* Search */}
      <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Conversations List */}
        <div className="lg:col-span-1">
          <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-green-600" />
                Line Conversations ({filteredConversations.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y max-h-[600px] overflow-y-auto">
                {!lineAccount ? (
                  <div className="p-8 text-center">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Line Account Connected</h3>
                    <p className="text-muted-foreground mb-4">
                      Connect your Line account from the Dashboard to start messaging.
                    </p>
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="p-8 text-center">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Conversations Yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Start a new conversation to begin messaging on Line.
                    </p>
                    <Button onClick={startNewConversation} variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Start New Chat
                    </Button>
                  </div>
                ) : (
                  filteredConversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      className={`p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                        selectedConversation?.id === conversation.id ? 'bg-green-50 dark:bg-green-950 border-r-2 border-green-500' : ''
                      } ${conversation.unreadCount > 0 ? 'bg-green-50/50 dark:bg-green-950/50' : ''}`}
                      onClick={() => {
                        setSelectedConversation(conversation)
                        if (conversation.unreadCount > 0) {
                          markAsRead(conversation.id)
                        }
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={conversation.participant.pictureUrl} alt={conversation.participant.displayName} />
                          <AvatarFallback>{conversation.participant.displayName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="p-1 rounded bg-green-500">
                              <MessageSquare className="h-3 w-3 text-white" />
                            </div>
                            <span className="font-medium text-sm">{conversation.participant.displayName}</span>
                            {conversation.unreadCount > 0 && (
                              <Badge variant="secondary" className="bg-green-500 text-white text-xs">
                                {conversation.unreadCount}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-1 line-clamp-2">
                            {conversation.lastMessage.content}
                          </p>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              Line Message
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(conversation.lastMessage.timestamp).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
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