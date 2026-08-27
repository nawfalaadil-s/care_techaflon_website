import { useCallback, useEffect, useState } from 'react'

import { normalizeApiError } from '@/api/client'
import {
  submissionApi,
  type Submission,
} from '@/api/submissionApi'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'

const URL_RE = /^https?:\/\/\S+\.\S+/

interface FormState {
  project_name: string
  description: string
  repo_url: string
  demo_url: string
}

type PanelState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; submission: Submission | null }

/**
 * Per-team project submission panel for the portal.
 * Loads the team's submission, offers an inline form (upsert) and withdraw.
 */
export function SubmissionPanel({ teamId }: { teamId: string }) {
  const [state, setState] = useState<PanelState>({ kind: 'loading' })
  const [editing, setEditing] = useState(false)

  const load = useCallback(async () => {
    setState({ kind: 'loading' })
    try {
      const submission = await submissionApi.get(teamId)
      setState({ kind: 'ready', submission })
    } catch (error) {
      setState({ kind: 'error', message: normalizeApiError(error).message })
    }
  }, [teamId])

  useEffect(() => {
    const id = window.setTimeout(load, 0)
    return () => window.clearTimeout(id)
  }, [load])

  if (state.kind === 'loading') {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
        <Spinner size="sm" /> Loading submission…
      </div>
    )
  }

  if (state.kind === 'error') {
    return (
      <div className="space-y-3">
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
        >
          Couldn’t load your submission. {state.message}
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()}>
          Retry
        </Button>
      </div>
    )
  }

  const submission = state.submission

  return (
    <section aria-label="Project submission" className="border-t pt-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          Project submission
          {submission && (
            <Badge variant={submission.locked ? 'info' : 'success'}>
              {submission.locked ? 'Locked — final' : 'Submitted'}
            </Badge>
          )}
        </h3>
        {submission && !editing && !submission.locked && (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            Edit
          </Button>
        )}
      </div>

      {editing || !submission ? (
        <SubmissionForm
          teamId={teamId}
          initial={
            submission
              ? {
                  project_name: submission.project_name,
                  description: submission.description,
                  repo_url: submission.repo_url,
                  demo_url: submission.demo_url ?? '',
                }
              : { project_name: '', description: '', repo_url: '', demo_url: '' }
          }
          isNew={!submission}
          onDone={(updated) => {
            setState({ kind: 'ready', submission: updated })
            setEditing(false)
          }}
          onCancel={
            submission
              ? () => setEditing(false)
              : undefined
          }
        />
      ) : (
        <SubmittedView
          submission={submission}
          onWithdrawn={() => setState({ kind: 'ready', submission: null })}
        />
      )}
    </section>
  )
}

// ---------------------------------------------------------------------------
// Read-only view + withdraw
// ---------------------------------------------------------------------------

function SubmittedView({
  submission,
  onWithdrawn,
}: {
  submission: Submission
  onWithdrawn: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function withdraw() {
    if (busy) return
    if (!window.confirm('Withdraw this submission? You can submit again later.')) return
    setBusy(true)
    setError(null)
    try {
      await submissionApi.withdraw(submission.registration_id)
      onWithdrawn()
    } catch (err) {
      setError(normalizeApiError(err).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-sm">
        <span className="font-medium">{submission.project_name}</span>
        {submission.demo_url && (
          <>
            {' · '}
            <a
              href={submission.demo_url}
              target="_blank"
              rel="noreferrer noopener"
              className="link-underline text-primary"
            >
              live demo ↗
            </a>
          </>
        )}
      </p>
      <p className="text-sm text-muted-foreground">{submission.description}</p>
      <a
        href={submission.repo_url}
        target="_blank"
        rel="noreferrer noopener"
        className="block break-all text-sm text-primary link-underline"
      >
        {submission.repo_url} ↗
      </a>
      {error && (
        <div role="alert" className="text-sm text-destructive">
          {error}
        </div>
      )}
      {submission.locked ? (
        <p className="rounded-md border border-info/40 bg-info/10 p-3 text-sm text-info-foreground">
          Your submission is final and can no longer be edited or withdrawn.
          Contact the organizers if something needs to be corrected.
        </p>
      ) : (
        <Button variant="ghost" size="sm" onClick={withdraw} disabled={busy}>
          Withdraw submission
        </Button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Create / edit form (upsert)
// ---------------------------------------------------------------------------

function SubmissionForm({
  teamId,
  initial,
  isNew,
  onDone,
  onCancel,
}: {
  teamId: string
  initial: FormState
  isNew: boolean
  onDone: (submission: Submission) => void
  onCancel?: () => void
}) {
  const [form, setForm] = useState<FormState>(initial)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [saving, setSaving] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  function update(patch: Partial<FormState>) {
    setForm((prev) => ({ ...prev, ...patch }))
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return

    const errs: Partial<Record<keyof FormState, string>> = {}
    if (form.project_name.trim().length < 2)
      errs.project_name = 'Enter the project name.'
    if (form.description.trim().length < 10)
      errs.description = 'Describe it in at least 10 characters.'
    if (!URL_RE.test(form.repo_url.trim()))
      errs.repo_url = 'Enter a valid http(s) repository URL.'
    if (form.demo_url.trim() && !URL_RE.test(form.demo_url.trim()))
      errs.demo_url = 'Enter a valid http(s) URL or leave blank.'
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setSaving(true)
    setApiError(null)
    try {
      const saved = await submissionApi.save(teamId, {
        project_name: form.project_name.trim(),
        description: form.description.trim(),
        repo_url: form.repo_url.trim(),
        demo_url: form.demo_url.trim() || null,
      })
      onDone(saved)
    } catch (error) {
      setApiError(normalizeApiError(error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} noValidate className="space-y-4">
      {apiError && (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <span className="font-semibold">Couldn’t save. </span>
          {apiError}
        </div>
      )}

      {!isNew && (
        <p className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
          Judges see your submission exactly as saved here. Keep the repo
          public until judging ends.
        </p>
      )}

      <Field
        label="Project name"
        htmlFor={`sub-name-${teamId}`}
        required
        error={errors.project_name}
      >
        <Input
          id={`sub-name-${teamId}`}
          value={form.project_name}
          invalid={Boolean(errors.project_name)}
          onChange={(e) => update({ project_name: e.target.value })}
          placeholder="e.g. Campus Navigator"
        />
      </Field>

      <Field
        label="Description"
        htmlFor={`sub-desc-${teamId}`}
        required
        error={errors.description}
        hint="What does it do? Which problem does it solve?"
      >
        <Textarea
          id={`sub-desc-${teamId}`}
          rows={4}
          value={form.description}
          invalid={Boolean(errors.description)}
          onChange={(e) => update({ description: e.target.value })}
          placeholder="A short pitch judges will read…"
        />
      </Field>

      <Field
        label="Repository URL"
        htmlFor={`sub-repo-${teamId}`}
        required
        error={errors.repo_url}
      >
        <Input
          id={`sub-repo-${teamId}`}
          type="url"
          inputMode="url"
          value={form.repo_url}
          invalid={Boolean(errors.repo_url)}
          onChange={(e) => update({ repo_url: e.target.value })}
          placeholder="https://github.com/team/project"
        />
      </Field>

      <Field
        label="Live demo URL"
        htmlFor={`sub-demo-${teamId}`}
        error={errors.demo_url}
        hint="Optional."
      >
        <Input
          id={`sub-demo-${teamId}`}
          type="url"
          inputMode="url"
          value={form.demo_url}
          invalid={Boolean(errors.demo_url)}
          onChange={(e) => update({ demo_url: e.target.value })}
          placeholder="https://your-demo.app"
        />
      </Field>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="submit" disabled={saving} className="flex-1">
          {saving ? (
            <>
              <Spinner size="sm" /> Saving…
            </>
          ) : isNew ? (
            'Submit project'
          ) : (
            'Save changes'
          )}
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}
