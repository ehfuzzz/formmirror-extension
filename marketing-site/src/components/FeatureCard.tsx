import type { ReactNode } from 'react'
import { cn } from '../utils/cn'

interface FeatureCardProps {
  title: string
  description: string
  icon?: ReactNode
  className?: string
  emphasis?: 'default' | 'highlight'
}

export function FeatureCard({ title, description, icon, className, emphasis = 'default' }: FeatureCardProps) {
  return (
    <div
      className={cn(
        'relative flex h-full flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md',
        emphasis === 'highlight' && 'border-blue-200 shadow-md',
        className,
      )}
    >
      {icon && <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-700">{icon}</div>}
      <div>
        <h3 className="text-lg font-semibold text-ink">{title}</h3>
        <p className="mt-2 text-sm text-steel">{description}</p>
      </div>
    </div>
  )
}
