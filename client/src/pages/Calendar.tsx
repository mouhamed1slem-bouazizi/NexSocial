import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getPosts, Post } from "@/api/posts"
import { useToast } from "@/hooks/useToast"
import { useNavigate } from "react-router-dom"
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Filter,
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  Youtube,
  Users,
  ChevronLeft,
  ChevronRight
} from "lucide-react"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO } from "date-fns"

const platformIcons = {
  facebook: Facebook,
  instagram: Instagram,
  twitter: Twitter,
  linkedin: Linkedin,
  youtube: Youtube,
  tiktok: Users
}

const platformColors = {
  facebook: "bg-blue-500",
  instagram: "bg-pink-500",
  twitter: "bg-sky-500",
  linkedin: "bg-blue-700",
  youtube: "bg-red-500",
  tiktok: "bg-black"
}

export function Calendar() {
  const [posts, setPosts] = useState<Post[]>([])
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month')
  const [filterPlatform, setFilterPlatform] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        console.log('Fetching posts for calendar...')
        const data = await getPosts()
        console.log('✅ Posts API response:', data)
        setPosts(data || [])
        console.log('Posts loaded for calendar:', data?.length || 0)
      } catch (error) {
        console.error('Error fetching posts:', error)
        toast({
          title: "Error",
          description: "Failed to load posts",
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }

    fetchPosts()
  }, [toast])

  const getPostsForDate = (date: Date) => {
    return posts.filter(post => {
      if (post.status === 'scheduled' && post.scheduledAt) {
        return isSameDay(parseISO(post.scheduledAt), date)
      }
      if (post.status === 'published' && post.publishedAt) {
        return isSameDay(parseISO(post.publishedAt), date)
      }
      return false
    }).filter(post => {
      if (filterPlatform === 'all') return true
      return post.platforms.includes(filterPlatform)
    })
  }

  const getDaysInMonth = () => {
    const start = startOfMonth(selectedDate)
    const end = endOfMonth(selectedDate)
    return eachDayOfInterval({ start, end })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'draft':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-7 gap-4">
            {[...Array(35)].map((_, i) => (
              <div key={i} className="h-24 bg-slate-200 rounded"></div>
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
            Content Calendar
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your scheduled and published content
          </p>
        </div>
        <Button onClick={() => navigate('/create')} className="bg-gradient-to-r from-blue-500 to-indigo-600">
          <Plus className="mr-2 h-4 w-4" />
          Create Post
        </Button>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-xl font-semibold min-w-[200px] text-center">
              {format(selectedDate, 'MMMM yyyy')}
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <Select value={viewMode} onValueChange={(value: 'month' | 'week' | 'day') => setViewMode(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Month</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="day">Day</SelectItem>
            </SelectContent>
          </Select>
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
              <SelectItem value="youtube">YouTube</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Calendar Grid */}
      <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="grid grid-cols-7 gap-4 mb-4">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-center font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-4">
            {getDaysInMonth().map((date) => {
              const dayPosts = getPostsForDate(date)
              const isToday = isSameDay(date, new Date())

              return (
                <div
                  key={date.toISOString()}
                  className={`min-h-[120px] p-2 border rounded-lg transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 ${
                    isToday ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div className={`text-sm font-medium mb-2 ${isToday ? 'text-blue-600' : ''}`}>
                    {format(date, 'd')}
                  </div>

                  <div className="space-y-1">
                    {dayPosts.slice(0, 3).map((post) => (
                      <div
                        key={post._id}
                        className={`text-xs p-1 rounded border ${getStatusColor(post.status)} cursor-pointer hover:opacity-80`}
                        title={post.content}
                      >
                        <div className="flex items-center gap-1 mb-1">
                          {post.platforms.slice(0, 2).map((platform) => {
                            const IconComponent = platformIcons[platform as keyof typeof platformIcons]
                            return (
                              <div key={platform} className={`p-0.5 rounded ${platformColors[platform as keyof typeof platformColors]}`}>
                                <IconComponent className="h-2 w-2 text-white" />
                              </div>
                            )
                          })}
                          <Badge variant="outline" className="text-xs px-1 py-0">
                            {post.status}
                          </Badge>
                        </div>
                        <p className="line-clamp-2 text-xs">
                          {post.content.slice(0, 50)}...
                        </p>
                      </div>
                    ))}

                    {dayPosts.length > 3 && (
                      <div className="text-xs text-muted-foreground text-center py-1">
                        +{dayPosts.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg">Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-100 border border-green-200"></div>
              <span className="text-sm">Published</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-100 border border-blue-200"></div>
              <span className="text-sm">Scheduled</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gray-100 border border-gray-200"></div>
              <span className="text-sm">Draft</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-100 border border-red-200"></div>
              <span className="text-sm">Failed</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}