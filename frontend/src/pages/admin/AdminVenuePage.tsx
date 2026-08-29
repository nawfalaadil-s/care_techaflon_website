import { useCallback, useEffect, useMemo, useState } from 'react'

import { normalizeApiError } from '@/api/client'
import { teamApi, type TeamRecord } from '@/api/teamApi'
import {
  venueApi,
  type TeamSeat,
  type VenueWithSeats,
} from '@/api/venueApi'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'

export default function AdminVenuePage() {
  const [teams, setTeams] = useState<TeamRecord[]>([])
  const [venues, setVenues] = useState<VenueWithSeats[]>([])
  const [state, setState] = useState<
    { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ready' }
  >({ kind: 'loading' })
  const [view, setView] = useState<'create' | 'assign' | 'seats'>('assign')

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
          <h2 className="font-display text-xl font-bold">Venue &amp; seat allocation</h2>
          <p className="text-sm text-muted-foreground">
            Create venues, then assign each team a seat in a venue.
          </p>
        </div>
        <Badge variant="outline">{venueCount} venue{venueCount === 1 ? '' : 's'}</Badge>
      </header>

      {/* View switch */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={view === 'assign' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setView('assign')}
        >
          Assign seats
        </Button>
        <Button
          variant={view === 'create' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setView('create')}
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
          {view === 'create' && (
            <CreateVenueSection
              venues={venues}
              onCreate={(v) => setVenues((prev) => [...prev, v])}
              onUpdate={(v) =>
                setVenues((prev) => prev.map((x) => (x.id === v.id ? v : x)))
              }
              onDelete={(id) => setVenues((prev) => prev.filter((x) => x.id !== id))}
            />
          )}

          {view === 'assign' && (
            <AssignSeatsSection
              teams={teams}
              venues={venues}
              onAssignment={(venueId, seat) =>
                setVenues((prev) =>
                  prev.map((v) =>
                    v.id === venueId
                      ? { ...v, seats: [...v.seats.filter((s) => s.team_id !== seat.team_id), seat] }
                      : v,
                  ),
                )
              }
              onUnassign={(teamId) =>
                setVenues((prev) =>
                  prev.map((v) => ({
                    ...v,
                    seats: v.seats.filter((s) => s.team_id !== teamId),
                  })),
                )
              }
            />
          )}
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Create / manage venues
// ---------------------------------------------------------------------------

function CreateVenueSection({
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
      setError('Capacity must be at least 1.')
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
            <Field label="Seat capacity" htmlFor="vn-cap">
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
              {venue.location} · {venue.capacity} seats · {occupied} occupied (
              {available} free)
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
              <Field label="Capacity" htmlFor={`vc-${venue.id}`}>
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
// Assign teams to venue seats
// ---------------------------------------------------------------------------

function AssignSeatsSection({
  teams,
  venues,
  onAssignment,
  onUnassign,
}: {
  teams: TeamRecord[]
  venues: VenueWithSeats[]
  onAssignment: (venueId: string, seat: TeamSeat) => void
  onUnassign: (teamId: string) => void
}) {
  const [selectedTeam, setSelectedTeam] = useState('')
  const [selectedVenue, setSelectedVenue] = useState('')
  const [seatNumber, setSeatNumber] = useState<number | ''>('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Build lookup of team->seat from venues (derived during render).
  const assigned = useMemo(() => {
    const map: Record<string, TeamSeat> = {}
    venues.forEach((v) => {
      v.seats.forEach((s) => {
        map[s.team_id] = s
      })
    })
    return map
  }, [venues])

  const availableTeams = useMemo(() => {
    return teams.filter((t) => !assigned[t.id])
  }, [teams, assigned])

  const currentVenue = venues.find((v) => v.id === selectedVenue)

  // Available seats for the selected venue
  const eligibleSeats = useMemo(() => {
    if (!currentVenue) return [] as number[]
    const taken = new Set(currentVenue.seats.map((s) => s.seat_number))
    const seats: number[] = []
    for (let i = 1; i <= currentVenue.capacity; i++) {
      if (!taken.has(i)) seats.push(i)
    }
    return seats
  }, [currentVenue])

  async function assign() {
    if (busy) return
    if (!selectedTeam) {
      setError('Select a team first.')
      return
    }
    if (!selectedVenue) {
      setError('Select a venue first.')
      return
    }
    if (!seatNumber) {
      setError('Choose a seat number.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const seat = await venueApi.assignTeamToSeat(selectedVenue, {
        team_id: selectedTeam,
        seat_number: Number(seatNumber),
      })
      onAssignment(selectedVenue, seat)
      setSelectedTeam('')
      setSelectedVenue('')
      setSeatNumber('')
    } catch (err) {
      setError(normalizeApiError(err).message)
    } finally {
      setBusy(false)
    }
  }

  async function unassign(teamId: string) {
    setBusy(true)
    setError(null)
    try {
      await venueApi.unassignTeamSeat(teamId)
      onUnassign(teamId)
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
          <h3 className="text-sm font-semibold">Assign a team to a seat</h3>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_140px_auto] sm:items-end">
            <Field label="Team" htmlFor="as-team">
              <Select
                id="as-team"
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
              >
                <option value="">Select a team…</option>
                {availableTeams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.team_name} ({t.team_id})
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Venue" htmlFor="as-venue">
              <Select
                id="as-venue"
                value={selectedVenue}
                onChange={(e) => {
                  setSelectedVenue(e.target.value)
                  setSeatNumber('')
                }}
              >
                <option value="">Select a venue…</option>
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.available_seats} free)
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Seat number" htmlFor="as-seat">
              <Select
                id="as-seat"
                value={String(seatNumber)}
                onChange={(e) =>
                  setSeatNumber(e.target.value ? Number(e.target.value) : '')
                }
                disabled={!currentVenue}
              >
                <option value="">Seat…</option>
                {eligibleSeats.map((n) => (
                  <option key={n} value={String(n)}>
                    {n}
                  </option>
                ))}
              </Select>
            </Field>
            <Button onClick={() => void assign()} disabled={busy} className="h-10 whitespace-nowrap">
              {busy ? (
                <>
                  <Spinner size="sm" /> Assigning…
                </>
              ) : (
                'Assign'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Assignments overview */}
      {Object.keys(assigned).length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No seats assigned yet. Pick a team, venue and seat above.
        </p>
      ) : (
        <div>
          <h3 className="mb-2 text-sm font-semibold">Seat assignments</h3>
          <ul className="space-y-2">
            {venues.map((v) => {
              if (v.seats.length === 0) return null
              return (
                <li key={v.id}>
                  <Card>
                    <CardContent className="py-3">
                      <p className="mb-2 text-sm font-medium">
                        {v.name}{' '}
                        <span className="font-normal text-muted-foreground">
                          ({v.seats.length}/{v.capacity})
                        </span>
                      </p>
                      <div className="space-y-1">
                        {[...v.seats]
                          .sort((a, b) => a.seat_number - b.seat_number)
                          .map((s) => {
                            const team = teams.find((t) => t.id === s.team_id)
                            return (
                              <div
                                key={s.id}
                                className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-1.5 text-sm"
                              >
                                <span className="flex items-center gap-2">
                                  <Badge variant="outline">Seat {s.seat_number}</Badge>
                                  <span>{team?.team_name ?? s.team_id}</span>
                                  <span className="font-mono text-xs text-muted-foreground">
                                    {team?.team_id}
                                  </span>
                                </span>
                                <button
                                  onClick={() => void unassign(s.team_id)}
                                  disabled={busy}
                                  className="text-xs font-medium text-destructive hover:underline"
                                >
                                  Unassign
                                </button>
                              </div>
                            )
                          })}
                      </div>
                    </CardContent>
                  </Card>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
