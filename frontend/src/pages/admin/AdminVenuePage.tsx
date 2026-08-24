import { useCallback, useEffect, useMemo, useState } from 'react'

import { normalizeApiError } from '@/api/client'
import { teamApi, type TeamRecord } from '@/api/teamApi'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { THEME_LABELS } from '@/data/tracks'
import { TEAM_STATUS_LABELS, TEAM_STATUS_VARIANT } from '@/data/status'

const NEW_VENUE = '__new__'

function isUnassigned(t: TeamRecord): boolean {
  return !t.venue_name || t.venue_name === 'TBD'
}

export default function AdminVenuePage() {
  const [teams, setTeams] = useState<TeamRecord[]>([])
  const [state, setState] = useState<
    { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ready' }
  >({ kind: 'loading' })
  const [search, setSearch] = useState('')
  const [onlyUnassigned, setOnlyUnassigned] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(() => new Set())

  const load = useCallback(async () => {
    setState({ kind: 'loading' })
    try {
      setTeams(await teamApi.adminList())
      setSelected(new Set())
      setState({ kind: 'ready' })
    } catch (error) {
      setState({ kind: 'error', message: normalizeApiError(error).message })
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return teams.filter((t) => {
      if (onlyUnassigned && !isUnassigned(t)) return false
      if (!q) return true
      return (
        t.team_name.toLowerCase().includes(q) ||
        t.team_id.toLowerCase().includes(q) ||
        t.leader_name.toLowerCase().includes(q)
      )
    })
  }, [teams, search, onlyUnassigned])

  function replaceTeam(updated: TeamRecord) {
    setTeams((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((t) => selected.has(t.id))

  function toggleAll() {
    setSelected((prev) => {
      if (filtered.every((t) => prev.has(t.id))) {
        const next = new Set(prev)
        filtered.forEach((t) => next.delete(t.id))
        return next
      }
      const next = new Set(prev)
      filtered.forEach((t) => next.add(t.id))
      return next
    })
  }

  const assigned = teams.filter((t) => !isUnassigned(t)).length

  // Distinct venues already in use — feeds the bulk-assign select.
  const knownVenues = useMemo(() => {
    const seen = new Map<string, { name: string; location: string }>()
    teams.forEach((t) => {
      if (!isUnassigned(t)) {
        seen.set(`${t.venue_name}::${t.venue_location}`, {
          name: t.venue_name,
          location: t.venue_location,
        })
      }
    })
    return [...seen.values()]
  }, [teams])

  async function bulkAssign(name: string, location: string) {
    const ids = [...selected]
    const results = await Promise.allSettled(
      ids.map((id) => teamApi.adminUpdate(id, { venue_name: name, venue_location: location })),
    )
    const failed = results.filter((r) => r.status === 'rejected').length
    if (failed > 0) {
      setState({
        kind: 'error',
        message: `${failed} of ${ids.length} assignments failed — check your connection and retry.`,
      })
    }
    results.forEach((r) => {
      if (r.status === 'fulfilled') replaceTeam(r.value)
    })
    setSelected(new Set())
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold">Venue allocation</h2>
          <p className="text-sm text-muted-foreground">
            Assign rooms per team, or tick several teams and assign them in one go.
          </p>
        </div>
        <Badge variant="outline">
          {assigned}/{teams.length} assigned
        </Badge>
      </header>

      {state.kind === 'error' && (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
            >
              Something went wrong. {state.message}
            </div>
            <Button variant="outline" onClick={() => void load()}>
              Try again
            </Button>
          </CardContent>
        </Card>
      )}

      {state.kind === 'loading' && (
        <div className="flex items-center justify-center gap-3 py-16 text-muted-foreground">
          <Spinner /> Loading teams…
        </div>
      )}

      {state.kind === 'ready' && (
        <>
          {/* Bulk assign bar */}
          {selected.size > 0 && (
            <BulkAssignBar
              count={selected.size}
              knownVenues={knownVenues}
              onAssign={bulkAssign}
              onClear={() => setSelected(new Set())}
            />
          )}

          <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search team, ID, leader…"
            />
            <label className="inline-flex h-10 items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={onlyUnassigned}
                onChange={(e) => setOnlyUnassigned(e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              Only unassigned
            </label>
            <label className="inline-flex h-10 items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={allFilteredSelected}
                onChange={toggleAll}
                className="h-4 w-4 accent-primary"
                aria-label="Select all visible teams"
              />
              Select all
            </label>
          </div>

          <ul className="space-y-2">
            {filtered.map((t) => (
              <li key={t.id}>
                <VenueRow
                  team={t}
                  selected={selected.has(t.id)}
                  onToggle={() => toggle(t.id)}
                  onSaved={replaceTeam}
                />
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="py-8 text-center text-sm text-muted-foreground">
                No teams match.
              </li>
            )}
          </ul>
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Bulk assign bar
// ---------------------------------------------------------------------------

function BulkAssignBar({
  count,
  knownVenues,
  onAssign,
  onClear,
}: {
  count: number
  knownVenues: Array<{ name: string; location: string }>
  onAssign: (name: string, location: string) => Promise<void>
  onClear: () => void
}) {
  const [choice, setChoice] = useState(knownVenues.length > 0 ? '0' : NEW_VENUE)
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isNew = choice === NEW_VENUE

  function pickExisting(index: string) {
    setChoice(index)
    setError(null)
    if (index !== NEW_VENUE) {
      const v = knownVenues[Number(index)]
      if (v) {
        setName(v.name)
        setLocation(v.location)
      }
    }
  }

  async function assign() {
    if (busy) return
    if (!isNew && name.trim().length < 2) {
      setError('Pick a venue or choose “New venue…”.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await onAssign(name.trim(), location.trim())
    } catch (err) {
      setError(normalizeApiError(err).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="border-primary/40 bg-primary/5">
      <CardContent className="space-y-3 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">
            Assign one venue to {count} selected team{count === 1 ? '' : 's'}
          </h3>
          <Button variant="ghost" size="sm" onClick={onClear}>
            Clear selection
          </Button>
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-[minmax(200px,1fr)_1fr_1fr_auto] sm:items-end">
          <Field label="Venue" htmlFor="bulk-venue-choice">
            <Select
              id="bulk-venue-choice"
              value={choice}
              onChange={(e) => pickExisting(e.target.value)}
            >
              {knownVenues.map((v, i) => (
                <option key={`${v.name}-${i}`} value={String(i)}>
                  {v.name} — {v.location || 'no directions'}
                </option>
              ))}
              <option value={NEW_VENUE}>New venue…</option>
            </Select>
          </Field>

          <Field label="Venue name" htmlFor="bulk-venue-name">
            <Input
              id="bulk-venue-name"
              value={name}
              disabled={!isNew}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Innovation Lab"
            />
          </Field>

          <Field label="Location / directions" htmlFor="bulk-venue-location">
            <Input
              id="bulk-venue-location"
              value={location}
              disabled={!isNew}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Block C, 2nd floor"
            />
          </Field>

          <Button
            onClick={() => void assign()}
            disabled={busy}
            className="h-10 whitespace-nowrap"
          >
            {busy ? (
              <>
                <Spinner size="sm" /> Assigning…
              </>
            ) : (
              `Assign ${count} team${count === 1 ? '' : 's'}`
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Single team row
// ---------------------------------------------------------------------------

function VenueRow({
  team,
  selected,
  onToggle,
  onSaved,
}: {
  team: TeamRecord
  selected: boolean
  onToggle: () => void
  onSaved: (updated: TeamRecord) => void
}) {
  const unassigned = isUnassigned(team)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(team.venue_name)
  const [location, setLocation] = useState(team.venue_location)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setName(team.venue_name)
    setLocation(team.venue_location)
    setError(null)
  }, [team])

  async function save() {
    if (saving) return
    if (name.trim().length < 2) {
      setError('Venue name needs at least 2 characters.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      onSaved(
        await teamApi.adminUpdate(team.id, {
          venue_name: name.trim(),
          venue_location: location.trim(),
        }),
      )
      setOpen(false)
    } catch (err) {
      setError(normalizeApiError(err).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className={selected ? 'border-primary bg-primary/5' : undefined}>
      <CardContent className="py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <input
              type="checkbox"
              checked={selected}
              onChange={onToggle}
              aria-label={`Select ${team.team_name}`}
              className="mt-1 h-4 w-4 shrink-0 accent-primary"
            />
            <div className="min-w-0">
              <p className="flex items-center gap-2 font-medium">
                <span className="truncate">{team.team_name}</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {team.team_id}
                </span>
              </p>
              {!open && (
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {THEME_LABELS[team.theme] ?? team.theme} ·{' '}
                  {unassigned ? (
                    <span className="text-warning">No venue assigned</span>
                  ) : (
                    <>
                      <span className="font-medium text-foreground">{team.venue_name}</span>{' '}
                      — {team.venue_location}
                    </>
                  )}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={TEAM_STATUS_VARIANT[team.status]}>
              {TEAM_STATUS_LABELS[team.status]}
            </Badge>
            <Button variant="outline" size="sm" onClick={() => setOpen((v) => !v)}>
              {open ? 'Cancel' : unassigned ? 'Assign' : 'Change'}
            </Button>
          </div>
        </div>

        {open && (
          <div className="mt-4 space-y-3 border-t pt-4">
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Venue name" htmlFor={`vn-${team.id}`}>
                <Input
                  id={`vn-${team.id}`}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Innovation Lab"
                />
              </Field>
              <Field label="Location / directions" htmlFor={`vl-${team.id}`}>
                <Input
                  id={`vl-${team.id}`}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Block C, 2nd floor"
                />
              </Field>
            </div>
            <Button size="sm" disabled={saving} onClick={() => void save()}>
              {saving ? (
                <>
                  <Spinner size="sm" /> Saving…
                </>
              ) : (
                'Save venue'
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
