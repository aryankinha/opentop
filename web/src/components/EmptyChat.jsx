import React from 'react'

export default function EmptyChat({ sessionName, project }) {
  return (
    <div className="w-full max-w-2xl rounded-[32px] border border-[var(--color-app-border)] bg-[rgba(29,25,23,0.72)] px-6 py-8 text-center shadow-[0_24px_80px_rgba(0,0,0,0.24)] md:px-10">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[24px] border border-amber-400/20 bg-amber-500/10 text-amber-200">
        <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
      </div>

      <h3 className="mt-5 text-2xl font-semibold tracking-tight text-[var(--color-app-text)]">
        {sessionName || (project?.name ? `Ready for ${project.name}` : 'Start a focused conversation')}
      </h3>

      <p className="mt-3 text-sm leading-7 text-[var(--color-app-muted)]">
        {project?.path
          ? 'This session is scoped to your selected project, so OpenTop can stay grounded in that codebase.'
          : 'Ask for coding help, run tasks on your Mac, or switch into a project-specific chat when you need tighter context.'}
      </p>

      {project?.path ? (
        <div className="mt-6 rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-3 text-left">
          <p className="truncate text-sm font-medium text-[var(--color-app-text)]" title={project.name}>{project.name}</p>
          <p className="mt-1 truncate text-xs text-[var(--color-app-muted)]" title={project.path}>{project.path}</p>
        </div>
      ) : null}
    </div>
  )
}
