import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/useToast"
import {
  MessageSquare,
  Send,
  Search,
  Plus,
  RefreshCw,
  Users,
  Hash
} from "lucide-react"

import { 
  getDiscordStatus, 
  getDiscordConversations, 
  getDiscordMessages,
  sendDiscordMessage, 
  markDiscordMessagesAsRead,
  type DiscordConversation,
  type DiscordMessage,
  type DiscordStatus
} from "@/api/discordMessaging"

export function Inbox() {
  const [conversations, setConversations] = useState<DiscordConversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<DiscordConversation | null>(null)
  const [newMessage, setNewMessage] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [discordStatus, setDiscordStatus] = useState<DiscordStatus | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    checkDiscordConnection()
  }, [])

  const checkDiscordConnection = async () => {
    try {
      setLoading(true)
      setRefreshing(true)
      
      // Check Discord bot status
      const status = await getDiscordStatus()
      setDiscordStatus(status)
      
      if (status.connected) {
        // Fetch conversations if connected
        const conversationsResponse = await getDiscordConversations()
        if (conversationsResponse.success) {
          setConversations(conversationsResponse.conversations)
          
          if (conversationsResponse.conversations.length === 0) {
            toast({
              title: "Discord Connected! 🎮",
              description: "Bot is connected but no channels found. Make sure the bot has proper permissions.",
              duration: 5000,
            })
          }
        }
      } else {
        setConversations([])
        if (status.setup_required) {
          toast({
            title: "Discord Setup Required",
            description: "Discord.js is not installed. Run 'npm install discord.js' in the server directory.",
            variant: "destructive",
            duration: 8000,
          })
        } else if (status.bot_token_required) {
          toast({
            title: "Discord Bot Token Required",
            description: "Add DISCORD_BOT_TOKEN to your environment variables.",
            variant: "destructive",
            duration: 8000,
          })
        }
      }
      
    } catch (error: any) {
      console.error('Error checking Discord connection:', error)
      toast({
        title: "Connection Error",
        description: error.message || "Failed to connect to Discord",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return

    try {
      await sendDiscordMessage(selectedConversation.id, newMessage)
      
      toast({
        title: "Message Sent",
        description: "Discord message sent successfully!",
      })
      setNewMessage("")
      
      // Refresh conversation messages
      await loadConversationMessages(selectedConversation.id)
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive"
      })
    }
  }

  const loadConversationMessages = async (channelId: string) => {
    try {
      const messagesResponse = await getDiscordMessages(channelId, 50)
      if (messagesResponse.success && selectedConversation?.id === channelId) {
        setSelectedConversation({
          ...selectedConversation,
          messages: messagesResponse.messages
        })
      }
    } catch (error) {
      console.error('Error loading conversation messages:', error)
    }
  }

  const selectConversation = async (conversation: DiscordConversation) => {
    setSelectedConversation(conversation)
    
    // Load messages for the selected conversation
    if (conversation.messages.length === 0) {
      await loadConversationMessages(conversation.id)
    }
    
    // Mark as read
    try {
      await markDiscordMessagesAsRead(conversation.id)
    } catch (error) {
      console.error('Error marking messages as read:', error)
    }
  }

  const filteredConversations = conversations.filter(conversation =>
    conversation.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const unreadCount = conversations.reduce((total, conv) => total + conv.unreadCount, 0)

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
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Discord Messaging 🎮
          </h1>
                      <p className="text-muted-foreground mt-1">
              {discordStatus?.connected 
                ? `Connected as ${discordStatus.bot?.username}` 
                : 'Connect your Discord bot to start messaging'}
            </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={checkDiscordConnection}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {discordStatus?.connected && (
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New DM
            </Button>
          )}
          <Badge variant="secondary" className="bg-indigo-100 text-indigo-800">
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
              placeholder="Search Discord conversations..."
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
                <MessageSquare className="h-5 w-5 text-indigo-600" />
                Discord Conversations ({filteredConversations.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y max-h-[600px] overflow-y-auto">
                {!discordStatus?.connected ? (
                  <div className="p-8 text-center">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">Discord Not Connected</h3>
                    <p className="text-muted-foreground mb-4">
                      Set up your Discord bot to start messaging with your Discord server.
                    </p>
                    <Button variant="outline" onClick={checkDiscordConnection}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Check Connection
                    </Button>
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="p-8 text-center">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Conversations</h3>
                    <p className="text-muted-foreground mb-4">
                      Start chatting on Discord to see conversations here.
                    </p>
                  </div>
                ) : (
                  filteredConversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      className={`p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                        selectedConversation?.id === conversation.id 
                          ? 'bg-indigo-50 dark:bg-indigo-950 border-r-2 border-indigo-500' 
                          : ''
                      } ${conversation.unreadCount > 0 ? 'bg-indigo-50/50 dark:bg-indigo-950/50' : ''}`}
                      onClick={() => selectConversation(conversation)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          {conversation.type === 'channel' ? (
                            <div className="p-2 rounded-full bg-indigo-500">
                              <Hash className="h-4 w-4 text-white" />
                            </div>
                          ) : (
                            <div className="p-2 rounded-full bg-green-500">
                              <Users className="h-4 w-4 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{conversation.name}</span>
                            {conversation.unreadCount > 0 && (
                              <Badge variant="secondary" className="bg-indigo-500 text-white text-xs">
                                {conversation.unreadCount}
                              </Badge>
                            )}
                          </div>
                          {conversation.lastMessage && (
                            <>
                              <p className="text-sm text-muted-foreground mb-1 line-clamp-2">
                                {conversation.lastMessage.content}
                              </p>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {conversation.type === 'channel' ? 'Channel' : 'DM'}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(conversation.lastMessage.timestamp).toLocaleDateString()}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Conversation Detail */}
        <div className="lg:col-span-2">
          {selectedConversation ? (
            <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    {selectedConversation.type === 'channel' ? (
                      <div className="p-3 rounded-full bg-indigo-500">
                        <Hash className="h-5 w-5 text-white" />
                      </div>
                    ) : (
                      <div className="p-3 rounded-full bg-green-500">
                        <Users className="h-5 w-5 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{selectedConversation.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        Discord {selectedConversation.type === 'channel' ? 'Channel' : 'DM'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {selectedConversation.messages.length} messages
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Message History */}
                <div className="space-y-3 max-h-[400px] overflow-y-auto border rounded-lg p-4 bg-slate-50 dark:bg-slate-800/50">
                  {selectedConversation.messages.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    selectedConversation.messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.type === 'sent' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] p-3 rounded-lg ${
                            message.type === 'sent'
                              ? 'bg-indigo-500 text-white'
                              : 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border'
                          }`}
                        >
                          {message.type === 'received' && (
                            <p className="text-xs font-medium mb-1 text-indigo-600 dark:text-indigo-400">
                              {message.author.username}#{message.author.discriminator}
                            </p>
                          )}
                          <p className="text-sm">{message.content}</p>
                          <p className={`text-xs mt-1 ${
                            message.type === 'sent' 
                              ? 'text-indigo-200' 
                              : 'text-slate-500 dark:text-slate-400'
                          }`}>
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Message Input */}
                <div className="space-y-3">
                  <Textarea
                    placeholder="Type your Discord message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="resize-none"
                    rows={3}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        sendMessage()
                      }
                    }}
                  />
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      Press Enter to send, Shift+Enter for new line
                    </div>
                    <Button onClick={sendMessage} disabled={!newMessage.trim()}>
                      <Send className="h-4 w-4 mr-2" />
                      Send Message
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
              <CardContent className="p-12 text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
                <p className="text-muted-foreground">
                  Choose a Discord conversation from the list to view messages and chat
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}