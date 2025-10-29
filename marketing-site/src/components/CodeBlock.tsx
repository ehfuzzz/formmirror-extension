import { useCallback, useState, type CSSProperties } from 'react'
import Highlight, { defaultProps } from 'prism-react-renderer'
import theme from 'prism-react-renderer/themes/nightOwlLight'
import { Check, Copy } from 'lucide-react'
import { cn } from '../utils/cn'

interface CodeBlockProps {
  code: string
  language?: string
}

export function CodeBlock({ code, language = 'tsx' }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy', error)
    }
  }, [code])

  return (
    <div className="group relative rounded-xl border border-blue-100 bg-blue-50/40">
      <button
        type="button"
        onClick={handleCopy}
        className="absolute right-4 top-4 inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-3 py-1 text-xs font-semibold text-blue-700 opacity-0 shadow-sm transition group-hover:opacity-100 focus-visible:opacity-100"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? 'Copied' : 'Copy'}
      </button>
      <Highlight {...defaultProps} theme={theme} code={code.trim()} language={language as any}>
        {({ className, style, tokens, getLineProps, getTokenProps }) => (
          <pre
            className={cn('overflow-x-auto rounded-xl p-6 text-sm leading-relaxed', className)}
            style={style as CSSProperties}
          >
            {tokens.map((line, i) => (
              <div key={i} {...getLineProps({ line, key: i })}>
                {line.map((token, key) => (
                  <span key={key} {...getTokenProps({ token, key })} />
                ))}
              </div>
            ))}
          </pre>
        )}
      </Highlight>
    </div>
  )
}
