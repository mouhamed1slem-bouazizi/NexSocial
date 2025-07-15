import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/useToast"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Plus,
  Search,
  Star,
  StarOff,
  Trash2,
  RefreshCw,
  Users,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  BarChart3,
  Hash
} from "lucide-react"

interface Subreddit {
  id: string
  subreddit_name: string
  display_name: string
  description?: string
  subscriber_count: number
  submission_type: string
  over18: boolean
  quarantined: boolean
  is_verified: boolean
  is_favorite: boolean
  posting_success_count: number
  posting_failure_count: number
  last_posted_at?: string
  last_validated?: string
  validation_error?: string
  created_at: string
}

export function SubredditManagement() {
  const [subreddits, setSubreddits] = useState<Subreddit[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [newSubredditName, setNewSubredditName] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [filterFavorites, setFilterFavorites] = useState(false)
  const [filterVerified, setFilterVerified] = useState(false)
  const { toast } = useToast()

  // Load user's subreddits
  const loadSubreddits = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('authToken')
      if (!token) {
        throw new Error('No authentication token found')
      }

      const params = new URLSearchParams()
      if (filterVerified) params.append('verified', 'true')
      if (filterFavorites) params.append('favorites', 'true')

      const response = await fetch(`/api/subreddits?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to load subreddits')
      }

      const data = await response.json()
      setSubreddits(data.subreddits || [])
    } catch (error) {
      console.error('Error loading subreddits:', error)
      toast({
        title: "Error",
        description: "Failed to load subreddits. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Add new subreddit
  const addSubreddit = async () => {
    if (!newSubredditName.trim()) {
      toast({
        title: "Error", 
        description: "Please enter a subreddit name",
        variant: "destructive",
      })
      return
    }

    try {
      setIsValidating(true)
      const token = localStorage.getItem('authToken')
      if (!token) {
        throw new Error('No authentication token found')
      }

      const response = await fetch('/api/subreddits', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subreddit_name: newSubredditName.trim(),
          auto_validate: true
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add subreddit')
      }

      toast({
        title: "Success",
        description: `r/${newSubredditName} added successfully!`,
      })

      setNewSubredditName("")
      setIsAddDialogOpen(false)
      loadSubreddits()

    } catch (error: any) {
      console.error('Error adding subreddit:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to add subreddit",
        variant: "destructive",
      })
    } finally {
      setIsValidating(false)
    }
  }

  // Toggle favorite status
  const toggleFavorite = async (subreddit: Subreddit) => {
    try {
      const token = localStorage.getItem('authToken')
      if (!token) {
        throw new Error('No authentication token found')
      }

      const response = await fetch(`/api/subreddits/${subreddit.id}/favorite`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_favorite: !subreddit.is_favorite
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update favorite status')
      }

      toast({
        title: "Success",
        description: `r/${subreddit.subreddit_name} ${!subreddit.is_favorite ? 'added to' : 'removed from'} favorites`,
      })

      loadSubreddits()

    } catch (error) {
      console.error('Error toggling favorite:', error)
      toast({
        title: "Error",
        description: "Failed to update favorite status",
        variant: "destructive",
      })
    }
  }

  // Revalidate subreddit
  const revalidateSubreddit = async (subreddit: Subreddit) => {
    try {
      const token = localStorage.getItem('authToken')
      if (!token) {
        throw new Error('No authentication token found')
      }

      const response = await fetch(`/api/subreddits/${subreddit.id}/revalidate`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to revalidate subreddit')
      }

      toast({
        title: "Success",
        description: `r/${subreddit.subreddit_name} revalidated successfully`,
      })

      loadSubreddits()

    } catch (error) {
      console.error('Error revalidating subreddit:', error)
      toast({
        title: "Error",
        description: "Failed to revalidate subreddit",
        variant: "destructive",
      })
    }
  }

  // Delete subreddit
  const deleteSubreddit = async (subreddit: Subreddit) => {
    try {
      const token = localStorage.getItem('authToken')
      if (!token) {
        throw new Error('No authentication token found')
      }

      const response = await fetch(`/api/subreddits/${subreddit.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to delete subreddit')
      }

      toast({
        title: "Success",
        description: `r/${subreddit.subreddit_name} removed from your list`,
      })

      loadSubreddits()

    } catch (error) {
      console.error('Error deleting subreddit:', error)
      toast({
        title: "Error",
        description: "Failed to delete subreddit",
        variant: "destructive",
      })
    }
  }

  // Filter subreddits based on search
  const filteredSubreddits = subreddits.filter(subreddit =>
    subreddit.subreddit_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    subreddit.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (subreddit.description && subreddit.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  // Load subreddits on component mount and when filters change
  useEffect(() => {
    loadSubreddits()
  }, [filterFavorites, filterVerified])

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5" />
            Subreddit Management
          </CardTitle>
          <CardDescription>
            Manage your favorite subreddits for easier posting. Add subreddits you frequently post to.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search subreddits..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterFavorites ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterFavorites(!filterFavorites)}
              >
                <Star className="h-4 w-4 mr-2" />
                Favorites
              </Button>
              <Button
                variant={filterVerified ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterVerified(!filterVerified)}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Verified
              </Button>
            </div>
          </div>

          {/* Add New Subreddit */}
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Add Subreddit
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Subreddit</DialogTitle>
                <DialogDescription>
                  Enter a subreddit name to add it to your list. We'll automatically validate it exists.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Subreddit Name</label>
                  <div className="flex items-center mt-1">
                    <span className="text-sm text-gray-500 mr-1">r/</span>
                    <Input
                      placeholder="videos"
                      value={newSubredditName}
                      onChange={(e) => setNewSubredditName(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addSubreddit()}
                      disabled={isValidating}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={addSubreddit} 
                    disabled={isValidating || !newSubredditName.trim()}
                    className="flex-1"
                  >
                    {isValidating ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Validating...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Subreddit
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsAddDialogOpen(false)}
                    disabled={isValidating}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Subreddits List */}
      <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Your Subreddits ({filteredSubreddits.length})</span>
            <Button variant="outline" size="sm" onClick={loadSubreddits} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading subreddits...</span>
            </div>
          ) : filteredSubreddits.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {subreddits.length === 0 ? (
                <div>
                  <Hash className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No subreddits added yet.</p>
                  <p className="text-sm">Add your first subreddit to get started!</p>
                </div>
              ) : (
                <p>No subreddits match your search criteria.</p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSubreddits.map((subreddit) => (
                <div
                  key={subreddit.id}
                  className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium text-lg">r/{subreddit.subreddit_name}</h3>
                        {subreddit.is_favorite && (
                          <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        )}
                        <Badge variant={subreddit.is_verified ? "default" : "secondary"}>
                          {subreddit.is_verified ? (
                            <>
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Verified
                            </>
                          ) : (
                            <>
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Unverified
                            </>
                          )}
                        </Badge>
                        {subreddit.over18 && <Badge variant="destructive">NSFW</Badge>}
                      </div>
                      
                      {subreddit.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                          {subreddit.description}
                        </p>
                      )}
                      
                      <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {subreddit.subscriber_count.toLocaleString()} subscribers
                        </span>
                        {(subreddit.posting_success_count > 0 || subreddit.posting_failure_count > 0) && (
                          <span className="flex items-center gap-1">
                            <BarChart3 className="h-3 w-3" />
                            {subreddit.posting_success_count} success, {subreddit.posting_failure_count} failed
                          </span>
                        )}
                        <span>Posts: {subreddit.submission_type}</span>
                      </div>
                      
                      {subreddit.validation_error && (
                        <p className="text-sm text-red-600 mt-2">
                          ⚠️ {subreddit.validation_error}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleFavorite(subreddit)}
                        title={subreddit.is_favorite ? "Remove from favorites" : "Add to favorites"}
                      >
                        {subreddit.is_favorite ? (
                          <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        ) : (
                          <StarOff className="h-4 w-4" />
                        )}
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => revalidateSubreddit(subreddit)}
                        title="Revalidate subreddit"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        title="View on Reddit"
                      >
                        <a 
                          href={`https://reddit.com/r/${subreddit.subreddit_name}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" title="Remove subreddit">
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove Subreddit</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to remove r/{subreddit.subreddit_name} from your list?
                              This action cannot be undone, but you can add it back later.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => deleteSubreddit(subreddit)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 