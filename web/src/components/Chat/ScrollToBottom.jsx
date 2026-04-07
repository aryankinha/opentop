import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function ScrollToBottom({ visible, onClick, unreadCount = 0 }) {
  return (
    <div
      className={cn(
        "absolute bottom-28 left-1/2 -translate-x-1/2 transition-all duration-300 z-10",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8 pointer-events-none"
      )}
    >
      <Button
        variant="secondary"
        size="sm"
        onClick={onClick}
        className="rounded-full shadow-xl px-5 py-2.5 gap-2 bg-[hsl(var(--card))] border-2 border-[hsl(var(--primary))] hover:bg-[hsl(var(--secondary))] hover:scale-105 transition-all"
      >
        <ChevronDown className="h-4 w-4 text-[hsl(var(--primary))]" />
        {unreadCount > 0 ? (
          <span className="font-medium">{unreadCount} new message{unreadCount !== 1 ? 's' : ''}</span>
        ) : (
          <span className="font-medium">Back to bottom</span>
        )}
      </Button>
    </div>
  )
}
