import React from 'react'
import ProfileMenu from './ProfileMenu'
import SystemStatus from './SystemStatus'

export default function SidebarFooter() {
  return (
    <div className="mt-auto shrink-0 border-t border-white/5 px-3 py-3">
      <div className="mb-3">
        <SystemStatus />
      </div>
      <ProfileMenu />
    </div>
  )
}
