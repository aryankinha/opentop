import { useEffect, useState } from 'react'
import Prism from 'prismjs'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-jsx'
import 'prismjs/components/prism-tsx'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-css'
import 'prismjs/components/prism-yaml'
import 'prismjs/components/prism-sql'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'

const languageMap = {
  js: 'javascript',
  ts: 'typescript',
  py: 'python',
  sh: 'bash',
  shell: 'bash',
  md: 'markdown',
  yml: 'yaml',
}

export function CodeBlock({ code, language = '' }) {
  const [copied, setCopied] = useState(false)

  const normalizedLang = languageMap[language?.toLowerCase()] || language?.toLowerCase() || 'plaintext'

  useEffect(() => {
    Prism.highlightAll()
  }, [code])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Copy failed:', err)
    }
  }

  return (
    <div className="my-3 rounded-lg overflow-hidden border border-[hsl(var(--code-border))] bg-[hsl(var(--code-bg))]">
      {/* Header with copy button */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[hsl(var(--code-header-bg))] border-b border-[hsl(var(--code-border))]">
        <span className="text-[11px] text-[hsl(var(--muted-foreground))]">
          {language || 'code'}
        </span>
        <button
          className={cn(
            "flex items-center gap-1 text-[11px] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors",
            copied && "text-[hsl(var(--success))]"
          )}
          onClick={handleCopy}
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      {/* Code */}
      <div className="overflow-x-auto">
        <pre className={`language-${normalizedLang} !my-0 !p-3 text-[13px]`}>
          <code className={`language-${normalizedLang}`}>{code}</code>
        </pre>
      </div>
    </div>
  )
}
