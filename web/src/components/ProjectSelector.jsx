import React, { useState, useRef, useEffect } from 'react'

export default function ProjectSelector({ projects = [], selectedProject = null, onSelect }) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)

  const activeProject = selectedProject || null

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative pt-1 pb-1" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors bg-zinc-800/60 hover:bg-zinc-800/90 border border-zinc-700/60"
        aria-expanded={open}
      >
        <span className={`min-w-0 text-left ${activeProject ? 'text-zinc-200' : 'text-zinc-400'}`}>
          {activeProject ? (
            <span className="block min-w-0">
              <span className="block truncate text-zinc-200">{activeProject.name}</span>
              <span className="block truncate text-[11px] text-zinc-500">{activeProject.path}</span>
            </span>
          ) : (
            'Select Project'
          )}
        </span>
        <svg 
          width="12" height="12" viewBox="0 0 24 24" fill="none" 
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" 
          className={`text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-full max-h-56 overflow-y-auto bg-zinc-800/95 backdrop-blur border border-zinc-700/60 rounded-xl shadow-xl py-1 z-50">
          {projects.length === 0 ? (
            <p className="px-3 py-2 text-xs text-zinc-500">
              No projects found. Add a project below.
            </p>
          ) : (
            projects.map((project) => {
              const isActive = activeProject?.path === project.path

              return (
                <button
                  key={project.path}
                  className={`w-full text-left px-3 py-2 transition-colors ${isActive ? 'bg-zinc-700/60' : 'hover:bg-zinc-700/40'}`}
                  onClick={() => {
                    onSelect?.(project)
                    setOpen(false)
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className={`text-sm font-medium truncate ${isActive ? 'text-zinc-100' : 'text-zinc-200'}`}>
                        {project.name}
                      </p>
                      <p className="text-[11px] text-zinc-500 truncate">{project.path}</p>
                    </div>
                    {isActive && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400 shrink-0">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    )}
                  </div>
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
