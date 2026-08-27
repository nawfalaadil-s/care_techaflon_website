import { useCallback, useEffect, useState } from 'react'

import { normalizeApiError } from '@/api/client'
import { adminSettingsApi, type SiteSettings, type SiteSettingsUpdate } from '@/api/settingsApi'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready' }

export default function AdminSettingsPage() {
  const [state, setState] = useState<LoadState>({ kind: 'loading' })
  const [form, setForm] = useState<SiteSettings>({
    event_name: '',
    tagline: '',
    registration_open: true,
    registration_deadline: null,
    contact_email: '',
    announcement: '',
  })
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<{ kind: 'success' | 'error'; message: string } | null>(null)

  const load = useCallback(async () => {
    setState({ kind: 'loading' })
    try {
      const data = await adminSettingsApi.get()
      setForm(data)
      setState({ kind: 'ready' })
    } catch (error) {
      setState({ kind: 'error', message: normalizeApiError(error).message })
    }
  }, [])

  useEffect(() => {
    const id = window.setTimeout(load, 0)
    return () => window.clearTimeout(id)
  }, [load])

  function updateField<K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setSaveStatus(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return
    setSaving(true)
    setSaveStatus(null)

    try {
      const payload: SiteSettingsUpdate = {
        event_name: form.event_name.trim(),
        tagline: form.tagline.trim(),
        registration_open: form.registration_open,
        registration_deadline: form.registration_deadline || null,
        contact_email: form.contact_email.trim(),
        announcement: form.announcement.trim(),
      }
      const updated = await adminSettingsApi.patch(payload)
      setForm(updated)
      setSaveStatus({ kind: 'success', message: 'Settings saved successfully.' })
    } catch (error) {
      setSaveStatus({ kind: 'error', message: normalizeApiError(error).message })
    } finally {
      setSaving(false)
    }
  }

  if (state.kind === 'loading') {
    return (
      <div className="flex items-center justify-center gap-3 py-16 text-muted-foreground">
        <Spinner /> Loading settings…
      </div>
    )
  }

  if (state.kind === 'error') {
    return (
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          >
            Couldn't load settings. {state.message}
          </div>
          <Button variant="outline" onClick={() => void load()}>
            Try again
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h2 className="font-display text-xl font-bold">Platform & Event Settings</h2>
        <p className="text-sm text-muted-foreground">
          Configure event details, open/close registrations, and broadcast announcement banners.
        </p>
      </div>

      {saveStatus && (
        <div
          role="alert"
          className={`rounded-md p-3.5 text-sm ${
            saveStatus.kind === 'success'
              ? 'border border-success/40 bg-success/10 text-success'
              : 'border border-destructive/40 bg-destructive/10 text-destructive'
          }`}
        >
          {saveStatus.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Event identity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Event Identity</CardTitle>
            <CardDescription>Primary titles and contact points displayed on public pages.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Event Name" htmlFor="event_name" required>
              <Input
                id="event_name"
                value={form.event_name}
                onChange={(e) => updateField('event_name', e.target.value)}
                placeholder="e.g. HackFest 2026"
                required
              />
            </Field>

            <Field label="Tagline / Short Subtitle" htmlFor="tagline">
              <Input
                id="tagline"
                value={form.tagline}
                onChange={(e) => updateField('tagline', e.target.value)}
                placeholder="e.g. 48 hours to build something that matters"
              />
            </Field>

            <Field label="Contact Email" htmlFor="contact_email" required>
              <Input
                id="contact_email"
                type="email"
                value={form.contact_email}
                onChange={(e) => updateField('contact_email', e.target.value)}
                placeholder="contact@hackfest.edu"
                required
              />
            </Field>
          </CardContent>
        </Card>

        {/* Registration Lifecycle */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Registration Lifecycle</CardTitle>
            <CardDescription>Control team intake and set optional deadline dates.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Allow New Registrations</span>
                  <Badge variant={form.registration_open ? 'success' : 'destructive'}>
                    {form.registration_open ? 'Open' : 'Closed'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  When closed, the public registration form displays a paused notice and the API rejects submissions.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={form.registration_open}
                onClick={() => updateField('registration_open', !form.registration_open)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  form.registration_open ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow-lg ring-0 transition-transform ${
                    form.registration_open ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <Field
              label="Registration Deadline (Optional)"
              htmlFor="registration_deadline"
              hint="Format: YYYY-MM-DD (Leave empty for open-ended registration)."
            >
              <Input
                id="registration_deadline"
                type="date"
                value={form.registration_deadline ?? ''}
                onChange={(e) => updateField('registration_deadline', e.target.value || null)}
              />
            </Field>
          </CardContent>
        </Card>

        {/* Announcement Banner */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Live Announcement Banner</CardTitle>
            <CardDescription>
              Optional message shown prominently across all platform pages. Leave empty to hide.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Announcement Text" htmlFor="announcement">
              <Textarea
                id="announcement"
                value={form.announcement}
                onChange={(e) => updateField('announcement', e.target.value)}
                placeholder="e.g. Workshop schedule announced! Submissions freeze at 12:00 PM tomorrow."
                rows={3}
              />
            </Field>
          </CardContent>
        </Card>

        {/* Action button bar */}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="submit" disabled={saving} className="min-w-[140px]">
            {saving ? (
              <>
                <Spinner size="sm" /> Saving…
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
