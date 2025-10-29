import { cn } from '../utils/cn'
import type { ReactNode } from 'react'

interface SectionProps {
  id?: string
  className?: string
  background?: 'page' | 'subtle'
  children: ReactNode
  containerClassName?: string
  hasGrid?: boolean
}

export function Section({
  id,
  className,
  containerClassName,
  background = 'page',
  hasGrid = false,
  children,
}: SectionProps) {
  return (
    <section
      id={id}
      className={cn(
        'relative py-20 transition-colors',
        background === 'subtle' ? 'bg-subtle' : 'bg-page',
        hasGrid && 'section-grid',
        className,
      )}
    >
      <div className={cn('container mx-auto max-w-6xl px-6 sm:px-8', containerClassName)}>{children}</div>
    </section>
  )
}
