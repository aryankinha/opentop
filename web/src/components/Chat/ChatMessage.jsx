import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { CodeBlock } from './CodeBlock'
import { Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Message({ message }) {
  const isUser = message.role === 'user'
  const isSystem = message.role === 'system'

  if (isSystem) {
    return (
      <div className="flex justify-center py-6">
        <span className="text-xs text-[hsl(var(--muted-foreground))]">
          {message.isCompacted ? 'Context compacted' : message.content}
        </span>
      </div>
    )
  }

  return (
    <div className={cn(
      "group py-6 px-6",
      isUser && "bg-[hsl(var(--user-message-bg))]"
    )}>
      <div className="max-w-3xl mx-auto">
        {/* Role label with model indicator */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-medium text-[hsl(var(--muted-foreground))]">
            {isUser ? 'You' : 'OpenTop'}
          </span>
          {!isUser && message.model && (
            <ModelBadge model={message.model} />
          )}
        </div>

        {/* Content */}
        <div className="text-base leading-7">
          <MessageContent content={message.content} />
        </div>

        {/* Copy button - only on hover for assistant */}
        {!isUser && <CopyButton text={message.content} />}
      </div>
    </div>
  )
}

// Model badge component
function ModelBadge({ model }) {
  const getModelInfo = (modelId) => {
    const models = {
      'claude-sonnet-4.5': { label: 'Sonnet 4.5', multiplier: 1 },
      'claude-haiku-4.5': { label: 'Haiku 4.5', multiplier: 0.33 },
      'claude-opus-4.5': { label: 'Opus 4.5', multiplier: 3 },
      'gpt-5.3-codex': { label: 'GPT-5.3', multiplier: 1 },
      'gpt-5-mini': { label: 'GPT-5 Mini', multiplier: 0 },
    }
    return models[modelId] || { label: modelId, multiplier: 1 }
  }

  const getBadgeColor = (multiplier) => {
    if (multiplier === 0) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    if (multiplier <= 0.5) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    if (multiplier >= 3) return 'bg-rose-500/10 text-rose-400 border-rose-500/20'
    return 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] border-[hsl(var(--border))]'
  }

  const info = getModelInfo(model)
  
  return (
    <span className={cn(
      "text-[10px] px-1.5 py-0.5 rounded border",
      getBadgeColor(info.multiplier)
    )}>
      {info.label}
    </span>
  )
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Copy failed:', err)
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] flex items-center gap-1.5"
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5" />
          Copied
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5" />
          Copy
        </>
      )}
    </button>
  )
}

function MessageContent({ content }) {
  if (!content) return null

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ node, inline, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '')
          const language = match ? match[1] : ''
          
          if (!inline && (match || String(children).includes('\n'))) {
            return (
              <CodeBlock
                code={String(children).replace(/\n$/, '')}
                language={language}
              />
            )
          }
          
          return (
            <code
              className="px-1.5 py-0.5 rounded bg-[hsl(var(--code-bg))] text-[13px] font-mono"
              {...props}
            >
              {children}
            </code>
          )
        },
        a({ children, ...props }) {
          return (
            <a
              className="text-[hsl(var(--primary))] hover:underline"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            >
              {children}
            </a>
          )
        },
        ul({ children, ...props }) {
          return <ul className="list-disc pl-6 my-3 space-y-2" {...props}>{children}</ul>
        },
        ol({ children, ...props }) {
          return <ol className="list-decimal pl-6 my-3 space-y-2" {...props}>{children}</ol>
        },
        p({ children, ...props }) {
          return <p className="mb-4 last:mb-0" {...props}>{children}</p>
        },
        h1({ children, ...props }) {
          return <h1 className="text-xl font-semibold mt-6 mb-3" {...props}>{children}</h1>
        },
        h2({ children, ...props }) {
          return <h2 className="text-lg font-semibold mt-5 mb-3" {...props}>{children}</h2>
        },
        h3({ children, ...props }) {
          return <h3 className="text-base font-semibold mt-4 mb-2" {...props}>{children}</h3>
        },
        blockquote({ children, ...props }) {
          return (
            <blockquote
              className="border-l-3 border-[hsl(var(--border))] pl-4 my-4 text-[hsl(var(--muted-foreground))] italic"
              {...props}
            >
              {children}
            </blockquote>
          )
        },
        table({ children, ...props }) {
          return (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full text-sm" {...props}>{children}</table>
            </div>
          )
        },
        th({ children, ...props }) {
          return (
            <th className="border border-[hsl(var(--border))] px-3 py-2 bg-[hsl(var(--muted))] text-left text-xs font-medium" {...props}>
              {children}
            </th>
          )
        },
        td({ children, ...props }) {
          return <td className="border border-[hsl(var(--border))] px-3 py-2 text-sm" {...props}>{children}</td>
        },
        hr(props) {
          return <hr className="my-6 border-[hsl(var(--border))]" {...props} />
        },
      }}
    >
      {content}
    </ReactMarkdown>
  )
}
