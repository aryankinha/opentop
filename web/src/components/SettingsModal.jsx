import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import GeneralSettings from './settings/GeneralSettings'
import MemorySettings from './settings/MemorySettings'
import ConnectionSettings from './settings/ConnectionSettings'

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
  )}
]

export default function SettingsModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('general')

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ type: "spring", duration: 0.4, bounce: 0.1 }}
          className="relative w-full h-full md:h-auto md:max-w-4xl bg-[#1e1e1e] md:border border-zinc-800 md:rounded-xl shadow-2xl flex flex-col md:flex-row overflow-hidden z-10"
          style={{ maxHeight: '85vh' }}
        >
          {/* Mobile Header (Close Button Only) */}
          <div className="md:hidden flex items-center justify-between p-4 border-b border-zinc-800/50 bg-[#1a1a1a]">
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
          <div className="hidden md:flex flex-col w-64 border-r border-zinc-800/60 bg-[#1a1a1a] flex-shrink-0">
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
          <div className="flex-1 flex flex-col min-w-0 bg-[#212121]">
             {/* Desktop Close Button */}
             <div className="hidden md:flex justify-between items-center px-8 py-5 flex-shrink-0 border-b border-zinc-800/30">
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
             <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
                {activeTab === 'general' && <GeneralSettings />}
                {activeTab === 'memory' && <MemorySettings />}
                {activeTab === 'connection' && <ConnectionSettings />}
             </div>
          </div>
        </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}
