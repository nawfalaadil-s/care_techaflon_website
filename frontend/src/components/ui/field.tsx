import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

interface FieldProps {
  label?: string
  htmlFor?: string
  required?: boolean
  hint?: string
  error?: string
  children: ReactNode
  className?: string
}

/**
 * Composable form field: label + control + hint/error messaging.
 * Group multiple fields with <form className="space-y-4">.
 */
export function Field({
  label,
  htmlFor,
  required,
  hint,
  error,
  children,
  className,
}: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="text-sm font-medium text-foreground"
        >
          {label}
          {required && (
            <span aria-hidden="true" className="ml-0.5 text-destructive">
              *
            </span>
          )}
        </label>
      )}
      {children}
      {error ? (
        <p
          role="alert"
          className="text-sm text-destructive"
          id={htmlFor ? `${htmlFor}-error` : undefined}
        >
          {error}
        </p>
      ) : hint ? (
        <p className="text-sm text-muted-foreground" id={htmlFor ? `${htmlFor}-hint` : undefined}>
          {hint}
        </p>
      ) : null}
    </div>
  )
}
