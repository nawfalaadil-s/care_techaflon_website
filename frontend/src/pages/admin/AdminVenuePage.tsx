import { useCallback, useEffect, useMemo, useState } from 'react'

import { normalizeApiError } from '@/api/client'
import { teamApi, type TeamRecord } from '@/api/teamApi'
import {
  venueApi,
  type VenueWithSeats,
} from '@/api/venueApi'
import { AdminFilterBar } from '@/components/admin/AdminFilterBar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { THEME_LABELS } from '@/data/tracks'
import { TEAM_STATUS_LABELS } from '@/data/status'

export default function AdminVenuePage() {
  const [teams, setTeams] = useState<TeamRecord[]>([])
  const [venues, setVenues] = useState<VenueWithSeats[]>([])
  const [state, setState] = useState<
    { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ready' }
  >({ kind: 'loading' })
  const [view, setView] = useState<'allocate' | 'manage'>('allocate')

  const load = useCallback(async () => {
    setState({ kind: 'loading' })
    try {
      const [teamData, venueData] = await Promise.all([
        teamApi.adminList(),
        venueApi.listWithSeats(),
      ])
      setTeams(teamData)
      setVenues(venueData)
      setState({ kind: 'ready' })
    } catch (error) {
      setState({ kind: 'error', message: normalizeApiError(error).message })
    }
  }, [])

  useEffect(() => {
    const id = window.setTimeout(load, 0)
    return () => window.clearTimeout(id)
  }, [load])

  const venueCount = venues.length

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold">Venue &amp; team allocation</h2>
          <p className="text-sm text-muted-foreground">
            Create venues with a team capacity, then bulk-assign teams to each venue.
          </p>
        </div>
        <Badge variant="outline">{venueCount} venue{venueCount === 1 ? '' : 's'}</Badge>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={view === 'allocate' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setView('allocate')}
        >
          Bulk allocate
        </Button>
        <Button
          variant={view === 'manage' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setView('manage')}
        >
          Manage venues
        </Button>
      </div>

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
          <Spinner /> Loading venues &amp; teams…
        </div>
      )}

      {state.kind === 'ready' && (
        <>
          {view === 'manage' && (
            <ManageVenuesSection
              venues={venues}
              onCreate={(v) => setVenues((prev) => [...prev, v])}
              onUpdate={(v) =>
                setVenues((prev) => prev.map((x) => (x.id === v.id ? v : x)))
              }
              onDelete={(id) => setVenues((prev) => prev.filter((x) => x.id !== id))}
            />
          )}

          {view === 'allocate' && (
            <BulkAllocationSection
              teams={teams}
              venues={venues}
              onRefresh={load}
            />
          )}
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Manage venues (create / edit / delete)
// ---------------------------------------------------------------------------

function ManageVenuesSection({
  venues,
  onCreate,
  onUpdate,
  onDelete,
}: {
  venues: VenueWithSeats[]
  onCreate: (venue: VenueWithSeats) => void
  onUpdate: (venue: VenueWithSeats) => void
  onDelete: (id: string) => void
}) {
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [capacity, setCapacity] = useState(20)
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function create() {
    if (busy) return
    if (name.trim().length < 2) {
      setError('Venue name needs at least 2 characters.')
      return
    }
    if (location.trim().length < 2) {
      setError('Location needs at least 2 characters.')
      return
    }
    if (!capacity || capacity < 1) {
      setError('Team capacity must be at least 1.')
      return
    }
    setBusy(true)
    setError(null)
    setSuccess(null)
    try {
      const created = await venueApi.create({
        name: name.trim(),
        location: location.trim(),
        capacity: Number(capacity),
        description: description.trim() || undefined,
      })
      onCreate({ ...created, seats: [], available_seats: created.capacity })
      setName('')
      setLocation('')
      setCapacity(20)
      setDescription('')
      setSuccess(`Venue “${created.name}” created.`)
    } catch (err) {
      setError(normalizeApiError(err).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card className="border-primary/40 bg-primary/5">
        <CardContent className="space-y-3 pt-4">
          <h3 className="text-sm font-semibold">Create a new venue</h3>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          {success && <p className="text-sm text-emerald-600">{success}</p>}
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_160px] sm:items-end">
            <Field label="Venue name" htmlFor="vn-name">
              <Input
                id="vn-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Innovation Lab"
              />
            </Field>
            <Field label="Location / directions" htmlFor="vn-loc">
              <Input
                id="vn-loc"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Block C, 2nd floor"
              />
            </Field>
            <Field label="Team capacity" htmlFor="vn-cap" hint="How many teams the venue holds">
              <Input
                id="vn-cap"
                type="number"
                min={1}
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
              />
            </Field>
          </div>
          <Field label="Description (optional)" htmlFor="vn-desc">
            <Textarea
              id="vn-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Main hall with power and wifi"
            />
          </Field>
          <div className="flex justify-end">
            <Button onClick={() => void create()} disabled={busy}>
              {busy ? (
                <>
                  <Spinner size="sm" /> Creating…
                </>
              ) : (
                'Create venue'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div>
        <h3 className="mb-2 text-sm font-semibold">
          Existing venues ({venues.length})
        </h3>
        {venues.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No venues yet. Create one above.
          </p>
        )}
        <ul className="space-y-2">
          {venues.map((v) => (
            <li key={v.id}>
              <VenueCard venue={v} onUpdate={onUpdate} onDelete={onDelete} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function VenueCard({
  venue,
  onUpdate,
  onDelete,
}: {
  venue: VenueWithSeats
  onUpdate: (venue: VenueWithSeats) => void
  onDelete: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [location, setLocation] = useState(venue.location)
  const [capacity, setCapacity] = useState(venue.capacity)
  const [description, setDescription] = useState(venue.description ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const occupied = venue.seats.length
  const available = venue.available_seats

  async function save() {
    if (saving) return
    setSaving(true)
    setError(null)
    try {
      const updated = await venueApi.update(venue.id, {
        location: location.trim(),
        capacity: Number(capacity),
        description: description.trim() || undefined,
      })
      onUpdate({ ...updated, seats: venue.seats, available_seats: updated.capacity - venue.seats.length })
      setOpen(false)
    } catch (err) {
      setError(normalizeApiError(err).message)
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    setSaving(true)
    setError(null)
    try {
      await venueApi.delete(venue.id)
      onDelete(venue.id)
    } catch (err) {
      setError(normalizeApiError(err).message)
      setConfirmDelete(false)
    } finally {
      setSaving(false)
    }
  }

  const pct = venue.capacity > 0 ? Math.round((occupied / venue.capacity) * 100) : 0

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium">{venue.name}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {venue.location} · {venue.capacity} team{venue.capacity === 1 ? '' : 's'} capacity ·{' '}
              {occupied} assigned ({available} free)
            </p>
            {venue.description && (
              <p className="mt-1 text-xs text-muted-foreground">{venue.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full ${pct >= 100 ? 'bg-destructive' : pct >= 75 ? 'bg-warning' : 'bg-primary'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <Badge variant="outline">{pct}%</Badge>
            <Button size="sm" variant="ghost" onClick={() => setOpen((v) => !v)}>
              {open ? 'Close' : 'Edit'}
            </Button>
            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => void remove()}>
              {confirmDelete ? 'Confirm?' : 'Delete'}
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
            <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
              <Field label="Location / directions" htmlFor={`vl-${venue.id}`}>
                <Input
                  id={`vl-${venue.id}`}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </Field>
              <Field label="Team capacity" htmlFor={`vc-${venue.id}`}>
                <Input
                  id={`vc-${venue.id}`}
                  type="number"
                  min={1}
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value))}
                />
              </Field>
            </div>
            <Field label="Description (optional)" htmlFor={`vd-${venue.id}`}>
              <Textarea
                id={`vd-${venue.id}`}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>
            <Button size="sm" disabled={saving} onClick={() => void save()}>
              {saving ? (
                <>
                  <Spinner size="sm" /> Saving…
                </>
              ) : (
                'Save changes'
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Bulk team allocation
// ---------------------------------------------------------------------------

function BulkAllocationSection({
  teams,
  venues,
  onRefresh,
}: {
  teams: TeamRecord[]
  venues: VenueWithSeats[]
  onRefresh: () => Promise<void>
}) {
  const [selectedVenue, setSelectedVenue] = useState('')
  const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(() => new Set())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Filters & options
  const [search, setSearch] = useState('')
  const [theme, setTheme] = useState('all')
  const [status, setStatus] = useState('all')
  const [department, setDepartment] = useState('all')
  const [allocation, setAllocation] = useState<'all' | 'unassigned' | 'assigned'>('all')
  const [sortBy, setSortBy] = useState<'name' | 'id' | 'department'>('name')

  const selectedVenueObj = venues.find((v) => v.id === selectedVenue)

  // Which teams are already assigned to which venue
  const teamVenueMap = useMemo(() => {
    const map: Record<string, string> = {}
    venues.forEach((v) => {
      v.seats.forEach((s) => {
        map[s.team_id] = v.id
      })
    })
    return map
  }, [venues])

  // Teams not assigned to the selected venue (available to add)
  const eligibleTeams = useMemo(() => {
    return teams.filter((t) => teamVenueMap[t.id] !== selectedVenue)
  }, [teams, teamVenueMap, selectedVenue])

  // Filter + sort the eligible (assignable) teams
  const filteredTeams = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = eligibleTeams.filter((t) => {
      if (theme !== 'all' && t.theme !== theme) return false
      if (status !== 'all' && t.status !== status) return false
      if (department !== 'all' && t.leader_department !== department) return false
      if (allocation === 'unassigned' && teamVenueMap[t.id]) return false
      if (allocation === 'assigned' && !teamVenueMap[t.id]) return false
      if (q) {
        const hay = `${t.team_name} ${t.team_id} ${t.leader_name} ${t.leader_email} ${t.leader_department}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
    list = [...list].sort((a, b) => {
      if (sortBy === 'id') return a.team_id.localeCompare(b.team_id)
      if (sortBy === 'department') return a.leader_department.localeCompare(b.leader_department)
      return a.team_name.localeCompare(b.team_name)
    })
    return list
  }, [eligibleTeams, search, theme, status, department, allocation, sortBy, teamVenueMap])

  // Teams currently in the selected venue
  const currentTeams = useMemo(() => {
    return teams.filter((t) => teamVenueMap[t.id] === selectedVenue)
  }, [teams, teamVenueMap, selectedVenue])

  const freeSlots = selectedVenueObj ? selectedVenueObj.available_seats : 0

  // Quick-filtered counts
  const unassignedCount = eligibleTeams.filter((t) => !teamVenueMap[t.id]).length
  const assignedElsewhereCount = eligibleTeams.filter((t) => teamVenueMap[t.id]).length

  function toggleTeam(id: string) {
    setError(null)
    setSuccess(null)
    setSelectedTeamIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else if (selectedVenueObj && next.size >= freeSlots) {
        return prev
      } else next.add(id)
      return next
    })
  }

  function toggleVisible() {
    setError(null)
    setSuccess(null)
    const targetSize = Math.min(filteredTeams.length, freeSlots)
    setSelectedTeamIds((prev) => {
      const next = new Set(prev)
      let added = 0
      for (const t of filteredTeams) {
        if (next.has(t.id)) continue
        if (added >= targetSize) break
        next.add(t.id)
        added++
      }
      return next
    })
  }

  function resetFilters() {
    setSearch('')
    setTheme('all')
    setStatus('all')
    setDepartment('all')
    setAllocation('all')
    setSortBy('name')
  }

  async function assign() {
    if (busy) return
    if (!selectedVenue) {
      setError('Select a venue first.')
      return
    }
    if (selectedTeamIds.size === 0) {
      setError('Select at least one team to assign.')
      return
    }
    if (selectedTeamIds.size > freeSlots) {
      setError(`This venue only has ${freeSlots} free slot(s).`)
      return
    }
    setBusy(true)
    setError(null)
    setSuccess(null)
    try {
      const seats = await venueApi.bulkAssign(selectedVenue, [...selectedTeamIds])
      setSuccess(`${seats.length} team(s) assigned to “${selectedVenueObj?.name}”.`)
      setSelectedTeamIds(new Set())
      await onRefresh()
    } catch (err) {
      setError(normalizeApiError(err).message)
    } finally {
      setBusy(false)
    }
  }

  async function unassign(teamId: string) {
    if (busy) return
    setBusy(true)
    setError(null)
    setSuccess(null)
    try {
      await venueApi.unassignTeamSeat(teamId)
      await onRefresh()
    } catch (err) {
      setError(normalizeApiError(err).message)
    } finally {
      setBusy(false)
    }
  }

  async function unassignAll() {
    if (busy) return
    if (!selectedVenue || currentTeams.length === 0) return
    setBusy(true)
    setError(null)
    setSuccess(null)
    try {
      await venueApi.bulkUnassign(currentTeams.map((t) => t.id))
      setSuccess(`Cleared ${currentTeams.length} team(s) from “${selectedVenueObj?.name}”.`)
      await onRefresh()
    } catch (err) {
      setError(normalizeApiError(err).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card className="border-primary/40 bg-primary/5">
        <CardContent className="space-y-3 pt-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <Field label="Venue" htmlFor="blk-venue">
              <Select
                id="blk-venue"
                value={selectedVenue}
                onChange={(e) => {
                  setSelectedVenue(e.target.value)
                  setSelectedTeamIds(new Set())
                  setError(null)
                  setSuccess(null)
                }}
              >
                <option value="">Select a venue…</option>
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} — {v.available_seats} free slot
                    {v.available_seats === 1 ? '' : 's'} of {v.capacity}
                  </option>
                ))}
              </Select>
            </Field>
            {selectedVenueObj && (
              <div className="flex items-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => void unassignAll()}
                  disabled={busy || currentTeams.length === 0}
                  className="h-10 whitespace-nowrap"
                >
                  Clear venue ({currentTeams.length})
                </Button>
              </div>
            )}
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          {success && <p className="text-sm text-emerald-600">{success}</p>}

          {selectedVenueObj && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">
                  Assign teams to {selectedVenueObj.name}
                </h3>
                <Badge variant="outline">
                  {selectedTeamIds.size} selected · {freeSlots} free
                </Badge>
              </div>

              {/* Filters & options */}
              <AdminFilterBar
                search={search}
                onSearchChange={setSearch}
                searchPlaceholder="Team, ID, leader…"
                resultCount={{ shown: filteredTeams.length, total: eligibleTeams.length }}
                chips={[
                  theme !== 'all'
                    ? {
                        label: `Theme: ${THEME_LABELS[theme] ?? theme}`,
                        onRemove: () => setTheme('all'),
                      }
                    : null,
                  status !== 'all'
                    ? {
                        label: `Status: ${TEAM_STATUS_LABELS[status as keyof typeof TEAM_STATUS_LABELS] ?? status}`,
                        onRemove: () => setStatus('all'),
                      }
                    : null,
                  department !== 'all'
                    ? {
                        label: `Department: ${department}`,
                        onRemove: () => setDepartment('all'),
                      }
                    : null,
                  allocation !== 'all'
                    ? {
                        label:
                          allocation === 'unassigned' ? 'Allocation: Unassigned' : 'Allocation: Assigned',
                        onRemove: () => setAllocation('all'),
                      }
                    : null,
                  sortBy !== 'name'
                    ? {
                        label: `Sort: ${sortBy === 'id' ? 'Team ID' : 'Department'}`,
                        onRemove: () => setSortBy('name'),
                      }
                    : null,
                ].filter((c): c is NonNullable<typeof c> => c !== null)}
                actions={
                  <Button variant="outline" size="sm" onClick={resetFilters}>
                    Reset filters
                  </Button>
                }
              >
                <Field label="Theme" htmlFor="blk-theme" className="mb-0">
                  <Select
                    id="blk-theme"
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                  >
                    <option value="all">All themes</option>
                    {Object.entries(THEME_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Status" htmlFor="blk-status" className="mb-0">
                  <Select
                    id="blk-status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="all">All statuses</option>
                    {Object.entries(TEAM_STATUS_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Department" htmlFor="blk-dept" className="mb-0">
                  <Select
                    id="blk-dept"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                  >
                    <option value="all">All departments</option>
                    {[...new Set(eligibleTeams.map((t) => t.leader_department))]
                      .sort()
                      .map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                  </Select>
                </Field>
                <Field label="Allocation" htmlFor="blk-alloc" className="mb-0">
                  <Select
                    id="blk-alloc"
                    value={allocation}
                    onChange={(e) =>
                      setAllocation(e.target.value as 'all' | 'unassigned' | 'assigned')
                    }
                  >
                    <option value="all">All teams</option>
                    <option value="unassigned">
                      Unassigned only ({unassignedCount})
                    </option>
                    <option value="assigned">
                      Assigned elsewhere ({assignedElsewhereCount})
                    </option>
                  </Select>
                </Field>
                <Field label="Sort by" htmlFor="blk-sort" className="mb-0">
                  <Select
                    id="blk-sort"
                    value={sortBy}
                    onChange={(e) =>
                      setSortBy(e.target.value as 'name' | 'id' | 'department')
                    }
                  >
                    <option value="name">Team name</option>
                    <option value="id">Team ID</option>
                    <option value="department">Department</option>
                  </Select>
                </Field>
              </AdminFilterBar>

              <div className="space-y-1.5">
                {filteredTeams.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    {eligibleTeams.length === 0
                      ? 'Every team is already allocated to this venue.'
                      : 'No teams match the current filters.'}
                  </p>
                ) : (
                  filteredTeams.map((t) => {
                    const inAnotherVenue =
                      teamVenueMap[t.id] && teamVenueMap[t.id] !== selectedVenue
                    return (
                      <label
                        key={t.id}
                        className={`flex items-center gap-3 rounded-md border px-3 py-2 text-sm transition-colors ${
                          selectedTeamIds.has(t.id)
                            ? 'border-primary bg-primary/10'
                            : 'bg-muted/30 hover:bg-accent'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedTeamIds.has(t.id)}
                          onChange={() => toggleTeam(t.id)}
                          disabled={
                            !selectedTeamIds.has(t.id) &&
                            selectedTeamIds.size >= freeSlots
                          }
                          className="h-4 w-4 accent-primary"
                        />
                        <span className="min-w-0 flex-1 truncate font-medium">
                          {t.team_name}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">
                          {t.team_id}
                        </span>
                        <Badge variant="outline">{THEME_LABELS[t.theme] ?? t.theme}</Badge>
                        <Badge variant="outline">{TEAM_STATUS_LABELS[t.status] ?? t.status}</Badge>
                        {inAnotherVenue && (
                          <Badge variant="outline">
                            In: {venues.find((v) => v.id === teamVenueMap[t.id])?.name}
                          </Badge>
                        )}
                      </label>
                    )
                  })
                )}
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedTeamIds(new Set())}
                  disabled={selectedTeamIds.size === 0}
                >
                  Clear selection
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={toggleVisible}
                  disabled={busy || filteredTeams.length === 0 || freeSlots === 0}
                >
                  Select visible
                </Button>
                <Button
                  onClick={() => void assign()}
                  disabled={busy || selectedTeamIds.size === 0}
                >
                  {busy ? (
                    <>
                      <Spinner size="sm" /> Assigning…
                    </>
                  ) : (
                    `Assign ${selectedTeamIds.size} team${selectedTeamIds.size === 1 ? '' : 's'}`
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Currently assigned teams */}
      <div>
        <h3 className="mb-2 text-sm font-semibold">Team allocation</h3>
        {currentTeams.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {selectedVenue
              ? 'No teams assigned to this venue yet.'
              : 'Select a venue to see its teams.'}
          </p>
        ) : (
          <Card>
            <CardContent className="py-3">
              <p className="mb-2 text-sm font-medium">
                {selectedVenueObj?.name}{' '}
                <span className="font-normal text-muted-foreground">
                  ({currentTeams.length}/{selectedVenueObj?.capacity})
                </span>
              </p>
              <ul className="space-y-1">
                {currentTeams.map((t) => (
                  <li
                    key={t.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-1.5 text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <span className="font-medium">{t.team_name}</span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {t.team_id}
                      </span>
                    </span>
                    <button
                      onClick={() => void unassign(t.id)}
                      disabled={busy}
                      className="text-xs font-medium text-destructive hover:underline"
                    >
                      Unassign
                    </button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
