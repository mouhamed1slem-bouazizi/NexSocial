import { useState } from "react"
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react'
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Smile } from "lucide-react"

interface EmojiPickerComponentProps {
  onEmojiSelect: (emoji: string) => void
  disabled?: boolean
}

export function EmojiPickerComponent({ 
  onEmojiSelect, 
  disabled = false 
}: EmojiPickerComponentProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    onEmojiSelect(emojiData.emoji)
    setIsOpen(false)
  }

  // Common emojis for quick access
  const commonEmojis = [
    '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂',
    '🙂', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘',
    '😎', '🤔', '🤗', '🤭', '🤫', '🤐', '😴', '😷',
    '🎉', '🎊', '🎈', '🎁', '🎂', '🎀', '🎃', '🎄',
    '❤️', '💕', '💖', '💗', '💘', '💝', '💞', '💓',
    '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '👏',
    '🔥', '⭐', '✨', '💫', '🌟', '💯', '💢', '💥',
    '🚀', '🎯', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️'
  ]

  return (
    <div className="flex items-center gap-2">
      {/* Quick emoji buttons */}
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
        {commonEmojis.slice(0, 6).map((emoji, index) => (
          <Button
            key={index}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-muted"
            onClick={() => onEmojiSelect(emoji)}
            disabled={disabled}
          >
            <span className="text-lg">{emoji}</span>
          </Button>
        ))}
      </div>

      {/* Full emoji picker */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            className="h-8"
          >
            <Smile className="h-4 w-4 mr-1" />
            More
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            theme={Theme.AUTO}
            width={350}
            height={400}
            previewConfig={{
              showPreview: false
            }}
            searchDisabled={false}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}

// Quick emoji toolbar for common emojis
export function QuickEmojiBar({ 
  onEmojiSelect, 
  disabled = false 
}: EmojiPickerComponentProps) {
  const quickEmojis = [
    '😀', '😍', '🤣', '😎', '🤔', '👍', '❤️', '🔥', 
    '🎉', '👏', '💯', '🚀', '⭐', '💪', '🙌', '✨'
  ]

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {quickEmojis.map((emoji, index) => (
        <Button
          key={index}
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 hover:bg-muted rounded-full"
          onClick={() => onEmojiSelect(emoji)}
          disabled={disabled}
          title={`Add ${emoji}`}
        >
          <span className="text-base">{emoji}</span>
        </Button>
      ))}
    </div>
  )
} 