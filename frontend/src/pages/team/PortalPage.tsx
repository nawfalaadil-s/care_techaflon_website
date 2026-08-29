import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { normalizeApiError } from '@/api/client'
import { certificatesApi, type MyCertificate, type MineParticipants } from '@/api/certificateApi'
import { teamApi, type TeamRecord } from '@/api/teamApi'
import { Badge } from '@/components/ui/badge'
import type { BadgeVariant } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Container } from '@/components/ui/container'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { THEME_LABELS, THEME_OPTIONS } from '@/data/tracks'
import {
  TEAM_STATUS_LABELS,
  TEAM_STATUS_VARIANT,
  type TeamStatus,
} from '@/data/status'
import { SubmissionPanel } from '@/components/team/SubmissionPanel'
import { useAuthStore } from '@/store/authStore'

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready' }

const STATUS_FALLBACK_VARIANT: BadgeVariant = 'warning'

function statusVariant(status: string): BadgeVariant {
  return TEAM_STATUS_VARIANT[status as TeamStatus] ?? STATUS_FALLBACK_VARIANT
}

function statusLabel(status: string): string {
  return TEAM_STATUS_LABELS[status as TeamStatus] ?? status
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function PortalPage() {
  const user = useAuthStore((s) => s.user)
  const [state, setState] = useState<LoadState>({ kind: 'loading' })
  const [team, setTeam] = useState<TeamRecord | null>(null)
  const [editing, setEditing] = useState(false)

  const refresh = useCallback(async () => {
    try {
      setTeam(await teamApi.getMine())
      setState({ kind: 'ready' })
    } catch (error) {
      setState({ kind: 'error', message: normalizeApiError(error).message })
    }
  }, [])

  // Mount-time fetch as a promise chain — avoids synchronous setState inside
  // the effect (oxlint set-state-in-effect). `refresh` stays for manual retry.
  useEffect(() => {
    let cancelled = false
    teamApi
      .getMine()
      .then((data) => {
        if (!cancelled) {
          setTeam(data)
          setState({ kind: 'ready' })
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setState({ kind: 'error', message: normalizeApiError(error).message })
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  function onSaved(updated: TeamRecord) {
    setTeam(updated)
    setEditing(false)
  }

  // Statements are private — the backend delivers the allocated title.
  const allocatedTitle = team?.problem_statement_title ?? null

  return (
    <Container className="py-8 sm:py-12">
      <div className="mx-auto max-w-3xl space-y-6">
        <header>
          <Badge variant="outline">Team portal</Badge>
          <h1 className="mt-3 text-3xl sm:text-4xl">My team</h1>
          <p className="mt-2 text-muted-foreground">
            Manage your TechAFlon registration
            {user ? `, ${user.full_name.split(' ')[0]}` : ''}.
          </p>
        </header>

        {state.kind === 'loading' && (
          <div className="flex items-center justify-center gap-3 py-16 text-muted-foreground">
            <Spinner /> Loading your team…
          </div>
        )}

        {state.kind === 'error' && (
          <Card>
            <CardContent className="pt-6">
              <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                <span className="font-semibold">Couldn’t load your team. </span>
                {state.message}
              </div>
              <Button variant="outline" onClick={() => void refresh()} className="mt-4">
                Try again
              </Button>
            </CardContent>
          </Card>
        )}

        {state.kind === 'ready' && !team && (
          <Card>
            <CardHeader>
              <CardTitle>No team yet</CardTitle>
              <CardDescription>
                You haven’t registered a team. Register with your account email
                ({user?.email}) as the leader and it will appear here.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                to="/register"
                className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 sm:h-10"
              >
                Register a team
              </Link>
            </CardContent>
          </Card>
        )}

        {state.kind === 'ready' && team && (
          <>
            {editing ? (
              <TeamEditForm team={team} onSaved={onSaved} onCancel={() => setEditing(false)} />
            ) : (
              <TeamCard
                team={team}
                allocatedTitle={allocatedTitle}
                onEdit={() => setEditing(true)}
              />
            )}
          </>
        )}
      </div>
    </Container>
  )
}

// ---------------------------------------------------------------------------
// Read-only team card
// ---------------------------------------------------------------------------

function TeamCard({
  team,
  allocatedTitle,
  onEdit,
}: {
  team: TeamRecord
  allocatedTitle: string | null
  onEdit: () => void
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-xl">{team.team_name}</CardTitle>
            <CardDescription>
              <span className="font-mono">{team.team_id}</span> · Registered{' '}
              {formatDate(team.registered_at)} ·{' '}
              {THEME_LABELS[team.theme] ?? team.theme}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={statusVariant(team.status)}>
              {statusLabel(team.status)}
            </Badge>
            <Button variant="outline" size="sm" onClick={onEdit}>
              Edit
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="divide-y divide-border rounded-lg border">
          <Row k="Leader" v={`${team.leader_name} (${team.leader_email})`} />
          <Row
            k="Register no."
            v={team.leader_register_number || '—'}
          />
          <Row k="Department / Year" v={`${team.leader_department} · ${team.leader_year}`} />
          <Row k="Venue" v={`${team.venue_name} — ${team.venue_location}`} />
          <Row
            k="Problem statement"
            v={
              allocatedTitle
                ? `${allocatedTitle} (allocated ${formatDate(team.ps_allocated_at ?? team.updated_at)})`
                : 'To be allocated by organizers'
            }
          />
        </dl>

        <div>
          <h4 className="mb-2 text-sm font-semibold">
            Members ({team.members.length + 1})
          </h4>
          <ul className="space-y-1.5">
            <li className="text-sm">
              <span className="font-medium">{team.leader_name}</span>
              <span className="text-muted-foreground">
                {' '}
                · {team.leader_email} · leader
              </span>
            </li>
            {team.members.map((m, i) => (
              <li key={`${m.email}-${i}`} className="text-sm">
                <span className="font-medium">{m.name}</span>
                <span className="text-muted-foreground">
                  {' '}
                  · {m.email} · {m.department} · {m.year}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <SubmissionPanel teamId={team.id} />

        <CertificateSection status={team.status} />
        <TeamMembersCertificatesSection status={team.status} />
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Participation certificate (leader downloads once team is approved)
// ---------------------------------------------------------------------------

type CertState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready'; data: MyCertificate }
  | { kind: 'error'; message: string }

function openCertificateTab(html: string): void {
  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const opened = window.open(url, '_blank', 'noopener')
  // If the browser blocked the popup keep the URL alive in this tab.
  if (!opened) {
    window.location.href = url
    return
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

function CertificateSection({ status }: { status: string }) {
  const [state, setState] = useState<CertState>(
    status === 'approved' ? { kind: 'loading' } : { kind: 'idle' },
  )
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  useEffect(() => {
    if (status !== 'approved') return
    let cancelled = false
    void certificatesApi
      .my()
      .then((data) => {
        if (!cancelled) setState({ kind: 'ready', data })
      })
      .catch((error) => {
        if (!cancelled) {
          setState({ kind: 'error', message: normalizeApiError(error).message })
        }
      })
    return () => {
      cancelled = true
    }
  }, [status])

  async function handleDownload(fallbackName?: string) {
    setDownloading(true)
    setDownloadError(null)
    try {
      await certificatesApi.downloadMine(fallbackName)
    } catch (error) {
      setDownloadError(normalizeApiError(error).message)
    } finally {
      setDownloading(false)
    }
  }

  if (status !== 'approved') {
    return (
      <div className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
        🏅 <span className="font-medium">Participation certificate</span> —
        unlocks here as soon as organizers approve your team.
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-muted/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold">🏅 Participation certificate</h4>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Same award file every participant of your team receives by email.
          </p>
        </div>

        {(state.kind === 'loading' || state.kind === 'idle') && (
          <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <Spinner size="sm" /> Checking availability…
          </span>
        )}

        {state.kind === 'ready' && state.data.available && (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              size="sm"
              variant="secondary"
              disabled={downloading}
              onClick={() => void handleDownload(state.data.download_filename ?? undefined)}
            >
              {downloading ? (
                <>
                  <Spinner size="sm" /> Downloading…
                </>
              ) : (
                'Download certificate'
              )}
            </Button>
            {state.data.preview_html && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => openCertificateTab(state.data.preview_html ?? '')}
              >
                View & print
              </Button>
            )}
          </div>
        )}
      </div>

      {state.kind === 'ready' && !state.data.available && (
        <p className="mt-3 rounded-md border border-warning/40 bg-warning/10 p-2 text-xs text-warning">
          {state.data.reason === 'no_active_certificate'
            ? 'Organizers haven’t published the final certificate design yet — check back soon.'
            : 'Your certificate becomes available after approval.'}
        </p>
      )}

      {state.kind === 'error' && (
        <p
          role="alert"
          className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive"
        >
          Couldn’t load certificate info. {state.message}
        </p>
      )}

      {downloadError && (
        <p
          role="alert"
          className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive"
        >
          Download failed. {downloadError}
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Inline edit form (backend supports team_name + theme edits only)
// ---------------------------------------------------------------------------

interface EditFormState {
  team_name: string
  theme: string
}

function TeamEditForm({
  team,
  onSaved,
  onCancel,
}: {
  team: TeamRecord
  onSaved: (updated: TeamRecord) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState<EditFormState>({
    team_name: team.team_name,
    theme: team.theme,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  function update(patch: Partial<EditFormState>) {
    setForm((prev) => ({ ...prev, ...patch }))
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return

    const errs: Record<string, string> = {}
    if (form.team_name.trim().length < 2) errs.team_name = 'Enter a team name.'
    if (!form.theme) errs.theme = 'Select a theme.'
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setSaving(true)
    setApiError(null)
    try {
      onSaved(
        await teamApi.update(team.id, {
          team_name: form.team_name.trim(),
          theme: form.theme,
        }),
      )
    } catch (error) {
      setApiError(normalizeApiError(error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Editing “{team.team_name}”</CardTitle>
        <CardDescription>
          Changes are visible to organizers immediately.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={save} noValidate className="space-y-4">
          {apiError && (
            <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              <span className="font-semibold">Couldn’t save. </span>
              {apiError}
            </div>
          )}

          <Field label="Team name" htmlFor={`edit-name-${team.id}`} required error={errors.team_name}>
            <Input
              id={`edit-name-${team.id}`}
              value={form.team_name}
              invalid={Boolean(errors.team_name)}
              onChange={(e) => update({ team_name: e.target.value })}
            />
          </Field>

          <Field label="Theme" htmlFor={`edit-theme-${team.id}`} required error={errors.theme}>
            <Select
              id={`edit-theme-${team.id}`}
              value={form.theme}
              invalid={Boolean(errors.theme)}
              onChange={(e) => update({ theme: e.target.value })}
            >
              {THEME_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>

          <p className="text-xs text-muted-foreground">
            Member details can’t be changed after registration — contact the
            organizers if something needs fixing.
          </p>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? (
                <>
                  <Spinner size="sm" /> Saving…
                </>
              ) : (
                'Save changes'
              )}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <dt className="shrink-0 text-sm font-medium text-muted-foreground">{k}</dt>
      <dd className="break-all text-right text-sm text-foreground">{v}</dd>
    </div>
  )
}


// ---------------------------------------------------------------------------
// Team members certificates (leader can download for all members)
// ---------------------------------------------------------------------------

type MembersCertState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready'; data: MineParticipants }
  | { kind: 'error'; message: string }

function TeamMembersCertificatesSection({ status }: { status: string }) {
  const [state, setState] = useState<MembersCertState>(
    status === 'approved' ? { kind: 'loading' } : { kind: 'idle' },
  )
  const [downloading, setDownloading] = useState<string | null>(null)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    if (status !== 'approved') return
    let cancelled = false
    void certificatesApi
      .myParticipants()
      .then((data) => {
        if (!cancelled) setState({ kind: 'ready', data })
      })
      .catch((error) => {
        if (!cancelled) {
          setState({ kind: 'error', message: normalizeApiError(error).message })
        }
      })
    return () => {
      cancelled = true
    }
  }, [status, reload])

  if (status !== 'approved') return null

  if (state.kind === 'loading') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team Members Certificates</CardTitle>
          <CardDescription>Loading participants…</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Spinner />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (state.kind === 'error') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team Members Certificates</CardTitle>
          <CardDescription>Couldn't load participants</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {state.message}
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setDownloadError(null)
              setState({ kind: 'loading' })
              setReload((n) => n + 1)
            }}
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (state.kind !== 'ready') return null

  const { available, participants } = state.data

  async function handleDownload(email: string) {
    setDownloading(email)
    setDownloadError(null)
    try {
      await certificatesApi.downloadParticipantCertificate(email)
    } catch (error) {
      setDownloadError(normalizeApiError(error).message)
    } finally {
      setDownloading(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Members Certificates</CardTitle>
        <CardDescription>
          Download personalized certificates for all your team members.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!available && (
          <p className="text-sm text-muted-foreground">
            Certificates are not available yet — organizers must upload the
            certificate template first.
          </p>
        )}
        {available && participants.length === 0 && (
          <p className="text-sm text-muted-foreground">No participants found.</p>
        )}
        {downloadError && (
          <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {downloadError}
          </div>
        )}
        <ul className="space-y-3">
          {participants.map((participant) => (
            <li key={participant.email} className="flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {participant.name}
                  {participant.is_leader && <Badge className="ml-2" variant="outline">You</Badge>}
                </p>
                <p className="truncate text-sm text-muted-foreground">{participant.email}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {participant.personalized_png_available && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownload(participant.email)}
                    disabled={downloading === participant.email}
                  >
                    {downloading === participant.email ? (
                      <>
                        <Spinner size="sm" /> Downloading…
                      </>
                    ) : (
                      'Download PNG'
                    )}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => openCertificateTab(participant.personalized_html)}
                >
                  Preview
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
