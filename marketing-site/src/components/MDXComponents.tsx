import type { MDXProviderProps } from '@mdx-js/react'
import { CodeBlock } from './CodeBlock'

export const mdxComponents: MDXProviderProps['components'] = {
  h1: (props) => <h1 className="mb-6 text-3xl font-semibold text-ink" {...props} />,
  h2: (props) => <h2 className="mt-10 mb-4 text-2xl font-semibold text-ink" {...props} />,
  h3: (props) => <h3 className="mt-6 mb-3 text-xl font-semibold text-ink" {...props} />,
  p: (props) => <p className="my-4 text-base text-steel" {...props} />,
  ul: (props) => <ul className="my-4 list-disc space-y-2 pl-6 text-steel" {...props} />,
  ol: (props) => <ol className="my-4 list-decimal space-y-2 pl-6 text-steel" {...props} />,
  li: (props) => <li className="leading-relaxed" {...props} />,
  a: (props) => (
    <a className="text-blue-700 underline-offset-2 hover:underline" target="_blank" rel="noreferrer" {...props} />
  ),
  code: (props) => <code className="rounded bg-blue-50 px-1 py-0.5 text-sm text-blue-800" {...props} />,
  pre: ({ children }) => {
    if (typeof children === 'string') {
      return <CodeBlock code={children} />
    }
    return <div>{children}</div>
  },
}
