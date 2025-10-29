import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../utils/cn'
import type { ButtonHTMLAttributes, AnchorHTMLAttributes } from 'react'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        primary: 'bg-blue-600 text-white shadow-sm hover:bg-blue-700',
        secondary:
          'border border-blue-200 bg-white text-blue-700 hover:border-blue-300 hover:bg-blue-50',
        tertiary:
          'text-blue-700 underline-offset-2 hover:text-blue-800 hover:underline focus-visible:ring-0',
      },
      size: {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-base',
        lg: 'px-6 py-3 text-lg',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
)

type ButtonBaseProps = {
  as?: 'button'
} & ButtonHTMLAttributes<HTMLButtonElement>

type LinkButtonProps = {
  as: 'a'
} & AnchorHTMLAttributes<HTMLAnchorElement>

type ButtonProps = (ButtonBaseProps | LinkButtonProps) & VariantProps<typeof buttonVariants>

export function Button({ as = 'button', className, variant, size, ...props }: ButtonProps) {
  const Comp: any = as
  if (as === 'button') {
    const buttonProps = props as ButtonHTMLAttributes<HTMLButtonElement>
    return (
      <Comp
        type={buttonProps.type ?? 'button'}
        className={cn(buttonVariants({ variant, size }), className)}
        {...buttonProps}
      />
    )
  }

  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />
}

export { buttonVariants }
