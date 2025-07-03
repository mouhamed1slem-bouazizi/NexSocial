import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/useToast"
import {
  Zap,
  Rss,
  Globe,
  Clock,
  Settings,
  Plus,
  Trash2,
  Play,
  Pause,
  Edit,
  CheckCircle,
  AlertCircle
} from "lucide-react"

interface RSSFeed {
  _id: string
  name: string
  url: string
  status: 'active' | 'paused' | 'error'
  frequency: string
  lastSync: string
  postsGenerated: number
  platforms: string[]
}

interface NewsMonitor {
  _id: string
  name: string
  keywords: string[]
  categories: string[]
  status: 'active' | 'paused'
  frequency: string
  lastCheck: string
  articlesFound: number
}

export function Automation() {
  const [rssFeeds, setRssFeeds] = useState<RSSFeed[]>([])
  const [newsMonitors, setNewsMonitors] = useState<NewsMonitor[]>([])
  const [newFeedUrl, setNewFeedUrl] = useState("")
  const [newFeedName, setNewFeedName] = useState("")
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    // Mock data for RSS feeds
    const mockRSSFeeds: RSSFeed[] = [
      {
        _id: '1',
        name: 'Tech News',
        url: 'https://techcrunch.com/feed/',
        status: 'active',
        frequency: 'hourly',
        lastSync: '2024-01-15T10:30:00Z',
        postsGenerated: 45,
        platforms: ['twitter', 'linkedin']
      },
      {
        _id: '2',
        name: 'Industry Updates',
        url: 'https://example.com/industry-feed.xml',
        status: 'paused',
        frequency: 'daily',
        lastSync: '2024-01-14T08:00:00Z',
        postsGenerated: 12,
        platforms: ['facebook', 'linkedin']
      }
    ]

    const mockNewsMonitors: NewsMonitor[] = [
      {
        _id: '1',
        name: 'AI & Technology',
        keywords: ['artificial intelligence', 'machine learning', 'AI'],
        categories: ['Technology', 'Science'],
        status: 'active',
        frequency: 'daily',
        lastCheck: '2024-01-15T09:00:00Z',
        articlesFound: 8
      }
    ]

    setRssFeeds(mockRSSFeeds)
    setNewsMonitors(mockNewsMonitors)
    setLoading(false)
  }, [])

  const handleAddRSSFeed = async () => {
    if (!newFeedUrl.trim() || !newFeedName.trim()) {
      toast({
        title: "Error",
        description: "Please enter both feed name and URL",
        variant: "destructive"
      })
      return
    }

    try {
      const newFeed: RSSFeed = {
        _id: Date.now().toString(),
        name: newFeedName,
        url: newFeedUrl,
        status: 'active',
        frequency: 'daily',
        lastSync: new Date().toISOString(),
        postsGenerated: 0,
        platforms: ['twitter']
      }

      setRssFeeds(prev => [...prev, newFeed])
      setNewFeedName("")
      setNewFeedUrl("")

      toast({
        title: "Success",
        description: "RSS feed added successfully!",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add RSS feed",
        variant: "destructive"
      })
    }
  }

  const toggleFeedStatus = (feedId: string) => {
    setRssFeeds(prev => prev.map(feed =>
      feed._id === feedId
        ? { ...feed, status: feed.status === 'active' ? 'paused' : 'active' }
        : feed
    ))
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'paused':
        return 'bg-yellow-100 text-yellow-800'
      case 'error':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return CheckCircle
      case 'error':
        return AlertCircle
      default:
        return Clock
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
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
            Automation
          </h1>
          <p className="text-muted-foreground mt-1">
            Automate your content creation and posting with RSS feeds and news monitoring
          </p>
        </div>
      </div>

      <Tabs defaultValue="rss" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="rss">RSS Feeds</TabsTrigger>
          <TabsTrigger value="news">News Monitoring</TabsTrigger>
        </TabsList>

        <TabsContent value="rss" className="space-y-6">
          {/* Add RSS Feed */}
          <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Add RSS Feed
              </CardTitle>
              <CardDescription>
                Connect RSS feeds to automatically create posts from new articles
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="feed-name">Feed Name</Label>
                  <Input
                    id="feed-name"
                    placeholder="e.g., Tech News"
                    value={newFeedName}
                    onChange={(e) => setNewFeedName(e.target.value)}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="feed-url">RSS Feed URL</Label>
                  <Input
                    id="feed-url"
                    placeholder="https://example.com/feed.xml"
                    value={newFeedUrl}
                    onChange={(e) => setNewFeedUrl(e.target.value)}
                    className="mt-2"
                  />
                </div>
              </div>
              <Button onClick={handleAddRSSFeed} className="bg-gradient-to-r from-blue-500 to-indigo-600">
                <Rss className="mr-2 h-4 w-4" />
                Add Feed
              </Button>
            </CardContent>
          </Card>

          {/* RSS Feeds List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {rssFeeds.map((feed) => {
              const StatusIcon = getStatusIcon(feed.status)
              return (
                <Card key={feed._id} className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{feed.name}</CardTitle>
                      <Badge className={getStatusColor(feed.status)}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {feed.status}
                      </Badge>
                    </div>
                    <CardDescription className="break-all">
                      {feed.url}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Frequency</p>
                        <p className="font-medium capitalize">{feed.frequency}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Posts Generated</p>
                        <p className="font-medium">{feed.postsGenerated}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Platforms</p>
                      <div className="flex gap-1">
                        {feed.platforms.map((platform) => (
                          <Badge key={platform} variant="outline" className="text-xs">
                            {platform}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t">
                      <p className="text-xs text-muted-foreground">
                        Last sync: {new Date(feed.lastSync).toLocaleDateString()}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleFeedStatus(feed._id)}
                        >
                          {feed.status === 'active' ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" className="text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="news" className="space-y-6">
          {/* News Monitoring */}
          <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                News Monitoring
              </CardTitle>
              <CardDescription>
                Monitor news sources for specific keywords and automatically create posts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">News Monitoring</h3>
                <p className="text-muted-foreground mb-4">
                  Set up keyword monitoring to automatically discover relevant news articles
                </p>
                <Button className="bg-gradient-to-r from-blue-500 to-indigo-600">
                  <Plus className="mr-2 h-4 w-4" />
                  Add News Monitor
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Existing News Monitors */}
          {newsMonitors.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {newsMonitors.map((monitor) => (
                <Card key={monitor._id} className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{monitor.name}</CardTitle>
                      <Badge className={getStatusColor(monitor.status)}>
                        {monitor.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Keywords</p>
                      <div className="flex flex-wrap gap-1">
                        {monitor.keywords.map((keyword) => (
                          <Badge key={keyword} variant="secondary" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Frequency</p>
                        <p className="font-medium capitalize">{monitor.frequency}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Articles Found</p>
                        <p className="font-medium">{monitor.articlesFound}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t">
                      <p className="text-xs text-muted-foreground">
                        Last check: {new Date(monitor.lastCheck).toLocaleDateString()}
                      </p>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" className="text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}