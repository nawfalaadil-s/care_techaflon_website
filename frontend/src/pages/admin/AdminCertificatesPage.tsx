import { useCallback, useEffect, useRef, useState } from 'react'

import { certificatesApi, type CertificateInfo } from '@/api/certificateApi'
import { normalizeApiError } from '@/api/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready' }

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function AdminCertificatesPage() {
  const [state, setState] = useState<LoadState>({ kind: 'loading' })
  const [certificate, setCertificate] = useState<CertificateInfo | null>(null)
  const [uploading, setUploading] = useState(false)
  const [sending, setSending] = useState(false)
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setState({ kind: 'loading' })
    try {
      const info = await certificatesApi.current()
      setCertificate(info)
      setState({ kind: 'ready' })
    } catch (error) {
      // 404 simply means nothing uploaded yet — that is a ready state too.
      const normalized = normalizeApiError(error)
      if (normalized.status === 404) {
        setCertificate(null)
        setState({ kind: 'ready' })
      } else {
        setState({ kind: 'error', message: normalized.message })
      }
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function handleUpload(file: File) {
    setUploading(true)
    setNotice(null)
    try {
      const info = await certificatesApi.upload(file)
      setCertificate(info)
      setNotice({
        tone: 'success',
        text: `Certificate "${info.filename}" is now active. Approvals will email it automatically.`,
      })
    } catch (error) {
      setNotice({ tone: 'error', text: normalizeApiError(error).message })
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleSendAll() {
    if (!window.confirm('Email the active certificate to every approved team? Teams and members who already received it are skipped.')) return
    setSending(true)
    setNotice(null)
    try {
      const result = await certificatesApi.sendAll()
      setNotice({
        tone: 'success',
        text: `Queued for ${result.teams_queued} of ${result.approved_teams} approved teams (duplicates skipped automatically).`,
      })
    } catch (error) {
      setNotice({ tone: 'error', text: normalizeApiError(error).message })
    } finally {
      setSending(false)
    }
  }

  async function handleDeactivate() {
    if (!window.confirm('Deactivate the certificate? Approvals will stop emailing files until a new one is uploaded.')) return
    try {
      await certificatesApi.deactivate()
      setCertificate(null)
      setNotice({ tone: 'success', text: 'Certificate deactivated.' })
    } catch (error) {
      setNotice({ tone: 'error', text: normalizeApiError(error).message })
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
              <CardTitle>Certificate automation</CardTitle>
              <CardDescription>
                Upload one award file. Every approval emails it to the team's
                leader and members automatically.
              </CardDescription>
            </div>
            <Badge variant={certificate ? 'success' : 'warning'}>
              {certificate ? 'Active' : 'Not uploaded'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {notice ? (
            <p
              role="status"
              className={`rounded-lg border px-3 py-2 text-sm ${
                notice.tone === 'success'
                  ? 'border-success/40 bg-success/10 text-success'
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

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? <Spinner className="h-4 w-4" /> : null}
              {certificate ? 'Replace certificate' : 'Upload certificate'}
            </Button>
            {certificate ? (
              <>
                <Button variant="outline" onClick={() => void certificatesApi.download(certificate)}>
                  Download
                </Button>
                <Button variant="secondary" disabled={sending} onClick={() => void handleSendAll()}>
                  {sending ? <Spinner className="h-4 w-4" /> : null}
                  Send to all approved teams
                </Button>
                <Button variant="destructive" onClick={() => void handleDeactivate()}>
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
            How it works: approving a team (or pressing “Send to all approved
            teams”) queues one email per participant through the outbox.
            Delivery failures are recorded there and can be retried from the
            Email outbox page. Nobody receives the same certificate twice.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
