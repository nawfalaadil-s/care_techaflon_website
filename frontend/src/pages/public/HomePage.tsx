import { useEffect, useState } from 'react'

import { LinkButton } from '@/components/ui/button'
import { Container } from '@/components/ui/container'
import { DoomsdayBackground } from '@/components/effects/DoomsdayBackground'
import { DoomCore } from '@/components/home/DoomCore'
import { Reveal } from '@/components/common/Reveal'
import { homeContent } from '@/data/home'

/** Event Phase 1 — 28 August 2026, Asia/Kolkata. */
const EVENT_DATE = new Date('2026-08-28T10:00:00+05:30')

const TIMELINE = [
  { date: '24 AUG', label: 'REGISTRATION OPENS' },
  { date: '26 AUG', label: 'REGISTRATION CLOSES' },
  { date: '28 AUG', label: 'EVENT PHASE 01' },
] as const

const ELIGIBILITY = [
  { value: '3–4', label: 'STUDENTS' },
  { value: 'CSE × AI & DS', label: 'DEPARTMENTS' },
  { value: '2ND • 3RD • FINAL', label: 'YEAR' },
] as const

const PRIZES = [
  { rank: 'RANK 01', title: 'FIRST PRIZE', amount: '₹3,000', winner: true },
  { rank: 'RANK 02', title: 'SECOND PRIZE', amount: '₹2,000', winner: false },
  { rank: 'RANK 03', title: 'THIRD PRIZE', amount: '₹1,000', winner: false },
] as const

function calculateTimeLeft(target: Date) {
  const diff = Math.max(target.getTime() - Date.now(), 0)
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor(diff / 3_600_000) % 24,
    minutes: Math.floor(diff / 60_000) % 60,
    seconds: Math.floor(diff / 1_000) % 60,
  }
}

function useTimeLeft(target: Date) {
  const [timeLeft, setTimeLeft] = useState(() => calculateTimeLeft(target))

  useEffect(() => {
    const id = window.setInterval(() => setTimeLeft(calculateTimeLeft(target)), 1000)
    return () => window.clearInterval(id)
  }, [target])

  return timeLeft
}

/** Compact dark-glass countdown — lives inside the hero flow, never sticky. */
function HeroCountdown() {
  const t = useTimeLeft(EVENT_DATE)
  const units = [
    { label: 'DAYS', value: t.days },
    { label: 'HOURS', value: t.hours },
    { label: 'MINUTES', value: t.minutes },
    { label: 'SECONDS', value: t.seconds },
  ]

  return (
    <div className="inline-flex flex-col items-start gap-3">
      <p className="text-hud flex items-center gap-2 text-primary/80">
        <span
          aria-hidden="true"
          className="animate-pulse h-1.5 w-1.5 rounded-full bg-primary-bright"
        />
        DOOMSDAY COUNTDOWN
      </p>
      <div className="rounded-xl border border-primary/25 bg-background/60 px-5 py-4 shadow-[0_0_40px_rgba(79,143,90,0.15)] backdrop-blur-md sm:px-7 sm:py-5">
        <ol className="flex items-start font-mono tabular-nums">
          {units.map((u, i) => (
            <li key={u.label} className="flex items-start">
              {i > 0 && (
                <span aria-hidden="true" className="mx-2.5 mt-1 text-primary/40 sm:mx-3.5">
                  :
                </span>
              )}
              <span className="flex flex-col items-center gap-1">
                <span className="text-xl font-semibold text-primary-bright sm:text-2xl lg:text-3xl">
                  {String(u.value).padStart(2, '0')}
                </span>
                <span className="text-[9px] tracking-[0.18em] text-muted-foreground sm:text-[10px]">
                  {u.label}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}

function SectionHeading({ index, title }: { index: string; title: string }) {
  return (
    <div className="mb-10 sm:mb-14">
      <p className="text-hud text-primary/70">{index}</p>
      <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-4xl">
        {title}
      </h2>
      <div
        aria-hidden="true"
        className="mt-4 h-px w-16 bg-gradient-to-r from-primary to-transparent"
      />
    </div>
  )
}

export default function HomePage() {
  const { tracks } = homeContent

  return (
    <div className="relative">
      <DoomsdayBackground intensity="medium" showWarningGlow={false} />

      <main className="relative z-10">
        {/* ── 01 · HERO ────────────────────────────────────────────── */}
        <section className="relative overflow-hidden">
          <Container className="flex min-h-[calc(100dvh-4rem)] flex-col justify-center py-16 sm:py-20">
            <div className="grid items-center gap-16 min-[480px]:gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 xl:gap-20">
              <div className="max-w-xl">
                <p className="animate-hero-fade-up text-hud text-primary-bright">
                  CSSA PRESENTS
                </p>

                <h1
                  className="animate-hero-fade-up text-glow-green mt-4 font-display text-5xl font-bold leading-[0.95] tracking-tight text-foreground sm:mt-5 sm:text-7xl lg:text-8xl"
                  style={{ animationDelay: '80ms' }}
                >
                  TECHAFLON
                </h1>

                <p
                  className="animate-hero-fade-up mt-4 bg-gradient-to-r from-primary-bright via-emerald-300 to-primary-bright bg-clip-text font-display text-lg font-bold tracking-[0.08em] text-transparent sm:mt-5 sm:text-2xl lg:text-3xl"
                  style={{ animationDelay: '160ms' }}
                >
                  THE DOOMSDAY PROTOCOL
                </p>

                <p
                  className="animate-hero-fade-up mt-6 max-w-lg text-base leading-relaxed text-steel-bright sm:text-lg"
                  style={{ animationDelay: '240ms' }}
                >
                  The clock is running. Build what comes next.
                </p>

                <div
                  className="animate-hero-fade-up mt-7 flex flex-wrap items-center gap-x-3 gap-y-2"
                  style={{ animationDelay: '300ms' }}
                >
                  <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary-bright">
                    CSE × AI &amp; DS
                  </span>
                  <span className="font-mono text-xs tracking-widest text-muted-foreground">
                    28 AUGUST 2026 · CARE COLLEGE OF ENGINEERING, TRICHY
                  </span>
                </div>

                <div
                  className="animate-hero-fade-up mt-9 flex flex-col gap-4 sm:flex-row sm:items-center"
                  style={{ animationDelay: '360ms' }}
                >
                  <LinkButton
                    to="/register"
                    size="lg"
                    className="glow-reactor w-full sm:w-auto"
                  >
                    REGISTER YOUR TEAM
                  </LinkButton>
                  <LinkButton
                    to="/login"
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto"
                  >
                    ENTER PORTAL
                  </LinkButton>
                </div>

                <div
                  className="animate-hero-fade-up mt-12"
                  style={{ animationDelay: '420ms' }}
                >
                  <HeroCountdown />
                </div>
              </div>

              {/* DOOM CORE — below the copy on mobile, beside it on desktop */}
              <Reveal direction="none" delay={200} className="lg:justify-self-center">
                <DoomCore className="w-full min-[480px]:max-w-[420px]" />
              </Reveal>
            </div>
          </Container>
        </section>

        {/* ── 02 · THE MISSION ─────────────────────────────────────── */}
        <section className="border-t border-primary/10 py-20 sm:py-24 lg:py-28">
          <Container>
            <Reveal>
              <SectionHeading index="02 // THE MISSION" title="One event. Two departments." />
              <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                TechAFlon is an internal hackathon by CSSA for CSE and AI &amp; DS
                students of CARE College of Engineering, Trichy.
              </p>
              <p className="text-hud mt-8 inline-flex items-center gap-3 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-primary/80">
                <span aria-hidden="true" className="h-1 w-1 rounded-full bg-primary-bright" />
                VICTOR VON DOOM // THE FUTURE HAS ARRIVED
              </p>
            </Reveal>
          </Container>
        </section>

        {/* ── 03 · THE BATTLEFIELD ─────────────────────────────────── */}
        <section className="border-t border-primary/10 py-20 sm:py-24 lg:py-28">
          <Container>
            <Reveal>
              <SectionHeading index="03 // THE BATTLEFIELD" title="Choose your battlefield." />
            </Reveal>
            <div className="grid gap-5 min-[480px]:gap-6 sm:grid-cols-3 sm:gap-6 lg:gap-8">
              {tracks.map((track, i) => (
                <Reveal key={track.id} delay={i * 90} className="h-full">
                  <article className="group h-full rounded-xl border border-primary/15 bg-surface/60 p-6 backdrop-blur-sm transition-[border-color,background-color] duration-300 ease-out hover:border-primary/40 sm:p-8">
                    <span
                      aria-hidden="true"
                      className="text-2xl text-primary transition-colors group-hover:text-primary-bright"
                    >
                      {track.icon}
                    </span>
                    <h3 className="mt-5 font-display text-lg font-semibold tracking-wide text-foreground">
                      {track.title}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      {track.description}
                    </p>
                  </article>
                </Reveal>
              ))}
            </div>
          </Container>
        </section>

        {/* ── 04 · ELIGIBILITY ─────────────────────────────────────── */}
        <section className="border-t border-primary/10 py-20 sm:py-24 lg:py-28">
          <Container>
            <Reveal>
              <SectionHeading index="04 // ELIGIBILITY" title="Who can enter." />
            </Reveal>
            <dl className="grid gap-5 min-[480px]:gap-6 sm:grid-cols-3 sm:gap-6 lg:gap-8">
              {ELIGIBILITY.map((item, i) => (
                <Reveal key={item.label} delay={i * 90} className="h-full">
                  <div className="flex h-full flex-col items-center justify-center rounded-xl border border-primary/15 bg-surface/60 px-6 py-9 text-center backdrop-blur-sm sm:px-8">
                    <dd className="font-display text-xl font-bold text-primary-bright sm:text-2xl">
                      {item.value}
                    </dd>
                    <dt className="text-hud mt-3 text-muted-foreground">{item.label}</dt>
                  </div>
                </Reveal>
              ))}
            </dl>
          </Container>
        </section>

        {/* ── 05 · PRIZE POOL ──────────────────────────────────────── */}
        <section className="border-t border-primary/10 py-20 sm:py-24 lg:py-28">
          <Container>
            <Reveal>
              <SectionHeading index="05 // PRIZE POOL" title="Claim the purse." />
            </Reveal>
            <div className="grid gap-5 min-[480px]:gap-6 sm:grid-cols-3 sm:gap-6 lg:gap-8">
              {PRIZES.map((prize, i) => (
                <Reveal key={prize.rank} delay={i * 90} className="h-full">
                  <div
                    className={`relative flex h-full flex-col items-center justify-center rounded-xl border px-6 py-9 text-center backdrop-blur-sm sm:px-8 ${
                      prize.winner
                        ? 'glow-reactor border-primary/50 bg-primary/10'
                        : 'border-primary/15 bg-surface/60'
                    }`}
                  >
                    {prize.winner && (
                      <span
                        aria-hidden="true"
                        className="text-hud absolute -top-3 rounded-full border border-primary/40 bg-background px-3 py-1 text-[10px] text-primary-bright"
                      >
                        ★ CHAMPION
                      </span>
                    )}
                    <p className="text-hud text-muted-foreground">{prize.rank}</p>
                    <dd
                      className={`mt-3 font-display font-bold tabular-nums ${
                        prize.winner
                          ? 'text-glow-green text-4xl text-primary-bright sm:text-5xl'
                          : 'text-3xl text-foreground sm:text-4xl'
                      }`}
                    >
                      {prize.amount}
                    </dd>
                    <dt className="text-hud mt-3 text-muted-foreground">{prize.title}</dt>
                  </div>
                </Reveal>
              ))}
            </div>
            <Reveal delay={280}>
              <p className="text-hud mt-8 inline-flex items-center gap-3 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-primary/80">
                <span aria-hidden="true" className="h-1 w-1 rounded-full bg-primary-bright" />
                TOTAL PURSE ₹6,000 · WINNERS ANNOUNCED AT THE CLOSING CEREMONY
              </p>
            </Reveal>
          </Container>
        </section>

        {/* ── 06 · EVENT TIMELINE ──────────────────────────────────── */}
        <section className="border-t border-primary/10 py-20 sm:py-24 lg:py-28">
          <Container>
            <Reveal>
              <SectionHeading index="06 // EVENT TIMELINE" title="The road to Doomsday." />
            </Reveal>
            <ol className="max-w-xl">
              {TIMELINE.map((entry, i) => (
                <li key={entry.date}>
                  <Reveal delay={i * 90}>
                    <div className="flex items-center gap-5 border-b border-primary/10 py-6 last:border-b-0 sm:gap-8 sm:py-7">
                      <span className="w-16 shrink-0 font-mono text-sm font-semibold tracking-wider text-primary-bright sm:w-20 sm:text-base">
                        {entry.date}
                      </span>
                      <span
                        aria-hidden="true"
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                          i === TIMELINE.length - 1
                            ? 'animate-pulse bg-danger-bright'
                            : 'bg-primary'
                        }`}
                      />
                      <span className="text-sm font-medium tracking-wide text-foreground sm:text-base">
                        {entry.label}
                      </span>
                    </div>
                  </Reveal>
                </li>
              ))}
            </ol>
          </Container>
        </section>

        {/* ── 06 · FINAL CTA ───────────────────────────────────────── */}
        <section className="relative overflow-hidden border-t border-primary/10 py-24 sm:py-32">
          <div
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 h-[420px] w-[720px] max-w-full -translate-x-1/2 -translate-y-1/2 rounded-full blur-[120px]"
            style={{
              background:
                'radial-gradient(circle, rgba(79,143,90,0.16) 0%, transparent 70%)',
            }}
          />
          <Container className="relative text-center">
            <Reveal direction="none">
              <p className="text-hud text-primary/70">FINAL CALL</p>
              <h2 className="text-glow-green mt-4 font-display text-4xl font-bold leading-none tracking-tight text-foreground sm:text-6xl lg:text-7xl">
                READY FOR DOOMSDAY?
              </h2>
              <p className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-steel-bright sm:text-base">
                Registration closes 26 August. Assemble your team before the
                clock runs out.
              </p>
              <div className="mt-10 flex justify-center">
                <LinkButton
                  to="/register"
                  size="lg"
                  className="glow-reactor w-full px-10 sm:w-auto"
                >
                  REGISTER YOUR TEAM
                </LinkButton>
              </div>
            </Reveal>
          </Container>
        </section>
      </main>
    </div>
  )
}

