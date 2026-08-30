import { useCallback, useEffect, useRef, useState } from 'react'

import {
  certificatesApi,
  type ApprovedTeam,
  type ApprovedTeamsStatus,
  type CertificateHistoryItem,
  type CertificateInfo,
  type PreviewHtml,
} from '@/api/certificateApi'
import { normalizeApiError } from '@/api/client'
import { adminSettingsApi } from '@/api/settingsApi'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready' }

type Notice = { tone: 'success' | 'error' | 'info'; text: string } | null

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function AdminCertificatesPage() {
  const [state, setState] = useState<LoadState>({ kind: 'loading' })
  const [certificate, setCertificate] = useState<CertificateInfo | null>(null)
  const [teamsStatus, setTeamsStatus] = useState<ApprovedTeamsStatus | null>(null)
  const [history, setHistory] = useState<CertificateHistoryItem[]>([])
  const [preview, setPreview] = useState<PreviewHtml | null>(null)

  const [uploading, setUploading] = useState(false)
  const [activatingId, setActivatingId] = useState<string | null>(null)
  const [downloadingCertKey, setDownloadingCertKey] = useState<string | null>(null)
  const [certificatesVisible, setCertificatesVisible] = useState<boolean | null>(null)
  const [togglingVisibility, setTogglingVisibility] = useState(false)
  const [notice, setNotice] = useState<Notice>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  /** Refresh the operational data (approval audit, history). */
  const loadOperations = useCallback(async () => {
    const [teamsData, historyData] = await Promise.all([
      certificatesApi.approvedTeams(),
      certificatesApi.history(),
    ])
    setTeamsStatus(teamsData)
    setHistory(historyData.items)
  }, [])

  const load = useCallback(async () => {
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

  useEffect(() => {
    let cancelled = false
    Promise.all([
      certificatesApi.current().catch((error) => {
        const normalized = normalizeApiError(error)
        if (normalized.status !== 404) throw error
        return null
      }),
      certificatesApi.approvedTeams(),
      certificatesApi.history(),
      adminSettingsApi.get(),
    ]).then(([cert, teamsData, historyData, settingsData]) => {
      if (cancelled) return
      setCertificate(cert)
      setTeamsStatus(teamsData)
      setHistory(historyData.items)
      setCertificatesVisible(settingsData.certificates_visible)
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

  const active = !!certificate

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
        text: `Certificate "${info.filename}" is now active. Approved teams can download it from their portal immediately.`,
      })
    } catch (error) {
      setNotice({ tone: 'error', text: normalizeApiError(error).message })
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleDownloadTeamCertificate(teamId: string, email: string, name: string) {
    const key = `${teamId}:${email}`
    setDownloadingCertKey(key)
    setNotice(null)
    try {
      await certificatesApi.downloadTeamCertificate(
        teamId,
        email,
        `${name || email.split('@')[0]}-certificate.png`,
      )
      setNotice({ tone: 'success', text: `Certificate for ${name || email} downloaded.` })
    } catch (error) {
      setNotice({ tone: 'error', text: normalizeApiError(error).message })
    } finally {
      setDownloadingCertKey(null)
    }
  }

  async function handleToggleCertificatesVisible() {
    if (certificatesVisible === null) return
    const enabling = !certificatesVisible
    const confirmed = window.confirm(
      enabling
        ? 'Show certificates in every approved team’s portal? Leaders and members will immediately see and be able to download their certificates (team approval and an active certificate are still required).'
        : 'Hide certificates from team portals? Leaders and members will no longer see the certificate section until you turn this back on. Admin tools keep working.',
    )
    if (!confirmed) return
    setTogglingVisibility(true)
    setNotice(null)
    try {
      const updated = await adminSettingsApi.patch({
        certificates_visible: enabling,
      })
      setCertificatesVisible(updated.certificates_visible)
      setNotice({
        tone: 'success',
        text: enabling
          ? 'Certificates are now visible in team portals.'
          : 'Certificates hidden from team portals.',
      })
    } catch (error) {
      setNotice({ tone: 'error', text: normalizeApiError(error).message })
    } finally {
      setTogglingVisibility(false)
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
        'Deactivate the certificate? It stops being available in team portals until a new one is uploaded or an older one is re-activated. History stays available.',
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
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Certificates</CardTitle>
              <CardDescription>
                Upload one award file. It is immediately available in every
                approved team's portal.
              </CardDescription>
            </div>
            <Badge variant={active ? 'success' : 'warning'}>
              {active ? 'Active' : 'Not uploaded'}
            </Badge>
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
              title="Certificate preview"
              srcDoc={preview.html}
              sandbox="allow-same-origin"
              className="h-[420px] w-full rounded-lg border bg-white"
            />
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 p-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">Certificates visible in team portals</p>
              <p className="text-xs text-muted-foreground">
                Master switch for leaders &amp; members. When hidden, the portal
                certificate section disappears. Approval and an active
                certificate are still required on top of this switch.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge variant={certificatesVisible ? 'success' : 'outline'}>
                {certificatesVisible === null ? '…' : certificatesVisible ? 'Shown' : 'Hidden'}
              </Badge>
              <Button
                size="sm"
                variant={certificatesVisible ? 'destructive' : 'secondary'}
                disabled={togglingVisibility || certificatesVisible === null}
                onClick={() => void handleToggleCertificatesVisible()}
              >
                {togglingVisibility ? <Spinner size="sm" /> : null}
                {certificatesVisible ? 'Hide from portals' : 'Show in portals'}
              </Button>
            </div>
          </div>

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
                    Preview
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
        </CardContent>
      </Card>

      <ApprovedTeamsCard
        teamsStatus={teamsStatus}
        hasActiveCert={active}
        downloadingKey={downloadingCertKey}
        onDownloadRecipient={(teamId, email, name) =>
          void handleDownloadTeamCertificate(teamId, email, name)
        }
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
  downloadingKey,
  onDownloadRecipient,
}: {
  teamsStatus: ApprovedTeamsStatus | null
  hasActiveCert: boolean
  downloadingKey: string | null
  onDownloadRecipient: (teamId: string, email: string, name: string) => void
}) {
  const teams: ApprovedTeam[] = teamsStatus?.teams ?? []

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Approved teams</CardTitle>
            <CardDescription>
              Every approved team's participants, with a per-person certificate
              download.
            </CardDescription>
          </div>
          <Badge variant="outline">{teams.length} teams</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {teams.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
            No approved teams yet. Approve teams from the Registrations page —
            each one unlocks the certificate in its leader's portal immediately.
          </p>
        ) : (
          <ul className="space-y-3">
            {teams.map((team) => (
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
                </div>

                <ul className="mt-3 grid gap-1 sm:grid-cols-2">
                  {team.recipients.map((r) => {
                    const downloadKey = `${team.team_id}:${r.email}`
                    return (
                      <li
                        key={r.email}
                        className="flex items-center justify-between gap-2 rounded-md border border-border bg-background/60 px-2 py-1 text-xs"
                      >
                        <span className="min-w-0 truncate" title={r.email}>
                          {r.name || r.email}
                        </span>
                        <span className="flex shrink-0 items-center gap-1">
                          {hasActiveCert && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-xs"
                              title={`Download ${r.name || r.email}'s certificate`}
                              disabled={downloadingKey === downloadKey}
                              onClick={() =>
                                onDownloadRecipient(team.team_id, r.email, r.name)
                              }
                            >
                              {downloadingKey === downloadKey ? (
                                <Spinner size="sm" />
                              ) : (
                                'Download'
                              )}
                            </Button>
                          )}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </li>
            ))}
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
              Every file ever uploaded. Re-activate an older design any time.
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