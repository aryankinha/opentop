import React from 'react'
import ProfileMenu from './ProfileMenu'
import SystemStatus from './SystemStatus'

export default function SidebarFooter({ isExpanded, onCollapsedProfileClick }) {
  return (
    <div className={`border-t border-zinc-800/50 flex-shrink-0 transition-all flex flex-col ${isExpanded ? 'px-3 py-2 gap-1.5' : 'py-2 items-center'}`}>
      {isExpanded && <SystemStatus isExpanded={isExpanded} />}
      <div className={isExpanded ? 'w-full' : ''}>
        <ProfileMenu
          isExpanded={isExpanded}
          onCollapsedClick={onCollapsedProfileClick}
        />
      </div>
    </div>
  )
}
