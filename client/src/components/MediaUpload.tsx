import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/hooks/useToast"
import {
  Image,
  Video,
  X,
  Upload,
  FileImage,
  FileVideo,
  Loader2
} from "lucide-react"

interface MediaItem {
  id: string
  type: 'image' | 'video'
  url: string
  file: File
  name: string
  size: number
}

interface MediaUploadProps {
  media: MediaItem[]
  onMediaChange: (media: MediaItem[]) => void
  maxFiles?: number
  maxFileSize?: number // in MB
}

export function MediaUpload({ 
  media, 
  onMediaChange, 
  maxFiles = 4,
  maxFileSize = 50 
}: MediaUploadProps) {
  const [uploading, setUploading] = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const validateFile = (file: File): string | null => {
    const maxSizeBytes = maxFileSize * 1024 * 1024
    
    if (file.size > maxSizeBytes) {
      return `File size must be less than ${maxFileSize}MB`
    }

    if (file.type.startsWith('image/')) {
      const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
      if (!allowedImageTypes.includes(file.type)) {
        return 'Only JPEG, PNG, GIF, and WebP images are allowed'
      }
    } else if (file.type.startsWith('video/')) {
      const allowedVideoTypes = ['video/mp4', 'video/mov', 'video/avi', 'video/webm']
      if (!allowedVideoTypes.includes(file.type)) {
        return 'Only MP4, MOV, AVI, and WebM videos are allowed'
      }
    } else {
      return 'Only image and video files are allowed'
    }

    return null
  }

  const handleFileSelect = async (files: FileList | null, type: 'image' | 'video') => {
    if (!files || files.length === 0) return

    if (media.length + files.length > maxFiles) {
      toast({
        title: "Too many files",
        description: `You can only upload up to ${maxFiles} files`,
        variant: "destructive"
      })
      return
    }

    setUploading(true)
    const newMediaItems: MediaItem[] = []

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        
        // Validate file
        const validationError = validateFile(file)
        if (validationError) {
          toast({
            title: "Invalid file",
            description: `${file.name}: ${validationError}`,
            variant: "destructive"
          })
          continue
        }

        // Create URL for preview
        const url = URL.createObjectURL(file)
        
        const mediaItem: MediaItem = {
          id: `${Date.now()}-${i}`,
          type: file.type.startsWith('image/') ? 'image' : 'video',
          url,
          file,
          name: file.name,
          size: file.size
        }

        newMediaItems.push(mediaItem)
      }

      if (newMediaItems.length > 0) {
        onMediaChange([...media, ...newMediaItems])
        toast({
          title: "Files uploaded",
          description: `${newMediaItems.length} file(s) added successfully`,
        })
      }
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to process files",
        variant: "destructive"
      })
    } finally {
      setUploading(false)
      // Reset file inputs
      if (imageInputRef.current) imageInputRef.current.value = ''
      if (videoInputRef.current) videoInputRef.current.value = ''
    }
  }

  const removeMedia = (id: string) => {
    const item = media.find(m => m.id === id)
    if (item) {
      URL.revokeObjectURL(item.url)
    }
    onMediaChange(media.filter(m => m.id !== id))
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="space-y-4">
      {/* Upload Buttons */}
      <div className="flex items-center gap-2">
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files, 'image')}
          disabled={uploading || media.length >= maxFiles}
        />
        
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          multiple
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files, 'video')}
          disabled={uploading || media.length >= maxFiles}
        />

        <Button
          variant="outline"
          size="sm"
          onClick={() => imageInputRef.current?.click()}
          disabled={uploading || media.length >= maxFiles}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Image className="h-4 w-4 mr-2" />
          )}
          Add Image
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => videoInputRef.current?.click()}
          disabled={uploading || media.length >= maxFiles}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Video className="h-4 w-4 mr-2" />
          )}
          Add Video
        </Button>

        {media.length > 0 && (
          <span className="text-sm text-muted-foreground">
            {media.length}/{maxFiles} files
          </span>
        )}
      </div>

      {/* Media Preview */}
      {media.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {media.map((item) => (
            <Card key={item.id} className="relative group">
              <CardContent className="p-2">
                <div className="relative aspect-square bg-muted rounded-lg overflow-hidden">
                  {item.type === 'image' ? (
                    <img
                      src={item.url}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <div className="text-center">
                        <FileVideo className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <video
                          src={item.url}
                          className="w-full h-20 object-cover rounded"
                          muted
                          preload="metadata"
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Remove button */}
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeMedia(item.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>

                  {/* File info overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-1 text-xs truncate">
                    {item.name} • {formatFileSize(item.size)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload area when no media */}
      {media.length === 0 && (
        <Card className="border-dashed border-2 border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors">
          <CardContent className="flex flex-col items-center justify-center py-6">
            <Upload className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground text-center">
              Drop files here or click the buttons above to upload
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Images and videos up to {maxFileSize}MB each
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 