import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, Check, Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Container } from '@/components/ui/container'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { DoomsdayBackground } from '@/components/effects/DoomsdayBackground'
import { normalizeApiError } from '@/api/client'
import { teamApi, type TeamMemberInput, type TeamRecord } from '@/api/teamApi'

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const DEPARTMENT_OPTIONS = ['CSE', 'AI & DS'] as const

/** Display label II / III / IV -> canonical stored value. */
const YEAR_OPTIONS = [
  { value: '2nd Year', label: 'II' },
  { value: '3rd Year', label: 'III' },
  { value: 'Final Year', label: 'IV' },
] as const

const THEME_OPTIONS = [
  {
    value: 'ai-ml',
    title: 'AI / ML',
    description: 'Artificial Intelligence & Machine Learning',
  },
  {
    value: 'web',
    title: 'WEB',
    description: 'Web Development',
  },
] as const

const MIN_TEAM_SIZE = 3
const MAX_TEAM_SIZE = 4

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/* ------------------------------------------------------------------ */
/* State model                                                         */
/* ------------------------------------------------------------------ */

interface LeaderFields {
  name: string
  register_number: string
  email: string
  department: string
  year: string
}

type MemberRow = TeamMemberInput

interface FormState {
  team_name: string
  theme: string
  leader: LeaderFields
  members: MemberRow[]
}

const emptyLeader = (): LeaderFields => ({
  name: '',
  register_number: '',
  email: '',
  department: '',
  year: '',
})

const emptyMember = (): MemberRow => ({
  name: '',
  register_number: '',
  email: '',
  department: '',
  year: '',
})

const initialState = (): FormState => ({
  team_name: '',
  theme: '',
  leader: emptyLeader(),
  // Start with two empty member slots: leader + 2 = the minimum of 3.
  members: [emptyMember(), emptyMember()],
})

type StepId = 1 | 2 | 3
type Errors = Record<string, string>

/* ------------------------------------------------------------------ */
/* Validation (mirrors the backend rules — backend re-checks anyway)   */
/* ------------------------------------------------------------------ */

function validateStep1(form: FormState): Errors {
  const e: Errors = {}
  if (form.team_name.trim().length < 2)
    e.team_name = 'Enter a team name (min. 2 characters).'
  if (!form.theme) e.theme = 'Select exactly one theme.'
  if (form.leader.name.trim().length < 2)
    e['leader.name'] = "Enter the leader's full name."
  if (!form.leader.register_number.trim())
    e['leader.register_number'] = 'Enter the register number.'
  if (!EMAIL_RE.test(form.leader.email.trim()))
    e['leader.email'] = 'Enter a valid email address.'
  if (!form.leader.department) e['leader.department'] = 'Select the department.'
  if (!form.leader.year) e['leader.year'] = 'Select the year of study.'
  return e
}

function validateStep2(form: FormState): Errors {
  const e: Errors = {}
  form.members.forEach((m, i) => {
    const p = `members.${i}.`
    if (m.name.trim().length < 2) e[`${p}name`] = 'Enter the full name.'
    if (!m.register_number.trim())
      e[`${p}register_number`] = 'Enter the register number.'
    if (!EMAIL_RE.test(m.email.trim()))
      e[`${p}email`] = 'Enter a valid email address.'
    if (!m.department) e[`${p}department`] = 'Select the department.'
    if (!m.year) e[`${p}year`] = 'Select the year of study.'
  })
  return e
}

/* ------------------------------------------------------------------ */
/* Small presentational helpers                                        */
/* ------------------------------------------------------------------ */

const fieldError = (errors: Errors, key: string) => errors[key]

function StepIndicator({ step }: { step: Exclude<StepId, 3> }) {
  const steps = [
    { id: 1, label: 'TEAM' },
    { id: 2, label: 'MEMBERS' },
  ] as const
  return (
    <ol className="flex items-center gap-3" aria-label="Registration progress">
      {steps.map((s, i) => {
        const active = s.id === step
        const done = s.id < step
        return (
          <li key={s.id} className="flex items-center gap-3">
            {i > 0 && (
              <span aria-hidden="true" className="h-px w-6 bg-primary/25" />
            )}
            <span
              aria-current={active ? 'step' : undefined}
              className={`text-hud flex items-center gap-2 ${
                active
                  ? 'text-primary-bright'
                  : done
                    ? 'text-primary/70'
                    : 'text-muted-foreground'
              }`}
            >
              <span
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-semibold ${
                  active
                    ? 'border-primary/60 bg-primary/15 shadow-[0_0_16px_rgba(123,203,127,0.25)]'
                    : done
                      ? 'border-primary/40 bg-primary/10'
                      : 'border-border bg-transparent'
                }`}
              >
                {done ? <Check aria-hidden="true" className="h-3 w-3" /> : `0${s.id}`}
              </span>
              {s.label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}


function ThemeCards({
  value,
  onChange,
  error,
}: {
  value: string
  onChange: (v: string) => void
  error?: string
}) {
  return (
    <div>
      <p className="text-sm font-medium text-foreground">
        Theme<span aria-hidden="true" className="ml-0.5 text-destructive">*</span>
      </p>
      <div
        role="radiogroup"
        aria-label="Theme"
        className="mt-2 grid gap-3 sm:grid-cols-2"
      >
        {THEME_OPTIONS.map((t) => {
          const selected = value === t.value
          return (
            <button
              key={t.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(t.value)}
              className={`rounded-xl border p-4 text-left transition-[border-color,background-color] duration-300 ease-out focus-ring ${
                selected
                  ? 'border-primary/60 bg-primary/10 shadow-[0_0_24px_rgba(79,143,90,0.18)]'
                  : 'border-primary/15 bg-surface/60 hover:border-primary/40'
              }`}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="font-display text-base font-bold tracking-wide text-foreground">
                  {t.title}
                </span>
                <span
                  aria-hidden="true"
                  className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                    selected
                      ? 'border-primary-bright bg-primary/30'
                      : 'border-border'
                  }`}
                >
                  {selected && <Check className="h-3 w-3 text-primary-bright" />}
                </span>
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                {t.description}
              </span>
            </button>
          )
        })}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

function SummaryRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 sm:block">
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{k}</dt>
      <dd className="truncate font-medium text-foreground">{v}</dd>
    </div>
  )
}

function SuccessRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-primary/10 pb-3 last:border-b-0 last:pb-0">
      <dt className="text-hud shrink-0 text-primary/60">{k}</dt>
      <dd className="text-right font-medium text-foreground">{v}</dd>
    </div>
  )
}


/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function RegistrationPage() {
  const [step, setStep] = useState<StepId>(1)
  const [form, setForm] = useState<FormState>(initialState)
  const [errors, setErrors] = useState<Errors>({})
  const [apiError, setApiError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [team, setTeam] = useState<TeamRecord | null>(null)

  const totalStudents = 1 + form.members.length

  const update = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }))

  const updateLeader = (patch: Partial<LeaderFields>) =>
    setForm((f) => ({ ...f, leader: { ...f.leader, ...patch } }))

  const updateMember = (index: number, patch: Partial<MemberRow>) =>
    setForm((f) => ({
      ...f,
      members: f.members.map((m, i) => (i === index ? { ...m, ...patch } : m)),
    }))

  const addMember = () => {
    if (totalStudents >= MAX_TEAM_SIZE) return
    setForm((f) => ({ ...f, members: [...f.members, emptyMember()] }))
  }

  const removeMember = (index: number) =>
    setForm((f) => ({ ...f, members: f.members.filter((_, i) => i !== index) }))

  const step2Valid = useMemo(
    () =>
      Object.keys(validateStep2(form)).length === 0 &&
      totalStudents >= MIN_TEAM_SIZE,
    [form, totalStudents],
  )

  const goNext = () => {
    const e = validateStep1(form)
    setErrors(e)
    if (Object.keys(e).length === 0) {
      setApiError(null)
      setStep(2)
    }
  }

  const goBack = () => {
    setErrors({})
    setApiError(null)
    setStep(1)
  }

  const submit = async () => {
    const e = validateStep2(form)
    setErrors(e)
    if (Object.keys(e).length > 0 || totalStudents < MIN_TEAM_SIZE) return

    setSubmitting(true)
    setApiError(null)
    try {
      const record = await teamApi.create({
        team_name: form.team_name.trim(),
        theme: form.theme,
        leader_name: form.leader.name.trim(),
        leader_email: form.leader.email.trim().toLowerCase(),
        leader_register_number: form.leader.register_number.trim(),
        leader_department: form.leader.department,
        leader_year: form.leader.year,
        members: form.members.map((m) => ({
          name: m.name.trim(),
          email: m.email.trim().toLowerCase(),
          register_number: m.register_number.trim(),
          department: m.department,
          year: m.year,
        })),
      })
      setTeam(record)
      setStep(3)
    } catch (error) {
      const api = normalizeApiError(error)
      setApiError(api.message)
    } finally {
      setSubmitting(false)
    }
  }


  /* ---------------------------------------------------------------- */
  /* STEP 03 — SUCCESS                                                 */
  /* ---------------------------------------------------------------- */
  if (step === 3 && team) {
    return (
      <div className="relative">
        <DoomsdayBackground intensity="low" showWarningGlow={false} />
        <Container className="relative z-10 max-w-3xl py-20 sm:py-28">
          <div className="animate-hero-fade-up rounded-2xl border border-primary/20 bg-surface/70 p-6 text-center backdrop-blur-md sm:p-10">
            <p className="text-hud text-primary/80">REGISTRATION COMPLETE</p>
            <h1 className="text-glow-green mt-3 font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              TEAM REGISTERED
            </h1>
            <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-steel-bright sm:text-base">
              Your TechAFlon team has been successfully registered.
            </p>

            <div className="mt-8 rounded-xl border border-primary/30 bg-background/60 px-6 py-5">
              <p className="text-hud text-primary/70">TEAM ID</p>
              <p className="text-glow-green mt-1 font-mono text-2xl font-bold tracking-wider text-primary-bright sm:text-3xl">
                {team.team_id}
              </p>
            </div>

            <dl className="mt-8 space-y-3 text-left">
              <SuccessRow k="Team Name" v={team.team_name} />
              <SuccessRow k="Team Leader" v={team.leader_name} />
              <SuccessRow k="Department" v={team.leader_department} />
              <SuccessRow k="Year" v={team.leader_year} />
              <SuccessRow
                k="Theme"
                v={
                  THEME_OPTIONS.find((t) => t.value === team.theme)?.title ??
                  team.theme
                }
              />
            </dl>

            <div className="mt-8 rounded-xl border border-primary/15 bg-surface/60 p-5 text-left">
              <p className="text-hud text-primary/70">REGISTERED MEMBERS</p>
              <ol className="mt-3 space-y-2">
                <li className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-sm">
                  <span className="font-medium text-foreground">
                    <span className="mr-2 font-mono text-xs text-muted-foreground">
                      01
                    </span>
                    {team.leader_name}
                    <span className="ml-2 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] tracking-widest text-primary-bright">
                      TEAM LEADER
                    </span>
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {team.leader_register_number}
                  </span>
                </li>
                {team.members.map((m, i) => (
                  <li
                    key={`${m.register_number}-${i}`}
                    className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-sm"
                  >
                    <span className="font-medium text-foreground">
                      <span className="mr-2 font-mono text-xs text-muted-foreground">
                        {String(i + 2).padStart(2, '0')}
                      </span>
                      {m.name}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {m.register_number}
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            <p className="mt-6 text-sm text-muted-foreground">
              Registration confirmation has been sent to the Team Leader's email
              address.
            </p>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link to="/" className="w-full sm:w-auto">
                <Button variant="outline" className="w-full">
                  BACK TO HOME
                </Button>
              </Link>
              <Link to="/problems" className="w-full sm:w-auto">
                <Button className="glow-reactor w-full">VIEW MISSIONS</Button>
              </Link>
            </div>
          </div>
        </Container>
      </div>
    )
  }


  /* ---------------------------------------------------------------- */
  /* STEPS 01–02                                                       */
  /* ---------------------------------------------------------------- */
  return (
    <div className="relative overflow-hidden">
      <DoomsdayBackground intensity="low" showWarningGlow={false} />

      <Container className="relative z-10 max-w-3xl py-14 sm:py-20">
        {/* Header */}
        <header className="animate-hero-fade-up text-center">
          <p className="text-hud text-primary-bright">
            CSSA // REGISTRATION TERMINAL
          </p>
          <h1 className="text-glow-green mt-3 font-display text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
            Register your team.
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-steel-bright sm:text-base">
            One registration per team — submitted by the Team Leader. Assemble{' '}
            {MIN_TEAM_SIZE}–{MAX_TEAM_SIZE} students before the clock runs out.
          </p>
        </header>

        {/* Panel */}
        <div className="animate-hero-fade-up mt-10 rounded-2xl border border-primary/20 bg-surface/70 p-5 backdrop-blur-md sm:p-8">
          <StepIndicator step={step as Exclude<StepId, 3>} />

          {apiError && (
            <div
              role="alert"
              className="mt-6 flex items-start gap-2 rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger-bright"
            >
              <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{apiError}</span>
            </div>
          )}


          {/* ── STEP 01 · TEAM DETAILS ─────────────────────────────── */}
          {step === 1 && (
            <div key="step-1" className="animate-hero-fade-up mt-7 space-y-5">
              <Field
                label="Team Name"
                htmlFor="team_name"
                required
                error={fieldError(errors, 'team_name')}
              >
                <Input
                  id="team_name"
                  value={form.team_name}
                  invalid={!!fieldError(errors, 'team_name')}
                  onChange={(e) => update({ team_name: e.target.value })}
                  placeholder="e.g. Avengers Prime"
                  autoComplete="off"
                />
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="Team Leader Name"
                  htmlFor="leader_name"
                  required
                  error={fieldError(errors, 'leader.name')}
                >
                  <Input
                    id="leader_name"
                    value={form.leader.name}
                    invalid={!!fieldError(errors, 'leader.name')}
                    onChange={(e) => updateLeader({ name: e.target.value })}
                    placeholder="Full name"
                    autoComplete="name"
                  />
                </Field>
                <Field
                  label="Register Number"
                  htmlFor="leader_reg"
                  required
                  error={fieldError(errors, 'leader.register_number')}
                >
                  <Input
                    id="leader_reg"
                    value={form.leader.register_number}
                    invalid={!!fieldError(errors, 'leader.register_number')}
                    onChange={(e) =>
                      updateLeader({ register_number: e.target.value })
                    }
                    placeholder="e.g. 7126XX24XXX"
                    autoComplete="off"
                  />
                </Field>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="Email ID"
                  htmlFor="leader_email"
                  required
                  hint="Confirmation is sent here."
                  error={fieldError(errors, 'leader.email')}
                >
                  <Input
                    id="leader_email"
                    type="email"
                    value={form.leader.email}
                    invalid={!!fieldError(errors, 'leader.email')}
                    onChange={(e) => updateLeader({ email: e.target.value })}
                    placeholder="leader@example.com"
                    autoComplete="email"
                  />
                </Field>
                <Field
                  label="Department"
                  htmlFor="leader_dept"
                  required
                  error={fieldError(errors, 'leader.department')}
                >
                  <Select
                    id="leader_dept"
                    value={form.leader.department}
                    invalid={!!fieldError(errors, 'leader.department')}
                    onChange={(e) => updateLeader({ department: e.target.value })}
                  >
                    <option value="">Select department</option>
                    {DEPARTMENT_OPTIONS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="Year of Study"
                  htmlFor="leader_year"
                  required
                  error={fieldError(errors, 'leader.year')}
                >
                  <Select
                    id="leader_year"
                    value={form.leader.year}
                    invalid={!!fieldError(errors, 'leader.year')}
                    onChange={(e) => updateLeader({ year: e.target.value })}
                  >
                    <option value="">Select year</option>
                    {YEAR_OPTIONS.map((y) => (
                      <option key={y.value} value={y.value}>
                        {y.label}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>

              <ThemeCards
                value={form.theme}
                onChange={(theme) => update({ theme })}
                error={fieldError(errors, 'theme')}
              />

              <div className="pt-2">
                <Button type="button" size="lg" className="w-full" onClick={goNext}>
                  CONTINUE
                </Button>
              </div>
            </div>
          )}


          {/* ── STEP 02 · TEAM MEMBERS ─────────────────────────────── */}
          {step === 2 && (
            <div key="step-2" className="animate-hero-fade-up mt-7">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-bold text-foreground">
                    TEAM MEMBERS
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Minimum {MIN_TEAM_SIZE} students and maximum {MAX_TEAM_SIZE}{' '}
                    students per team.
                  </p>
                </div>
                <div
                  aria-live="polite"
                  className={`rounded-full border px-4 py-2 text-center ${
                    totalStudents >= MIN_TEAM_SIZE
                      ? 'border-primary/40 bg-primary/10'
                      : 'border-danger/50 bg-danger/10'
                  }`}
                >
                  <p className="text-hud text-muted-foreground">TEAM SIZE</p>
                  <p
                    className={`font-mono text-sm font-bold ${
                      totalStudents >= MIN_TEAM_SIZE
                        ? 'text-primary-bright'
                        : 'text-danger-bright'
                    }`}
                  >
                    {totalStudents} / {MAX_TEAM_SIZE} STUDENTS
                    {totalStudents < MIN_TEAM_SIZE && (
                      <span className="ml-1 font-sans text-[10px] font-medium normal-case tracking-normal">
                        (min {MIN_TEAM_SIZE})
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Leader summary — auto-filled from Step 01 */}
              <div className="mt-6 rounded-xl border border-primary/30 bg-primary/5 p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-hud text-primary/80">MEMBER 1</p>
                  <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold tracking-widest text-primary-bright">
                    TEAM LEADER
                  </span>
                </div>
                <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                  <SummaryRow k="Name" v={form.leader.name || '—'} />
                  <SummaryRow
                    k="Register Number"
                    v={form.leader.register_number || '—'}
                  />
                  <SummaryRow k="Email" v={form.leader.email || '—'} />
                  <SummaryRow k="Department" v={form.leader.department || '—'} />
                  <SummaryRow
                    k="Year"
                    v={
                      YEAR_OPTIONS.find((y) => y.value === form.leader.year)?.label ??
                      '—'
                    }
                  />
                  <SummaryRow
                    k="Theme"
                    v={THEME_OPTIONS.find((t) => t.value === form.theme)?.title ?? '—'}
                  />
                </dl>
              </div>


              {/* Additional members */}
              <div className="mt-5 space-y-4">
                {form.members.map((member, i) => (
                  <fieldset
                    key={i}
                    className="rounded-xl border border-primary/15 bg-surface/60 p-5"
                  >
                    <legend className="sr-only">Member {i + 2}</legend>
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <p className="text-hud text-primary/80">
                        MEMBER {String(i + 2).padStart(2, '0')}
                      </p>
                      <button
                        type="button"
                        onClick={() => removeMember(i)}
                        aria-label={`Remove member ${i + 2}`}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-danger/30 text-danger-bright transition-colors duration-300 ease-out hover:bg-danger/10 focus-ring"
                      >
                        <Trash2 aria-hidden="true" className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field
                          label="Name"
                          htmlFor={`m${i}-name`}
                          required
                          error={fieldError(errors, `members.${i}.name`)}
                        >
                          <Input
                            id={`m${i}-name`}
                            value={member.name}
                            invalid={!!fieldError(errors, `members.${i}.name`)}
                            onChange={(e) => updateMember(i, { name: e.target.value })}
                            placeholder="Full name"
                            autoComplete="off"
                          />
                        </Field>
                        <Field
                          label="Register Number"
                          htmlFor={`m${i}-reg`}
                          required
                          error={fieldError(errors, `members.${i}.register_number`)}
                        >
                          <Input
                            id={`m${i}-reg`}
                            value={member.register_number}
                            invalid={!!fieldError(
                              errors,
                              `members.${i}.register_number`,
                            )}
                            onChange={(e) =>
                              updateMember(i, { register_number: e.target.value })
                            }
                            placeholder="e.g. 7126XX24XXX"
                            autoComplete="off"
                          />
                        </Field>
                      </div>


                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field
                          label="Email ID"
                          htmlFor={`m${i}-email`}
                          required
                          error={fieldError(errors, `members.${i}.email`)}
                        >
                          <Input
                            id={`m${i}-email`}
                            type="email"
                            value={member.email}
                            invalid={!!fieldError(errors, `members.${i}.email`)}
                            onChange={(e) => updateMember(i, { email: e.target.value })}
                            placeholder="member@example.com"
                            autoComplete="off"
                          />
                        </Field>
                        <div className="grid grid-cols-2 gap-4">
                          <Field
                            label="Department"
                            htmlFor={`m${i}-dept`}
                            required
                            error={fieldError(errors, `members.${i}.department`)}
                          >
                            <Select
                              id={`m${i}-dept`}
                              value={member.department}
                              invalid={!!fieldError(errors, `members.${i}.department`)}
                              onChange={(e) =>
                                updateMember(i, { department: e.target.value })
                              }
                            >
                              <option value="">Select</option>
                              {DEPARTMENT_OPTIONS.map((d) => (
                                <option key={d} value={d}>
                                  {d}
                                </option>
                              ))}
                            </Select>
                          </Field>
                          <Field
                            label="Year"
                            htmlFor={`m${i}-year`}
                            required
                            error={fieldError(errors, `members.${i}.year`)}
                          >
                            <Select
                              id={`m${i}-year`}
                              value={member.year}
                              invalid={!!fieldError(errors, `members.${i}.year`)}
                              onChange={(e) => updateMember(i, { year: e.target.value })}
                            >
                              <option value="">Select</option>
                              {YEAR_OPTIONS.map((y) => (
                                <option key={y.value} value={y.value}>
                                  {y.label}
                                </option>
                              ))}
                            </Select>
                          </Field>
                        </div>
                      </div>
                    </div>
                  </fieldset>
                ))}
              </div>


              {/* Add member */}
              <button
                type="button"
                onClick={addMember}
                disabled={totalStudents >= MAX_TEAM_SIZE}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-primary/40 px-4 py-4 text-sm font-medium text-primary-bright transition-colors duration-300 ease-out hover:bg-primary/10 focus-ring disabled:pointer-events-none disabled:opacity-40"
              >
                <Plus aria-hidden="true" className="h-4 w-4" />
                ADD MEMBER
              </button>

              {/* Navigation */}
              <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto"
                  onClick={goBack}
                >
                  BACK
                </Button>
                <Button
                  type="button"
                  size="lg"
                  className="glow-reactor w-full flex-1"
                  onClick={submit}
                  disabled={!step2Valid || submitting}
                >
                  {submitting ? (
                    <>
                      <Spinner size="sm" /> REGISTERING...
                    </>
                  ) : (
                    'REGISTER TEAM'
                  )}
                </Button>
              </div>
              {!step2Valid && (
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  Fill every member's details to enable registration
                  {totalStudents < MIN_TEAM_SIZE &&
                    ` — at least ${MIN_TEAM_SIZE} students are required.`}
                </p>
              )}
            </div>
          )}
        </div>
      </Container>
    </div>
  )
}

