import { useCallback, useEffect, useRef, useState } from 'react'

import {
  certificatesApi,
  type ApprovedTeam,
  type ApprovedTeamsStatus,
  type CertificateEmailStatus,
  type CertificateHistoryItem,
  type CertificateInfo,
  type DeliverySummary,
  type PreviewHtml,
} from '@/api/certificateApi'
import { normalizeApiError } from '@/api/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready' }

type Notice = { tone: 'success' | 'error' | 'info'; text: string } | null

/** Auto-refresh interval for delivery stats (ms). */
const REFRESH_INTERVAL = 15_000

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const RECIPIENT_VARIANT: Record<string, 'success' | 'destructive' | 'outline'> = {
  sent: 'success',
  logged: 'success',
  failed: 'destructive',
  unsent: 'outline',
}

export default function AdminCertificatesPage() {
  const [state, setState] = useState<LoadState>({ kind: 'loading' })
  const [certificate, setCertificate] = useState<CertificateInfo | null>(null)
  const [emailStatus, setEmailStatus] = useState<CertificateEmailStatus | null>(null)
  const [summary, setSummary] = useState<DeliverySummary | null>(null)
  const [teamsStatus, setTeamsStatus] = useState<ApprovedTeamsStatus | null>(null)
  const [history, setHistory] = useState<CertificateHistoryItem[]>([])
  const [preview, setPreview] = useState<PreviewHtml | null>(null)

  const [uploading, setUploading] = useState(false)
  const [sending, setSending] = useState(false)
  const [resending, setResending] = useState(false)
  const [sendingTeamId, setSendingTeamId] = useState<string | null>(null)
  const [activatingId, setActivatingId] = useState<string | null>(null)
  const [notice, setNotice] = useState<Notice>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  /** Refresh the operational data (delivery stats, audit, history). */
  const loadOperations = useCallback(async () => {
    const [emailData, summaryData, teamsData, historyData] = await Promise.all([
      certificatesApi.emailStatus(),
      certificatesApi.deliverySummary(),
      certificatesApi.approvedTeams(),
      certificatesApi.history(),
    ])
    setEmailStatus(emailData)
    setSummary(summaryData)
    setTeamsStatus(teamsData)
    setHistory(historyData.items)
  }, [])

  const load = useCallback(async () => {
    // NOTE: no synchronous setState here — the initial state is already
    // 'loading' and refreshing keeps prior content visible. This keeps
    // mount-time effects free of cascading renders (oxlint set-state-in-effect).
    try {
      let cert: CertificateInfo | null = null
      try {
        cert = await certificatesApi.current()
      } catch (error) {
        const normalized = normalizeApiError(error)
        if (normalized.status !== 404) throw error
      }
      setCertificate(cert)
      await loadOperations()
      setState({ kind: 'ready' })
    } catch (error) {
      setState({ kind: 'error', message: normalizeApiError(error).message })
    }
  }, [loadOperations])

  // Mount-time fetch expressed as promise chains (not via `load`) so no
  // setState runs synchronously within the effect (oxlint set-state-in-effect).
  useEffect(() => {
    let cancelled = false
    Promise.all([
      certificatesApi.current().catch((error) => {
        const normalized = normalizeApiError(error)
        if (normalized.status !== 404) throw error
        return null
      }),
      certificatesApi.emailStatus(),
      certificatesApi.deliverySummary(),
      certificatesApi.approvedTeams(),
      certificatesApi.history(),
    ]).then(([cert, emailData, summaryData, teamsData, historyData]) => {
      if (cancelled) return
      setCertificate(cert)
      setEmailStatus(emailData)
      setSummary(summaryData)
      setTeamsStatus(teamsData)
      setHistory(historyData.items)
      setState({ kind: 'ready' })
    }).catch((error) => {
      if (!cancelled) {
        setState({ kind: 'error', message: normalizeApiError(error).message })
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      void loadOperations()
    }, REFRESH_INTERVAL)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [loadOperations])

  const active = !!certificate
  const failedCount = teamsStatus?.failed_mail_count ?? 0
  const allDelivered =
    active && !!summary &&
    summary.planned_recipients > 0 &&
    summary.delivered_percent >= 100 &&
    failedCount === 0

  const transportBadge = (() => {
    if (!emailStatus) return <Badge variant="info">Checking…</Badge>
    if (emailStatus.email.mode === 'delivering' && emailStatus.email.transport) {
      return <Badge variant="success">Delivering via {emailStatus.email.transport}</Badge>
    }
    if (!emailStatus.email.enabled) return <Badge variant="warning">Email disabled</Badge>
    return <Badge variant="warning">Log mode — no provider</Badge>
  })()

  const logModeNotice =
    emailStatus && emailStatus.email.mode !== 'delivering'
      ? 'No email provider is configured, so mails are recorded but never sent. Set Gmail / Brevo / Mailjet / SMTP credentials to deliver for real.'
      : null

  async function handleUpload(file: File) {
    setUploading(true)
    setNotice(null)
    try {
      const info = await certificatesApi.upload(file)
      setCertificate(info)
      setPreview(null)
      await loadOperations()
      setNotice({
        tone: 'success',
        text: `Certificate "${info.filename}" is now active. Approved teams can download it from their portal immediately — emails are sent only when you press "Send All Certificates".`,
      })
    } catch (error) {
      setNotice({ tone: 'error', text: normalizeApiError(error).message })
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleSendAll() {
    if (!certificate) return
    const confirmText =
      'Send certificates to all eligible approved teams?\n\n' +
      'This will send the active certificate to recipients who have not ' +
      'already received it. Portal downloads are unaffected.'
    if (!window.confirm(confirmText)) return
    setSending(true)
    setNotice(null)
    try {
      const result = await certificatesApi.sendAll()
      setNotice({
        tone: 'success',
        text:
          `Certificates processed successfully.\n` +
          `Teams processed: ${result.teams_processed}\n` +
          `Emails sent: ${result.emails_queued}\n` +
          `Already sent: ${result.already_sent}\n` +
          `Failed: ${result.failed}`,
      })
      await loadOperations()
    } catch (error) {
      setNotice({ tone: 'error', text: normalizeApiError(error).message })
    } finally {
      setSending(false)
    }
  }

  async function handleSendTeam(teamId: string, teamName: string) {
    if (!certificate) return
    if (
      !window.confirm(
        `Send the active certificate to "${teamName}" participants? Already-covered recipients are skipped.`,
      )
    )
      return
    setSendingTeamId(teamId)
    setNotice(null)
    try {
      await certificatesApi.sendTeam(certificate.id, teamId)
      setNotice({ tone: 'success', text: `Certificate queued for ${teamName}.` })
      await loadOperations()
    } catch (error) {
      setNotice({ tone: 'error', text: normalizeApiError(error).message })
    } finally {
      setSendingTeamId(null)
    }
  }

  async function handleResendFailed() {
    if (!window.confirm('Retry every failed certificate email for the active certificate?')) return
    setResending(true)
    setNotice(null)
    try {
      const result = await certificatesApi.resendFailed()
      setNotice({
        tone: result.now_delivered > 0 ? 'success' : 'info',
        text: `Retried ${result.retried} message(s): ${result.now_delivered} delivered, ${result.still_failed.length} still failing.`,
      })
      await loadOperations()
    } catch (error) {
      setNotice({ tone: 'error', text: normalizeApiError(error).message })
    } finally {
      setResending(false)
    }
  }

  async function loadPreview(): Promise<PreviewHtml | null> {
    if (!certificate) return null
    try {
      const data = await certificatesApi.previewHtml(certificate.id)
      setPreview(data)
      return data
    } catch (error) {
      setNotice({ tone: 'error', text: normalizeApiError(error).message })
      return null
    }
  }

  async function handleDeactivate() {
    if (
      !window.confirm(
        'Deactivate the certificate? Approvals stop emailing files until a new one is uploaded. History stays available.',
      )
    )
      return
    setNotice(null)
    try {
      await certificatesApi.deactivate()
      setCertificate(null)
      setPreview(null)
      await loadOperations()
      setNotice({ tone: 'success', text: 'Certificate deactivated.' })
    } catch (error) {
      setNotice({ tone: 'error', text: normalizeApiError(error).message })
    }
  }

  async function handleActivate(item: CertificateHistoryItem) {
    if (item.active || activatingId) return
    if (!window.confirm(`Make "${item.filename}" the active certificate?`)) return
    setActivatingId(item.id)
    setNotice(null)
    try {
      const info = await certificatesApi.activate(item.id)
      setCertificate(info)
      setPreview(null)
      await loadOperations()
      setNotice({ tone: 'success', text: `"${info.filename}" is now the active certificate.` })
    } catch (error) {
      setNotice({ tone: 'error', text: normalizeApiError(error).message })
    } finally {
      setActivatingId(null)
    }
  }

  if (state.kind === 'loading') {
    return (
      <div className="flex justify-center py-16" role="status">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (state.kind === 'error') {
    return (
      <Card className="border-destructive/40">
        <CardContent className="py-8 text-center text-sm text-destructive">
          {state.message}
          <div className="mt-4">
            <Button variant="outline" onClick={() => void load()}>
              Try again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {logModeNotice ? (
        <Card className="border-warning/40 bg-warning/5">
          <CardContent className="flex items-start gap-3 py-4 text-sm text-warning">
            <span aria-hidden>⚠️</span>
            <p>{logModeNotice}</p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Certificates</CardTitle>
              <CardDescription>
                Upload one award file. It is immediately available to every
                approved team's portal. Certificate emails are only sent when
                you press “Send All Certificates” below — approval never
                emails anything by itself.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {transportBadge}
              <Badge variant={active ? 'success' : 'warning'}>
                {active ? 'Active' : 'Not uploaded'}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {notice ? (
            <p
              role="status"
              className={`whitespace-pre-line rounded-lg border px-3 py-2 text-sm ${
                notice.tone === 'success'
                  ? 'border-success/40 bg-success/10 text-success'
                  : notice.tone === 'info'
                    ? 'border-info/40 bg-info/10 text-info'
                    : 'border-destructive/40 bg-destructive/10 text-destructive'
              }`}
            >
              {notice.text}
            </p>
          ) : null}

          {certificate ? (
            <dl className="grid gap-2 rounded-lg border border-border bg-muted/40 p-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">File</dt>
                <dd className="break-all font-medium">{certificate.filename}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Type / size</dt>
                <dd className="font-medium">
                  {certificate.content_type} · {formatBytes(certificate.size_bytes)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Uploaded by</dt>
                <dd className="break-all font-medium">{certificate.uploaded_by ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Uploaded at</dt>
                <dd className="font-medium">
                  {new Date(certificate.created_at).toLocaleString()}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
              No certificate uploaded yet. PDF, PNG or JPEG up to 5 MB.
            </p>
          )}

          {certificate && certificate.content_type.startsWith('image/') ? (
            <CertificateImage
              certificateId={certificate.id}
              filename={certificate.filename}
            />
          ) : null}

          {certificate && !certificate.content_type.startsWith('image/') && preview?.html ? (
            <iframe
              title="Certificate mail preview"
              srcDoc={preview.html}
              sandbox="allow-same-origin"
              className="h-[420px] w-full rounded-lg border bg-white"
            />
          ) : null}

          {summary && summary.certificate_id ? (
            <DeliveryStats
              summary={summary}
              failedCount={failedCount}
              allDelivered={allDelivered}
            />
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? <Spinner className="h-4 w-4" /> : null}
              {active ? 'Replace certificate' : 'Upload certificate'}
            </Button>
            {certificate ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => void certificatesApi.download(certificate)}
                >
                  Download
                </Button>
                {!certificate.content_type.startsWith('image/') && (
                  <Button variant="outline" onClick={() => void loadPreview()}>
                    Preview mail
                  </Button>
                )}
                <Button
                  variant="secondary"
                  className="font-semibold"
                  disabled={sending}
                  onClick={() => void handleSendAll()}
                >
                  {sending ? <Spinner className="h-4 w-4" /> : null}
                  Send All Certificates
                </Button>
                {failedCount > 0 && (
                  <Button
                    variant="destructive"
                    disabled={resending}
                    onClick={() => void handleResendFailed()}
                  >
                    {resending ? <Spinner className="h-4 w-4" /> : null}
                    Retry failed ({failedCount})
                  </Button>
                )}
                <Button variant="ghost" onClick={() => void handleDeactivate()}>
                  Deactivate
                </Button>
              </>
            ) : null}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void handleUpload(file)
              }}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            How it works: approving a team only makes the certificate available
            in their leader's portal. “Send All Certificates” below is the
            only action that queues certificate emails through the outbox.
            Delivery failures surface below and can be retried right here.
            Nobody receives the same certificate twice.
          </p>
        </CardContent>
      </Card>

      <ApprovedTeamsCard
        teamsStatus={teamsStatus}
        hasActiveCert={active}
        sendingTeamId={sendingTeamId}
        onSendTeam={(teamId, teamName) => void handleSendTeam(teamId, teamName)}
      />

      <HistoryCard
        items={history}
        activatingId={activatingId}
        currentId={certificate?.id ?? null}
        onActivate={(item) => void handleActivate(item)}
      />
    </div>
  )
}

/* Helper components (module-level; the main page renders them). */

function DeliveryStats({
  summary,
  failedCount,
  allDelivered,
}: {
  summary: DeliverySummary
  failedCount: number
  allDelivered: boolean
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <p className="font-medium">Email delivery</p>
          <p className="text-xs text-muted-foreground">
            Certificate status: Available to approved teams (portal download
            is independent of email and never requires it).
          </p>
        </div>
        {allDelivered ? (
          <Badge variant="success">Everyone covered</Badge>
        ) : failedCount > 0 ? (
          <Badge variant="destructive">{failedCount} failed</Badge>
        ) : null}
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            failedCount > 0 ? 'bg-warning' : 'bg-success'
          }`}
          style={{ width: `${Math.min(100, Math.max(2, summary.delivered_percent))}%` }}
        />
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-xs sm:grid-cols-5">
        <div>
          <dt className="text-muted-foreground">Teams approved</dt>
          <dd className="font-semibold">{summary.approved_teams}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Planned</dt>
          <dd className="font-semibold">{summary.planned_recipients}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Delivered</dt>
          <dd className="font-semibold text-success">{summary.delivered_recipients}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Queued</dt>
          <dd className="font-semibold">{summary.queued}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Failed</dt>
          <dd className={`font-semibold ${failedCount > 0 ? 'text-destructive' : ''}`}>
            {failedCount}
          </dd>
        </div>
      </dl>
    </div>
  )
}

function CertificateImage({
  certificateId,
  filename,
}: {
  certificateId: string
  filename: string
}) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let objectUrl: string | null = null
    let cancelled = false
    certificatesApi
      .fetchBlob(certificateId)
      .then((blob) => {
        if (!cancelled) {
          objectUrl = URL.createObjectURL(blob)
          setUrl(objectUrl)
        }
      })
      .catch(() => setUrl(null))
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [certificateId])

  if (!url) {
    return (
      <div className="flex justify-center rounded-lg border border-border bg-muted/30 py-8">
        <Spinner />
      </div>
    )
  }
  return (
    <img
      src={url}
      alt={filename || 'certificate preview'}
      className="max-h-[420px] w-full rounded-lg border border-border bg-muted/30 object-contain"
    />
  )
}

function ApprovedTeamsCard({
  teamsStatus,
  hasActiveCert,
  sendingTeamId,
  onSendTeam,
}: {
  teamsStatus: ApprovedTeamsStatus | null
  hasActiveCert: boolean
  sendingTeamId: string | null
  onSendTeam: (teamId: string, teamName: string) => void
}) {
  const teams: ApprovedTeam[] = teamsStatus?.teams ?? []

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Approved teams audit</CardTitle>
            <CardDescription>
              Who has received the active certificate by EMAIL, per team — and
              send to any single team that is missing it. Portal availability is
              untouched by these counts.
            </CardDescription>
          </div>
          {teamsStatus && (
            <div className="flex items-center gap-2">
              <Badge variant="success">{teamsStatus.delivered} delivered</Badge>
              <Badge variant="outline">{teams.length} teams</Badge>
              {teamsStatus.failed_mail_count > 0 && (
                <Badge variant="destructive">{teamsStatus.failed_mail_count} failed</Badge>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {teams.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
            No approved teams yet. Approve teams from the Registrations page —
            each one unlocks the certificate in its leader's portal immediately.
            “Send All Certificates” above distributes them by email.
          </p>
        ) : (
          <ul className="space-y-3">
            {teams.map((team) => {
              const missing = team.recipient_total - team.delivered
              const fullyCovered = missing === 0
              return (
                <li
                  key={team.team_id}
                  className="rounded-lg border border-border bg-muted/40 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{team.team_name}</p>
                      <p className="text-xs text-muted-foreground">
                        TEAM ID: {team.team_id} · {team.theme}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant={fullyCovered ? 'success' : 'warning'}>
                        {team.delivered}/{team.recipient_total} received
                      </Badge>
                      {!fullyCovered && hasActiveCert && (
                        <Button
                          size="sm"
                          disabled={sendingTeamId === team.team_id}
                          onClick={() => onSendTeam(team.team_id, team.team_name)}
                        >
                          {sendingTeamId === team.team_id ? (
                            <>
                              <Spinner size="sm" /> Sending…
                            </>
                          ) : (
                            'Send to team'
                          )}
                        </Button>
                      )}
                    </div>
                  </div>

                  <ul className="mt-3 grid gap-1 sm:grid-cols-2">
                    {team.recipients.map((r) => (
                      <li
                        key={r.email}
                        className="flex items-center justify-between gap-2 rounded-md border border-border bg-background/60 px-2 py-1 text-xs"
                      >
                        <span className="min-w-0 truncate" title={r.email}>
                          {r.name || r.email}
                        </span>
                        <Badge variant={RECIPIENT_VARIANT[r.status] ?? 'outline'}>
                          {r.status}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function HistoryCard({
  items,
  activatingId,
  currentId,
  onActivate,
}: {
  items: CertificateHistoryItem[]
  activatingId: string | null
  currentId: string | null
  onActivate: (item: CertificateHistoryItem) => void
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Certificate history</CardTitle>
            <CardDescription>
              Every file ever uploaded, with how many participants received it.
              Re-activate an older design any time.
            </CardDescription>
          </div>
          <Badge variant="outline">{items.length} total</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
            Nothing uploaded yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => {
              const isActive = item.active || item.id === currentId
              return (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {item.filename}{' '}
                      {isActive && <Badge variant="success">Active</Badge>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(item.size_bytes)} · uploaded{' '}
                      {new Date(item.created_at).toLocaleString()} by{' '}
                      {item.uploaded_by ?? '—'}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant={item.recipients_failed > 0 ? 'destructive' : 'outline'}>
                      {item.recipients_sent} sent
                      {item.recipients_failed > 0
                        ? ` · ${item.recipients_failed} failed`
                        : ''}
                    </Badge>
                    {!isActive && (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={activatingId === item.id}
                        onClick={() => onActivate(item)}
                      >
                        {activatingId === item.id ? (
                          <>
                            <Spinner size="sm" /> Activating…
                          </>
                        ) : (
                          'Make active'
                        )}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        void certificatesApi.download(item).catch(() => undefined)
                      }
                    >
                      Download
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

