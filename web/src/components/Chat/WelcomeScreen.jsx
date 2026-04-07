import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Send, ChevronDown, Sparkles, Plus } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

const MODELS = [
  { id: 'claude-sonnet-4.5', label: 'Sonnet 4.5', multiplier: 1, badge: '1x' },
  { id: 'claude-haiku-4.5', label: 'Haiku 4.5', multiplier: 0.33, badge: '0.33x' },
  { id: 'claude-opus-4.5', label: 'Opus 4.5', multiplier: 3, badge: '3x' },
  { id: 'gpt-5.3-codex', label: 'GPT-5.3', multiplier: 1, badge: '1x' },
  { id: 'gpt-5-mini', label: 'GPT-5 Mini', multiplier: 0, badge: 'Free' },
]

export function WelcomeScreen({ inputValue, onInputChange, onSend, disabled, isSending }) {
  const textareaRef = useRef(null)
  const [selectedModel, setSelectedModel] = useState(MODELS[0].id)
  const [greeting, setGreeting] = useState('What can I help you with today?')
  const [username, setUsername] = useState(null)

  // Fetch user info on mount
  useEffect(() => {
    fetchUserInfo()
  }, [])

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px'
    }
  }, [inputValue])

  // Focus on mount
  useEffect(() => {
    if (!disabled) {
      textareaRef.current?.focus()
    }
  }, [disabled])

  const fetchUserInfo = async () => {
    try {
      const data = await api.getUser()
      if (data.username) {
        setUsername(data.username)
        setGreeting(`Welcome, ${data.username}`)
      } else if (data.projectContext) {
        setGreeting(`Continue building: ${data.projectContext}`)
      }
    } catch {
      // Keep default greeting
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!inputValue?.trim() || disabled || isSending) return
    onSend(inputValue.trim())
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
    <div className="flex flex-col h-full items-center justify-center px-6">
      <div className="w-full max-w-2xl">
        {/* Greeting */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Sparkles className="h-10 w-10 text-[hsl(var(--primary))]" />
          </div>
          <h1 className="text-4xl font-light tracking-tight text-[hsl(var(--foreground))]">
            {greeting}
          </h1>
        </div>

        {/* Input Box */}
        <form onSubmit={handleSubmit}>
          <div className={cn(
            "rounded-3xl border border-[hsl(var(--border))]/30 bg-[hsl(var(--secondary))]/60 backdrop-blur-md",
            "focus-within:shadow-[0_0_0_4px_hsl(var(--primary)/0.08),0_8px_24px_-4px_hsl(var(--primary)/0.06)]",
            "transition-all duration-200 ease-out",
            "shadow-lg shadow-black/5"
          )}>
            {/* Input area */}
            <div className="px-5 pt-4 pb-2">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => onInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="How can I help you today?"
                disabled={disabled || isSending}
                rows={1}
                className={cn(
                  "w-full resize-none bg-transparent text-base leading-relaxed",
                  "placeholder:text-[hsl(var(--muted-foreground))]/50",
                  "focus:outline-none",
                  "disabled:opacity-50",
                  "min-h-[28px] max-h-[150px]",
                  "transition-all duration-150"
                )}
              />
            </div>

            {/* Bottom controls */}
            <div className="flex items-center justify-between px-4 pb-3 pt-1">
              {/* Left side - attachment */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:scale-[1.05] transition-all duration-150 active:scale-95"
                disabled={disabled}
              >
                <Plus className="h-5 w-5" />
              </Button>

              {/* Right side - model selector + send */}
              <div className="flex items-center gap-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      disabled={disabled || isSending}
                      className="flex items-center gap-1.5 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-all duration-150 hover:scale-[1.02] disabled:opacity-50"
                    >
                      {currentModel.label}
                      <ChevronDown className="h-4 w-4 transition-transform duration-200" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-[180px]">
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

                {/* Status indicator / Send button */}
                <div className="relative">
                  {inputValue?.trim() ? (
                    <Button
                      type="submit"
                      size="icon"
                      disabled={disabled || isSending}
                      className="h-9 w-9 rounded-full bg-[hsl(var(--primary))] text-white hover:bg-[hsl(var(--primary))]/90 hover:scale-[1.05] hover:shadow-lg hover:shadow-[hsl(var(--primary))]/20 active:scale-95 transition-all duration-200 ease-out"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  ) : (
                    <div className="h-9 w-9 flex items-center justify-center">
                      <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
