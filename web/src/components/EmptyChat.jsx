import React from 'react'

export default function EmptyChat({ sessionName, project }) {
  return (
    <div className="flex w-full flex-col items-center justify-center px-4 py-16 text-center">

      {/* Title */}
      <h3 className="text-xl font-medium text-gray-200">
        {sessionName ||
          (project?.name
            ? `Ready for ${project.name}`
            : 'Start a conversation')}
      </h3>

      {/* Description */}
      <p className="mt-2 max-w-md text-sm text-gray-500">
        {project?.path
          ? 'This chat is scoped to your project.'
          : 'Ask anything or run tasks on your machine.'}
      </p>

      {/* Project info (minimal) */}
      {project?.path && (
        <div className="mt-4 max-w-md truncate text-xs text-gray-500">
          {project.name} — {project.path}
        </div>
      )}
    </div>
  )
}
