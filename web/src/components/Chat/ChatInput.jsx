import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Send, Square, Loader2, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const MODELS = [
  { id: 'claude-sonnet-4.5', label: 'Claude Sonnet 4.5', multiplier: 1, badge: '1x' },
  { id: 'claude-haiku-4.5', label: 'Claude Haiku 4.5', multiplier: 0.33, badge: '0.33x' },
  { id: 'claude-opus-4.5', label: 'Claude Opus 4.5', multiplier: 3, badge: '3x' },
  { id: 'gpt-5.3-codex', label: 'GPT-5.3 Codex', multiplier: 1, badge: '1x' },
  { id: 'gpt-5-mini', label: 'GPT-5 Mini', multiplier: 0, badge: 'Free' },
]

export function InputBar({ value, onChange, onSend, disabled, isSending }) {
  const textareaRef = useRef(null)
  const [selectedModel, setSelectedModel] = useState(MODELS[0].id)

  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px'
    }
  }, [value])

  useEffect(() => {
    if (!disabled) {
      textareaRef.current?.focus()
    }
  }, [disabled])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!value?.trim() || disabled || isSending) return
    onSend(value.trim())
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const currentModel = MODELS.find(m => m.id === selectedModel) || MODELS[0]

  const getBadgeColor = (multiplier) => {
    if (multiplier === 0) return 'text-emerald-400'
    if (multiplier <= 0.5) return 'text-emerald-400'
    if (multiplier >= 3) return 'text-rose-400'
    return 'text-[hsl(var(--muted-foreground))]'
  }

  return (
    <div className="bg-[hsl(var(--chat-bg))] py-6 px-4">
      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
        {/* Model selector */}
        <div className="mb-3 px-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                disabled={disabled || isSending}
                className="flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-all duration-150 hover:scale-[1.02] disabled:opacity-50"
              >
                {currentModel.label}
                <span className={cn("text-[10px] font-medium", getBadgeColor(currentModel.multiplier))}>
                  {currentModel.badge}
                </span>
                <ChevronDown className="h-3 w-3 transition-transform duration-200" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[220px]">
              {MODELS.map((model) => (
                <DropdownMenuItem
                  key={model.id}
                  onClick={() => setSelectedModel(model.id)}
                  className={cn(
                    "text-sm flex items-center justify-between py-2.5 transition-all duration-150",
                    model.id === selectedModel && "text-[hsl(var(--primary))]"
                  )}
                >
                  <span>{model.label}</span>
                  <span className={cn("text-[10px] font-medium ml-2", getBadgeColor(model.multiplier))}>
                    {model.badge}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Input area - simple underline style */}
        <div className="flex items-end gap-4">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? 'Connecting...' : 'Message OpenTop...'}
            disabled={disabled || isSending}
            rows={1}
            className={cn(
              "flex-1 resize-none bg-transparent text-base leading-relaxed",
              "placeholder:text-[hsl(var(--muted-foreground))]/60",
              "focus:outline-none",
              "disabled:opacity-50",
              "min-h-[32px] max-h-[200px]",
              "border-b border-[hsl(var(--border))]/30 pb-3",
              "focus:shadow-[0_4px_12px_-2px_hsl(var(--primary)/0.08)]",
              "transition-all duration-200 ease-out"
            )}
          />

          {isSending ? (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-10 w-10 shrink-0 mb-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-all duration-150"
              onClick={() => {/* TODO: stop */}}
            >
              <Square className="h-5 w-5 fill-current" />
            </Button>
          ) : (
            <Button
              type="submit"
              size="icon"
              disabled={!value?.trim() || disabled}
              className={cn(
                "h-10 w-10 shrink-0 mb-2 rounded-full transition-all duration-200 ease-out",
                "active:scale-95",
                value?.trim()
                  ? "bg-[hsl(var(--primary))] text-white hover:bg-[hsl(var(--primary))]/90 hover:scale-[1.03] hover:shadow-lg hover:shadow-[hsl(var(--primary))]/20"
                  : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"
              )}
            >
              <Send className="h-5 w-5" />
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}
