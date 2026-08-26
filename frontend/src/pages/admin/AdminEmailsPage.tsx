import { useCallback, useEffect, useRef, useState } from 'react'

import {
  emailsApi,
  type EmailMessage,
  type EmailMessageSummary,
  type EmailStatus,
} from '@/api/emailsApi'
import { normalizeApiError } from '@/api/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'

const STATUS_FILTERS: Array<{ value: EmailStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'queued', label: 'Queued' },
  { value: 'sent', label: 'Sent' },
  { value: 'logged', label: 'Logged' },
  { value: 'failed', label: 'Failed' },
]

const STATUS_VARIANT: Record<EmailStatus, 'success' | 'info' | 'warning' | 'destructive'> = {
  sent: 'success',
  logged: 'info',
  queued: 'warning',
  failed: 'destructive',
}

const TEMPLATE_LABELS: Record<string, string> = {
  registration_confirmation: 'Registration received',
  registration_decision: 'Review decision',
  submission_received: 'Submission confirmed',
  team_registration_confirmation: 'Team registered',
  team_status_update: 'Team status update',
  certificate_award: 'Certificate awarded',
}

/** Auto-refresh interval in ms. */
const REFRESH_INTERVAL = 15_000

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready' }

export default function AdminEmailsPage() {
  const [state, setState] = useState<LoadState>({ kind: 'loading' })
  const [messages, setMessages] = useState<EmailMessageSummary[]>([])
  const [total, setTotal] = useState(0)
  const [filter, setFilter] = useState<EmailStatus | 'all'>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [detailById, setDetailById] = useState<Record<string, EmailMessage>>({})
  const [resendingId, setResendingId] = useState<string | null>(null)
  const [previewHtml, setPreviewHtml] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const load = useCallback(async () => {
    setState({ kind: 'loading' })
    try {
      const result = await emailsApi.list({
        limit: 100,
        ...(filter === 'all' ? {} : { status: filter }),
      })
      setMessages(result.items)
      setTotal(result.total)
      setState({ kind: 'ready' })
    } catch (error) {
      setState({ kind: 'error', message: normalizeApiError(error).message })
    }
  }, [filter])

  useEffect(() => {
    void load()
  }, [load])

  // Auto-refresh every REFRESH_INTERVAL ms
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      void load()
    }, REFRESH_INTERVAL)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [load])

  async function toggleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null)
      return
    }
    setExpandedId(id)
    setPreviewHtml(false)
    if (!detailById[id]) {
      try {
        const full = await emailsApi.get(id)
        setDetailById((prev) => ({ ...prev, [id]: full }))
      } catch {
        /* keep previous state */
      }
    }
  }

  async function resend(id: string) {
    setResendingId(id)
    try {
      const updated = await emailsApi.resend(id)
      // Update the summary in the list
      setMessages((prev) =>
        prev.map((m) =>
          m.id === id
            ? {
                ...m,
                status: updated.status,
                sent_at: updated.sent_at,
                error: updated.error,
              }
            : m,
        ),
      )
      // Also update the detail cache
      setDetailById((prev) => ({ ...prev, [id]: updated }))
    } catch {
      /* row keeps its previous state; admin can retry */
    } finally {
      setResendingId(null)
    }
  }

  if (state.kind === 'loading') {
    return (
      <div className="flex items-center justify-center gap-3 py-16 text-muted-foreground">
        <Spinner /> Loading outbox…
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
            Couldn't load the outbox. {state.message}
          </div>
          <Button variant="outline" onClick={() => void load()}>
            Try again
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Status filter chips */}
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by status">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            aria-pressed={filter === f.value}
            className={`inline-flex h-9 items-center rounded-full border px-4 text-sm font-medium transition-colors ${
              filter === f.value
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
          >
            {f.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">
          Auto-refresh {REFRESH_INTERVAL / 1000}s
        </span>
      </div>

      <p className="text-sm text-muted-foreground" aria-live="polite">
        Showing {messages.length} of {total} message{total === 1 ? '' : 's'}
      </p>

      {messages.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No messages{filter !== 'all' ? ` with status "${filter}"` : ' yet'}.
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2">
          {messages.map((m) => {
            const detail = detailById[m.id]
            return (
              <li key={m.id}>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => void toggleExpand(m.id)}
                        className="min-w-0 flex-1 text-left"
                        aria-expanded={expandedId === m.id}
                      >
                        <span className="block truncate text-sm font-medium">
                          {m.subject}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                          {TEMPLATE_LABELS[m.template] ?? m.template} · {m.to_email} ·{' '}
                          {new Date(m.created_at).toLocaleString()}
                        </span>
                      </button>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge variant={STATUS_VARIANT[m.status]}>{m.status}</Badge>
                        {(m.status === 'failed' || m.status === 'logged') && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={resendingId === m.id}
                            onClick={() => void resend(m.id)}
                          >
                            {resendingId === m.id ? (
                              <>
                                <Spinner size="sm" /> Resending…
                              </>
                            ) : (
                              'Resend'
                            )}
                          </Button>
                        )}
                      </div>
                    </div>

                    {m.error && (
                      <p className="mt-2 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
                        {m.error}
                      </p>
                    )}

                    {expandedId === m.id && (
                      <div className="mt-3">
                        {detail && detail.body_html && (
                          <div className="mb-2 flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => setPreviewHtml(false)}
                              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                                !previewHtml
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted text-muted-foreground hover:bg-accent'
                              }`}
                            >
                              Plain text
                            </button>
                            <button
                              type="button"
                              onClick={() => setPreviewHtml(true)}
                              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                                previewHtml
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted text-muted-foreground hover:bg-accent'
                              }`}
                            >
                              HTML preview
                            </button>
                          </div>
                        )}

                        {previewHtml && detail?.body_html ? (
                          <iframe
                            srcDoc={detail.body_html}
                            title="Email HTML preview"
                            className="h-96 w-full overflow-auto rounded-md border bg-white"
                            sandbox="allow-same-origin"
                          />
                        ) : (
                          <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-md border bg-muted/40 p-3 font-mono text-xs leading-relaxed">
                            {detail?.body ?? 'Loading…'}
                          </pre>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
