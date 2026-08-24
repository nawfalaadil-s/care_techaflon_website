import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { authApi } from '@/api/authApi'
import { normalizeApiError } from '@/api/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import { Container } from '@/components/ui/container'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { useAuthStore } from '@/store/authStore'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface FormState {
  email: string
  password: string
}

const initialForm: FormState = { email: '', password: '' }

interface Errors {
  email?: string
  password?: string
}

function validate(form: FormState): Errors {
  const errors: Errors = {}
  if (!EMAIL_RE.test(form.email))
    errors.email = 'Enter a valid email address.'
  if (!form.password)
    errors.password = 'Enter your password.'
  return errors
}

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const setSession = useAuthStore((s) => s.setSession)

  const [form, setForm] = useState<FormState>(initialForm)
  const [errors, setErrors] = useState<Errors>({})
  const [submitting, setSubmitting] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  const from =
    (location.state as { from?: string } | null)?.from ?? '/portal'

  // Already signed in? Straight to the portal.
  useEffect(() => {
    if (user) navigate(from, { replace: true })
  }, [user, from, navigate])

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
      const token = await authApi.login({
        email: form.email.trim().toLowerCase(),
        password: form.password,
      })
      setSession(token)

      // Team leaders signing in with the provisioned demo password
      // (Demo@1234) must replace it before using the portal.
      if (token.user.must_change_password) {
        navigate('/change-password', { replace: true })
        return
      }

      navigate(from, { replace: true })
    } catch (error) {
      setApiError(normalizeApiError(error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Container className="py-8 sm:py-12">
      <div className="mx-auto max-w-md">
        <header className="mb-8 text-center">
          <Badge variant="outline">Team portal</Badge>
          <h1 className="mt-3 text-3xl sm:text-4xl">Welcome back</h1>
          <p className="mt-2 text-muted-foreground">
            Sign in to manage your team and submission.
          </p>
        </header>

        <Card>
          <CardContent className="pt-6">
            {apiError && (
              <div
                role="alert"
                className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
              >
                <span className="font-semibold">Something went wrong. </span>
                {apiError}
              </div>
            )}

            <form onSubmit={onSubmit} noValidate className="space-y-4">
              <Field label="Email" htmlFor="email" required error={errors.email}>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  invalid={Boolean(errors.email)}
                  onChange={(e) => update({ email: e.target.value })}
                  placeholder="you@college.edu"
                />
              </Field>

              <Field label="Password" htmlFor="password" required error={errors.password}>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={form.password}
                  invalid={Boolean(errors.password)}
                  onChange={(e) => update({ password: e.target.value })}
                  placeholder="••••••••"
                />
              </Field>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <Spinner size="sm" /> Signing in…
                  </>
                ) : (
                  'Sign in'
                )}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Accounts are created automatically when you{' '}
              <strong>register your team</strong> — sign in with the leader
              email you registered. First time? Use the temporary password{' '}
              <span className="font-mono font-semibold text-foreground">
                Demo@1234
              </span>{' '}
              and set your own right after.{' '}
              <Link to="/register" className="link-underline font-medium text-primary">
                Team registration
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </Container>
  )
}
