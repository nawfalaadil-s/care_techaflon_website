import { cn, type ClassValue } from '@/lib/cn'

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'destructive'
  | 'success'

export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon'

const base =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-[color,background-color,border-color,box-shadow] duration-300 ease-out select-none focus-ring disabled:pointer-events-none disabled:opacity-50'

/** Light, mobile-sized variants — 44px touch targets on mobile. */
const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-5 text-sm sm:h-10 sm:px-4',
  lg: 'h-12 px-6 text-base sm:h-11 sm:px-6',
  icon: 'h-11 w-11 sm:h-10 sm:w-10',
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-primary-foreground shadow-card hover:bg-primary/90 active:bg-primary/80',
  secondary:
    'bg-secondary text-secondary-foreground hover:bg-secondary/80 active:bg-secondary/70',
  outline:
    'border border-input bg-transparent hover:bg-accent hover:text-accent-foreground',
  ghost: 'bg-transparent hover:bg-accent hover:text-accent-foreground',
  destructive:
    'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  success: 'bg-success text-success-foreground hover:bg-success/90',
}

export function buttonVariants(opts: {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: ClassValue
} = {}): string {
  const { variant = 'primary', size = 'md', className } = opts
  return cn(base, variantStyles[variant], sizeStyles[size], className)
}
