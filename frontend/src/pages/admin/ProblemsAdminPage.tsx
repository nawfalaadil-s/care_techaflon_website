import { useCallback, useEffect, useState } from 'react'

import { normalizeApiError } from '@/api/client'
import {
  problemApi,
  type ProblemStatement,
  type ProblemStatementInput,
} from '@/api/problemApi'
import { Badge } from '@/components/ui/badge'
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
import { Select } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { TRACK_OPTIONS, TRACK_LABELS } from '@/data/tracks'

const EMPTY_FORM: ProblemStatementInput = {
  title: '',
  summary: '',
  description: '',
  track: '',
  difficulty: 'medium',
  sponsor: '',
  published: false,
}

export default function ProblemsAdminPage() {
  const [statements, setStatements] = useState<ProblemStatement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null) // 'new' for create
  const [form, setForm] = useState<ProblemStatementInput>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  // Bulk selection
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setStatements(await problemApi.listAll())
    } catch (err) {
      setError(normalizeApiError(err).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const id = window.setTimeout(load, 0)
    return () => window.clearTimeout(id)
  }, [load])

  function startCreate() {
    setEditingId('new')
    setForm(EMPTY_FORM)
  }

  function startEdit(statement: ProblemStatement) {
    setEditingId(statement.id)
    setForm({
      title: statement.title,
      summary: statement.summary,
      description: statement.description,
      track: statement.track,
      difficulty: statement.difficulty,
      sponsor: statement.sponsor ?? '',
      published: statement.published,
    })
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (saving || !form.title.trim()) return
    setSaving(true)
    setError(null)
    try {
      const payload: ProblemStatementInput = {
        ...form,
        sponsor: form.sponsor?.trim() || null,
        title: form.title.trim(),
        summary: form.summary.trim(),
        description: form.description.trim(),
      }
      const saved =
        editingId === 'new'
          ? await problemApi.create(payload)
          : await problemApi.update(editingId!, payload)
      setStatements((prev) =>
        editingId === 'new'
          ? [saved, ...prev]
          : prev.map((s) => (s.id === saved.id ? saved : s)),
      )
      setEditingId(null)
    } catch (err) {
      setError(normalizeApiError(err).message)
    } finally {
      setSaving(false)
    }
  }

  async function togglePublished(statement: ProblemStatement) {
    try {
      const updated = await problemApi.update(statement.id, {
        published: !statement.published,
      })
      setStatements((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
    } catch (err) {
      setError(normalizeApiError(err).message)
    }
  }

  async function remove(statement: ProblemStatement) {
    if (!window.confirm(`Delete “${statement.title}” permanently?`)) return
    try {
      await problemApi.remove(statement.id)
      setStatements((prev) => prev.filter((s) => s.id !== statement.id))
      setSelected((prev) => {
        const next = new Set(prev)
        next.delete(statement.id)
        return next
      })
      if (editingId === statement.id) setEditingId(null)
    } catch (err) {
      setError(normalizeApiError(err).message)
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const allSelected =
    statements.length > 0 && statements.every((s) => selected.has(s.id))

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(statements.map((s) => s.id)))
  }

  async function bulkDelete() {
    const ids = [...selected]
    if (ids.length === 0 || deleting) return
    if (
      !window.confirm(
        `Delete ${ids.length} selected statement(s) permanently? Teams holding them will be unallocated.`,
      )
    )
      return
    setDeleting(true)
    setError(null)
    try {
      const results = await Promise.allSettled(ids.map((id) => problemApi.remove(id)))
      const failed = results.filter((r) => r.status === 'rejected').length
      if (failed > 0)
        setError(`${failed} of ${ids.length} deletions failed — they may still be referenced.`)
      setStatements((current) =>
        current.filter(
          (s) => !selected.has(s.id) || results[ids.indexOf(s.id)].status === 'rejected',
        ),
      )
      setSelected(new Set())
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 py-16 text-muted-foreground">
        <Spinner /> Loading statements…
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="inline-flex h-9 items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            className="h-4 w-4 accent-primary"
            aria-label="Select all statements"
          />
          Select all
        </label>
        <p className="text-sm text-muted-foreground" role="status">
          {statements.length} statement(s) ·{' '}
          {statements.filter((s) => s.published).length} live
        </p>
        <Button size="sm" onClick={startCreate}>
          + New statement
        </Button>
      </div>

      {error && (
        <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {editingId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {editingId === 'new' ? 'New problem statement' : 'Edit statement'}
            </CardTitle>
            <CardDescription>
              Drafts stay hidden until you publish them.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={save} noValidate className="space-y-4">
              <Field label="Title" htmlFor="ps-title" required>
                <Input
                  id="ps-title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Flood Alert Network"
                />
              </Field>
              <Field label="Summary" htmlFor="ps-summary" required hint="One line shown on cards (10–300 chars).">
                <Input
                  id="ps-summary"
                  value={form.summary}
                  onChange={(e) => setForm({ ...form, summary: e.target.value })}
                />
              </Field>
              <Field label="Full brief" htmlFor="ps-desc" required>
                <Textarea
                  id="ps-desc"
                  rows={5}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Track" htmlFor="ps-track" required>
                  <Select
                    id="ps-track"
                    value={form.track}
                    onChange={(e) => setForm({ ...form, track: e.target.value })}
                  >
                    <option value="" disabled>
                      Select…
                    </option>
                    {TRACK_OPTIONS.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Difficulty" htmlFor="ps-diff" required>
                  <Select
                    id="ps-diff"
                    value={form.difficulty}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        difficulty: e.target.value as ProblemStatementInput['difficulty'],
                      })
                    }
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </Select>
                </Field>
              </div>
              <Field label="Sponsor" htmlFor="ps-sponsor" hint="Optional.">
                <Input
                  id="ps-sponsor"
                  value={form.sponsor ?? ''}
                  onChange={(e) => setForm({ ...form, sponsor: e.target.value })}
                />
              </Field>

              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={(e) => setForm({ ...form, published: e.target.checked })}
                  className="h-4 w-4 accent-[var(--primary)]"
                />
                Published (visible on /problems)
              </label>

              <div className="flex gap-2">
                <Button type="submit" disabled={saving} className="flex-1 sm:flex-none">
                  {saving ? (
                    <>
                      <Spinner size="sm" /> Saving…
                    </>
                  ) : (
                    'Save'
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingId(null)}
                  disabled={saving}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            <p className="text-sm font-medium">
              {selected.size} statement(s) selected
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setSelected(new Set())}>
                Clear selection
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={deleting}
                onClick={() => void bulkDelete()}
              >
                {deleting ? (
                  <>
                    <Spinner size="sm" /> Deleting…
                  </>
                ) : (
                  `Delete ${selected.size} selected`
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <ul className="space-y-2">
        {statements.map((statement) => (
          <li key={statement.id}>
            <Card className={selected.has(statement.id) ? 'border-primary bg-primary/5' : undefined}>
              <CardContent className="pt-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selected.has(statement.id)}
                      onChange={() => toggleSelect(statement.id)}
                      aria-label={`Select ${statement.title}`}
                      className="mt-1 h-4 w-4 shrink-0 accent-primary"
                    />
                    <div className="min-w-0">
                      <h3 className="flex flex-wrap items-center gap-2 truncate text-sm font-semibold">
                        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                          {statement.id}
                        </code>
                        <span className="truncate">{statement.title}</span>
                      </h3>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {TRACK_LABELS[statement.track] ?? statement.track} ·{' '}
                        {statement.difficulty}
                        {statement.sponsor ? ` · ${statement.sponsor}` : ''}
                      </p>
                      <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                        {statement.summary}
                      </p>
                    </div>
                  </div>
                  <Badge variant={statement.published ? 'success' : 'warning'}>
                    {statement.published ? 'Live' : 'Draft'}
                  </Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => startEdit(statement)}>
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void togglePublished(statement)}
                  >
                    {statement.published ? 'Unpublish' : 'Publish'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => void remove(statement)}>
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
        {statements.length === 0 && (
          <li className="py-8 text-center text-sm text-muted-foreground">
            No problem statements yet — create the first one.
          </li>
        )}
      </ul>
    </div>
  )
}
