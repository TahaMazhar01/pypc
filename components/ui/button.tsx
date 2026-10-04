import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

export const buttonVariants = cva(
  'pypc-button focus-ring inline-flex items-center justify-center gap-2 rounded-full font-semibold transition duration-200 disabled:pointer-events-none disabled:opacity-60',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-white hover:bg-primary-800',
        // Dark green on gold keeps AA contrast; white on gold does not.
        gold: 'bg-gold text-primary-900 hover:bg-gold-400',
        outline: 'border border-primary bg-white text-primary hover:bg-primary-50',
        ghost: 'text-primary hover:bg-primary-50',
        subtle: 'bg-primary-50 text-primary hover:bg-primary-100',
        danger: 'bg-red-600 text-white hover:bg-red-700',
        link: 'text-primary underline-offset-4 hover:underline'
      },
      size: {
        sm: 'h-9 px-3 text-sm',
        md: 'h-11 px-5 text-sm',
        lg: 'h-12 px-6 text-base',
        xl: 'h-14 px-8 text-base',
        icon: 'h-10 w-10'
      }
    },
    defaultVariants: { variant: 'primary', size: 'md' }
  }
)

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = 'button', ...props }, ref) => (
    <button ref={ref} type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  )
)

Button.displayName = 'Button'
