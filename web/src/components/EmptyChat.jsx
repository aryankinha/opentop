import React from 'react'

export default function EmptyChat({ sessionName, project }) {
  return (
    <div className="flex flex-col items-center justify-center h-full
      text-center px-8 pb-20 mt-12">
      {project?.path ? (
        <div className="max-w-xl w-full rounded-lg border border-zinc-800/80 bg-zinc-900/50 px-3 py-2 mb-3">
          <p className="text-zinc-300 text-sm font-medium truncate" title={project.name}>{project.name}</p>
          <p className="text-zinc-500 text-xs truncate" title={project.path}>{project.path}</p>
        </div>
      ) : null}
      <p className="text-gray-400 text-sm">
        {project ? 'Ask anything about this project' : 'What can I help you with today?'}
      </p>
    </div>
  )
}
