import React from 'react'
import ProfileMenu from './ProfileMenu'
import SystemStatus from './SystemStatus'

export default function SidebarFooter() {
  return (
    <div className="border-t border-[var(--color-app-border)]/80 px-4 pb-4 pt-3">
      <div className="space-y-3 rounded-[24px] border border-white/6 bg-white/[0.03] p-3">
        <SystemStatus />
        <div>
          <ProfileMenu />
        </div>
      </div>
    </div>
  )
}
