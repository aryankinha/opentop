import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

const models = [
  { id: 'claude-sonnet-4.5', name: 'Claude Sonnet 4.5 (default) ✓', description: '1x' },
  { id: 'claude-haiku-4.5', name: 'Claude Haiku 4.5', description: '0.33x' },
  { id: 'claude-opus-4.5', name: 'Claude Opus 4.5', description: '3x' },
  { id: 'gpt-5.3-codex', name: 'GPT-5.3-Codex', description: '1x · High reasoning' },
  { id: 'gpt-5-mini', name: 'GPT-5 mini', description: 'Fast lightweight' },
]

export function ModelSelector({ value, onChange, disabled }) {
  const selectedModel = models.find(m => m.id === value) || models[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled}
          className="h-8 px-2 text-xs gap-1 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
        >
          {selectedModel.name}
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {models.map((model) => (
          <DropdownMenuItem
            key={model.id}
            onClick={() => onChange(model.id)}
            className={cn(
              "flex flex-col items-start gap-0.5",
              value === model.id && "bg-[hsl(var(--accent))]"
            )}
          >
            <span className="font-medium">{model.name}</span>
            <span className="text-xs text-[hsl(var(--muted-foreground))]">
              {model.description}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
