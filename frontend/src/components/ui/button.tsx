import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from 'react'
import { Link } from 'react-router-dom'

import { buttonVariants } from '@/components/ui/button-variants'
import type { ButtonSize, ButtonVariant } from '@/components/ui/button-variants'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonVariants({ variant, size, className })}
      {...props}
    />
  )
}

export interface LinkButtonProps
  extends AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  to: string
}

/** Button that renders a react-router <Link>. */
export function LinkButton({
  variant = 'primary',
  size = 'md',
  className,
  to,
  children,
  ...props
}: LinkButtonProps) {
  return (
    <Link
      to={to}
      className={buttonVariants({ variant, size, className })}
      {...props}
    >
      {children}
    </Link>
  )
}
