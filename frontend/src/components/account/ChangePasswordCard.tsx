import { useState } from 'react'

import { authApi } from '@/api/authApi'
import { normalizeApiError } from '@/api/client'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { useAuthStore } from '@/store/authStore'

interface FormState {
  current_password: string
  new_password: string
  confirm_password: string
}

const initialForm: FormState = {
  current_password: '',
  new_password: '',
  confirm_password: '',
}

interface Errors {
  current_password?: string
  new_password?: string
  confirm_password?: string
}

function validate(form: FormState): Errors {
  const e: Errors = {}
  if (!form.current_password) e.current_password = 'Enter your current password.'
  if (form.new_password.length < 8)
    e.new_password = 'Use at least 8 characters.'
  else if (form.new_password === form.current_password)
    e.new_password = 'Choose a password different from the current one.'
  if (form.confirm_password !== form.new_password)
    e.confirm_password = 'Passwords do not match.'
  return e
}

/** Voluntary password change for any signed-in user (leader or admin). */
export function ChangePasswordCard() {
  const setSession = useAuthStore((s) => s.setSession)

  const [form, setForm] = useState<FormState>(initialForm)
  const [errors, setErrors] = useState<Errors>({})
  const [submitting, setSubmitting] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function update(patch: Partial<FormState>) {
    setForm((prev) => ({ ...prev, ...patch }))
    setSuccess(false)
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return

    const errs = validate(form)
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setSubmitting(true)
    setApiError(null)
    try {
      // Backend returns a fresh token pair for the same session.
      const token = await authApi.changePassword({
        current_password: form.current_password,
        new_password: form.new_password,
      })
      setSession(token)
      setForm(initialForm)
      setErrors({})
      setSuccess(true)
    } catch (error) {
      setApiError(normalizeApiError(error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Change password</CardTitle>
        <CardDescription>
          Pick something you don’t use anywhere else. You stay signed in.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {success && (
          <p
            role="status"
            className="mb-4 rounded-md border border-success/40 bg-success/10 p-3 text-sm text-success-foreground"
          >
            Password updated — your new password is active everywhere.
          </p>
        )}
        {apiError && (
          <div
            role="alert"
            className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          >
            {apiError}
          </div>
        )}

        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <Field label="Current password" htmlFor="cp-current" required error={errors.current_password}>
            <Input
              id="cp-current"
              type="password"
              autoComplete="current-password"
              value={form.current_password}
              invalid={Boolean(errors.current_password)}
              onChange={(e) => update({ current_password: e.target.value })}
              placeholder="••••••••"
            />
          </Field>

          <Field
            label="New password"
            htmlFor="cp-new"
            required
            hint="At least 8 characters."
            error={errors.new_password}
          >
            <Input
              id="cp-new"
              type="password"
              autoComplete="new-password"
              value={form.new_password}
              invalid={Boolean(errors.new_password)}
              onChange={(e) => update({ new_password: e.target.value })}
              placeholder="••••••••"
            />
          </Field>

          <Field
            label="Confirm new password"
            htmlFor="cp-confirm"
            required
            error={errors.confirm_password}
          >
            <Input
              id="cp-confirm"
              type="password"
              autoComplete="new-password"
              value={form.confirm_password}
              invalid={Boolean(errors.confirm_password)}
              onChange={(e) => update({ confirm_password: e.target.value })}
              placeholder="••••••••"
            />
          </Field>

          <Button type="submit" disabled={submitting}>
            {submitting ? (
              <>
                <Spinner size="sm" /> Updating…
              </>
            ) : (
              'Update password'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
