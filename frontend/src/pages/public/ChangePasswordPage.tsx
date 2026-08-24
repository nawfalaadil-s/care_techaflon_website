import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { authApi } from '@/api/authApi'
import { normalizeApiError } from '@/api/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Container } from '@/components/ui/container'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { DoomsdayBackground } from '@/components/effects/DoomsdayBackground'
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

/**
 * Mandatory one-time screen for team leaders still on the provisioned
 * demo password (Demo@1234). They cannot reach the portal until the
 * password is replaced.
 */
export default function ChangePasswordPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const setSession = useAuthStore((s) => s.setSession)

  const [form, setForm] = useState<FormState>(initialForm)
  const [errors, setErrors] = useState<Errors>({})
  const [submitting, setSubmitting] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  function update(patch: Partial<FormState>) {
    setForm((prev) => ({ ...prev, ...patch }))
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
      // Fresh token pair — the must_change_password flag is now cleared.
      const token = await authApi.changePassword({
        current_password: form.current_password,
        new_password: form.new_password,
      })
      setSession(token)
      navigate('/portal', { replace: true })
    } catch (error) {
      setApiError(normalizeApiError(error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative overflow-hidden">
      <DoomsdayBackground intensity="low" showWarningGlow={false} />
      <Container className="relative z-10 py-14 sm:py-20">
        <div className="mx-auto max-w-md">
          <Card className="border-primary/20 bg-surface/70 backdrop-blur-md">
            <CardContent className="p-6 sm:p-8">
              <header className="mb-6 text-center">
                <Badge variant="outline">Security checkpoint</Badge>
                <h1 className="text-glow-green mt-3 font-display text-3xl font-bold tracking-tight text-foreground">
                  Set your password
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-steel-bright">
                  Your account ({user?.email}) was created with a temporary
                  password. Choose a new one to secure your team portal.
                </p>
              </header>

              {apiError && (
                <div
                  role="alert"
                  className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
                >
                  {apiError}
                </div>
              )}

              <form onSubmit={onSubmit} noValidate className="space-y-4">
                <Field
                  label="Temporary password"
                  htmlFor="current_password"
                  required
                  error={errors.current_password}
                >
                  <Input
                    id="current_password"
                    type="password"
                    autoComplete="current-password"
                    value={form.current_password}
                    invalid={Boolean(errors.current_password)}
                    onChange={(e) => update({ current_password: e.target.value })}
                    placeholder="The temporary password you were given"
                  />
                </Field>

                <Field
                  label="New password"
                  htmlFor="new_password"
                  required
                  hint="At least 8 characters."
                  error={errors.new_password}
                >
                  <Input
                    id="new_password"
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
                  htmlFor="confirm_password"
                  required
                  error={errors.confirm_password}
                >
                  <Input
                    id="confirm_password"
                    type="password"
                    autoComplete="new-password"
                    value={form.confirm_password}
                    invalid={Boolean(errors.confirm_password)}
                    onChange={(e) => update({ confirm_password: e.target.value })}
                    placeholder="••••••••"
                  />
                </Field>

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Spinner size="sm" /> Saving…
                    </>
                  ) : (
                    'SAVE PASSWORD & CONTINUE'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </Container>
    </div>
  )
}

