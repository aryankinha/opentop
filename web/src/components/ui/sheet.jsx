import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

const Sheet = ({ children, open, onOpenChange }) => {
  if (!open) return null
  
  return (
    <div className="fixed inset-0 z-50">
      {children}
    </div>
  )
}

const SheetOverlay = React.forwardRef(({ className, onClick, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "fixed inset-0 bg-black/60 backdrop-blur-sm animate-fade-in",
      className
    )}
    onClick={onClick}
    {...props}
  />
))
SheetOverlay.displayName = "SheetOverlay"

const sheetVariants = {
  top: "inset-x-0 top-0 border-b animate-slide-in-bottom",
  bottom: "inset-x-0 bottom-0 border-t animate-slide-in-bottom",
  left: "inset-y-0 left-0 h-full w-3/4 max-w-sm border-r animate-slide-in-left",
  right: "inset-y-0 right-0 h-full w-3/4 max-w-sm border-l animate-slide-in-right",
}

const SheetContent = React.forwardRef(({ 
  className, 
  children, 
  side = "right", 
  onClose,
  ...props 
}, ref) => (
  <>
    <SheetOverlay onClick={onClose} />
    <div
      ref={ref}
      className={cn(
        "fixed z-50 flex flex-col gap-4 bg-[hsl(var(--background))] p-6 shadow-lg",
        sheetVariants[side],
        className
      )}
      {...props}
    >
      {children}
      {onClose && (
        <button
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
      )}
    </div>
  </>
))
SheetContent.displayName = "SheetContent"

const SheetHeader = ({ className, ...props }) => (
  <div
    className={cn("flex flex-col space-y-2 text-center sm:text-left", className)}
    {...props}
  />
)
SheetHeader.displayName = "SheetHeader"

const SheetFooter = ({ className, ...props }) => (
  <div
    className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
    {...props}
  />
)
SheetFooter.displayName = "SheetFooter"

const SheetTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("text-lg font-semibold text-[hsl(var(--foreground))]", className)}
    {...props}
  />
))
SheetTitle.displayName = "SheetTitle"

const SheetDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-[hsl(var(--muted-foreground))]", className)}
    {...props}
  />
))
SheetDescription.displayName = "SheetDescription"

export {
  Sheet,
  SheetOverlay,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
