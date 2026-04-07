import { useState } from 'react'
import { Copy, RotateCcw, Pencil, Check, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export function MessageActions({ 
  message, 
  onRegenerate, 
  onEdit,
  className 
}) {
  const [copied, setCopied] = useState(false)
  const isUser = message.role === 'user'

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content)
      setCopied(true)
      toast.success('Copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      toast.error('Failed to copy')
    }
  }

  return (
    <div className={cn(
      "flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity",
      className
    )}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {copied ? 'Copied!' : 'Copy message'}
        </TooltipContent>
      </Tooltip>

      {isUser && onEdit && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onEdit(message)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Edit message</TooltipContent>
        </Tooltip>
      )}

      {!isUser && onRegenerate && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onRegenerate(message)}
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Regenerate response</TooltipContent>
        </Tooltip>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleCopy}>
            <Copy className="h-4 w-4 mr-2" />
            Copy text
          </DropdownMenuItem>
          {isUser && onEdit && (
            <DropdownMenuItem onClick={() => onEdit(message)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
          )}
          {!isUser && onRegenerate && (
            <DropdownMenuItem onClick={() => onRegenerate(message)}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Regenerate
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
