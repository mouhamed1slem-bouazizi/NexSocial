import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { getMediaFiles, uploadMediaFile, MediaFile } from "@/api/media"
import { useToast } from "@/hooks/useToast"
import {
  Upload,
  Search,
  Filter,
  Grid3X3,
  List,
  Image,
  Video,
  FileText,
  Trash2,
  Download,
  Eye,
  Tag,
  Folder,
  Plus
} from "lucide-react"

export function MediaLibrary() {
  const [files, setFiles] = useState<MediaFile[]>([])
  const [filteredFiles, setFilteredFiles] = useState<MediaFile[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState<string>('all')
  const [filterFolder, setFilterFolder] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null)
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        console.log('Fetching media files...')
        const data = await getMediaFiles()
        setFiles((data as any).files)
        setFilteredFiles((data as any).files)
        console.log('Media files loaded')
      } catch (error) {
        console.error('Error fetching media files:', error)
        toast({
          title: "Error",
          description: "Failed to load media files",
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }

    fetchFiles()
  }, [toast])

  useEffect(() => {
    let filtered = files

    if (searchQuery) {
      filtered = filtered.filter(file =>
        file.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
        file.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }

    if (filterType !== 'all') {
      filtered = filtered.filter(file => file.type === filterType)
    }

    if (filterFolder !== 'all') {
      filtered = filtered.filter(file => file.folder === filterFolder)
    }

    setFilteredFiles(filtered)
  }, [files, searchQuery, filterType, filterFolder])

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await uploadMediaFile(formData)
      const newFile = (response as any).file

      setFiles(prev => [newFile, ...prev])
      toast({
        title: "Success",
        description: "File uploaded successfully!",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload file",
        variant: "destructive"
      })
    } finally {
      setUploading(false)
    }
  }

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'image':
        return Image
      case 'video':
        return Video
      default:
        return FileText
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const folders = [...new Set(files.map(file => file.folder).filter(Boolean))]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
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
            Media Library
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your images, videos, and other media files
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="file"
            id="file-upload"
            className="hidden"
            accept="image/*,video/*"
            onChange={handleFileUpload}
            disabled={uploading}
          />
          <Button
            onClick={() => document.getElementById('file-upload')?.click()}
            disabled={uploading}
            className="bg-gradient-to-r from-blue-500 to-indigo-600"
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload File
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input
                placeholder="Search files by name or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="image">Images</SelectItem>
                  <SelectItem value="video">Videos</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterFolder} onValueChange={setFilterFolder}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Folders</SelectItem>
                  {folders.map((folder) => (
                    <SelectItem key={folder} value={folder!}>
                      {folder}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex border rounded-lg">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredFiles.map((file) => {
            const FileIcon = getFileIcon(file.type)
            return (
              <Card
                key={file._id}
                className="group cursor-pointer hover:shadow-lg transition-all duration-200 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm"
                onClick={() => setSelectedFile(file)}
              >
                <CardContent className="p-4">
                  <div className="aspect-square mb-3 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    {file.type === 'image' ? (
                      <img
                        src={file.url}
                        alt={file.filename}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <FileIcon className="h-12 w-12 text-slate-400" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-medium text-sm truncate" title={file.filename}>
                      {file.filename}
                    </h3>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{formatFileSize(file.size)}</span>
                      <Badge variant="outline" className="text-xs">
                        {file.usageCount} uses
                      </Badge>
                    </div>
                    {file.folder && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Folder className="h-3 w-3" />
                        <span>{file.folder}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
          <CardContent className="p-0">
            <div className="divide-y">
              {filteredFiles.map((file) => {
                const FileIcon = getFileIcon(file.type)
                return (
                  <div
                    key={file._id}
                    className="flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                    onClick={() => setSelectedFile(file)}
                  >
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                      {file.type === 'image' ? (
                        <img
                          src={file.url}
                          alt={file.filename}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <FileIcon className="h-6 w-6 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{file.filename}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{formatFileSize(file.size)}</span>
                        <span>{file.type}</span>
                        {file.folder && (
                          <span className="flex items-center gap-1">
                            <Folder className="h-3 w-3" />
                            {file.folder}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {file.usageCount} uses
                      </Badge>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* File Details Dialog */}
      <Dialog open={!!selectedFile} onOpenChange={() => setSelectedFile(null)}>
        <DialogContent className="max-w-2xl">
          {selectedFile && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedFile.filename}</DialogTitle>
                <DialogDescription>
                  File details and preview
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="aspect-square rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    {selectedFile.type === 'image' ? (
                      <img
                        src={selectedFile.url}
                        alt={selectedFile.filename}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Video className="h-24 w-24 text-slate-400" />
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">File Information</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Size:</span>
                        <span>{formatFileSize(selectedFile.size)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Type:</span>
                        <span className="capitalize">{selectedFile.type}</span>
                      </div>
                      {selectedFile.dimensions && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Dimensions:</span>
                          <span>{selectedFile.dimensions.width} × {selectedFile.dimensions.height}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Usage:</span>
                        <span>{selectedFile.usageCount} times</span>
                      </div>
                      {selectedFile.folder && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Folder:</span>
                          <span>{selectedFile.folder}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {selectedFile.tags.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Tags</h4>
                      <div className="flex flex-wrap gap-1">
                        {selectedFile.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Empty State */}
      {filteredFiles.length === 0 && !loading && (
        <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
          <CardContent className="p-12 text-center">
            <Image className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No files found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || filterType !== 'all' || filterFolder !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Upload your first file to get started'}
            </p>
            {!searchQuery && filterType === 'all' && filterFolder === 'all' && (
              <Button
                onClick={() => document.getElementById('file-upload')?.click()}
                className="bg-gradient-to-r from-blue-500 to-indigo-600"
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload File
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}