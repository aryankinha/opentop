import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion as Motion, AnimatePresence } from 'framer-motion'
import GeneralSettings from './Settings/GeneralSettings'
import MemorySettings from './Settings/MemorySettings'
import ConnectionSettings from './Settings/ConnectionSettings'
import PermissionSettings from './Settings/PermissionSettings'

const TABS = [
  { id: 'general', label: 'General', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"></circle>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
    </svg>
  )},
  { id: 'memory', label: 'Memory', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
    </svg>
  )},
  { id: 'connection', label: 'Connection', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
    </svg>
  )},
  { id: 'permissions', label: 'Permissions', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l7 4v5c0 5-3.5 9-7 10-3.5-1-7-5-7-10V7l7-4z"></path>
      <path d="M9.5 12.5l1.5 1.5 3.5-3.5"></path>
    </svg>
  )}
]

export default function SettingsModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('general')

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 md:items-center md:p-6">
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
        
        <Motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ type: "spring", duration: 0.4, bounce: 0.1 }}
          className="relative z-10 flex h-[92dvh] w-full min-h-0 flex-col overflow-hidden bg-[#1e1e1e] shadow-2xl md:h-auto md:max-h-[85dvh] md:max-w-4xl md:flex-row md:rounded-xl md:border md:border-zinc-800"
        >
          {/* Mobile Header (Close Button Only) */}
          <div className="md:hidden flex shrink-0 items-center justify-between border-b border-zinc-800/50 bg-[#1a1a1a] p-4">
            {/* Tab selector for mobile using native select */}
            <select 
              className="bg-transparent text-sm font-medium text-zinc-100 outline-none"
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value)}
            >
              {TABS.map(tab => <option key={tab.id} value={tab.id} className="bg-zinc-900">{tab.label}</option>)}
            </select>

            <button 
              onClick={onClose} 
              className="text-zinc-400 hover:text-zinc-100 p-1 bg-zinc-800/50 rounded-full"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          {/* Desktop Sidebar */}
          <div className="hidden w-64 shrink-0 flex-col border-r border-zinc-800/60 bg-[#1a1a1a] md:flex">
            <h2 className="px-5 py-5 text-xl font-semibold text-zinc-100">Settings</h2>
            <nav className="flex-1 px-3 space-y-1">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                    ${activeTab === tab.id 
                      ? 'bg-zinc-800/80 text-zinc-100' 
                      : 'text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200'}
                  `}
                >
                  <span className={activeTab === tab.id ? 'text-zinc-200' : 'text-zinc-500'}>
                    {tab.icon}
                  </span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Main Content Area */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-[#212121]">
             {/* Desktop Close Button */}
             <div className="hidden shrink-0 items-center justify-between border-b border-zinc-800/30 px-8 py-5 md:flex">
               <h3 className="text-lg font-medium text-zinc-100">{TABS.find(t => t.id === activeTab)?.label}</h3>
               <button 
                  onClick={onClose} 
                  className="text-zinc-500 hover:text-zinc-200 transition-colors p-1"
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
             </div>

             {/* Tab Content */}
             <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-8">
                {activeTab === 'general' && <GeneralSettings />}
                {activeTab === 'memory' && <MemorySettings />}
                {activeTab === 'connection' && <ConnectionSettings />}
                 {activeTab === 'permissions' && <PermissionSettings />}
             </div>
          </div>
        </Motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}
