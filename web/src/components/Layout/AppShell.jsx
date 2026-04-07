import { useState, useEffect } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { SettingsDrawer } from '@/components/Settings/SettingsDrawer'
import { PermissionModal } from '@/components/Permissions/PermissionModal'
import { Toaster } from '@/components/ui/toaster'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useApp } from '@/context/AppContext'

export function AppShell({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const { permissionRequests, approvePermission, denyPermission } = useApp()

  // Check for mobile breakpoint
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const currentPermission = permissionRequests[0]

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-dvh overflow-hidden">
        {/* Sidebar - persistent on desktop, drawer on mobile */}
        {!isMobile && (
          <Sidebar 
            isOpen={true} 
            isMobile={false}
            onSettingsClick={() => setIsSettingsOpen(true)}
          />
        )}

        {/* Mobile sidebar drawer */}
        {isMobile && (
          <Sidebar
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            isMobile={true}
          />
        )}

        {/* Main content area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile header */}
          {isMobile && (
            <Header
              onMenuClick={() => setIsSidebarOpen(true)}
              onSettingsClick={() => setIsSettingsOpen(true)}
            />
          )}

          {/* Main content */}
          <main className="flex-1 overflow-hidden bg-[hsl(var(--chat-bg))]">
            {children}
          </main>
        </div>

        {/* Settings Drawer */}
        <SettingsDrawer
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        />

        {/* Permission Modal */}
        {currentPermission && (
          <PermissionModal
            request={currentPermission}
            onApprove={() => approvePermission(currentPermission.id)}
            onDeny={() => denyPermission(currentPermission.id)}
            pendingCount={permissionRequests.length}
          />
        )}

        {/* Toast notifications */}
        <Toaster position="bottom-center" />
      </div>
    </TooltipProvider>
  )
}
