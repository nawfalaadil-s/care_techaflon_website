import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button, LinkButton } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Container } from '@/components/ui/container'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'

/* ------------------------------------------------------------------
 * Token data (mirrors index.css for display only)
 * ------------------------------------------------------------------ */

const colors: Array<{ name: string; var: string; fgVar?: string }> = [
  { name: 'background', var: '--background' },
  { name: 'foreground', var: '--foreground' },
  { name: 'card', var: '--card' },
  { name: 'primary', var: '--primary', fgVar: '--primary-foreground' },
  { name: 'secondary', var: '--secondary' },
  { name: 'muted', var: '--muted' },
  { name: 'accent', var: '--accent' },
  { name: 'success', var: '--success' },
  { name: 'warning', var: '--warning' },
  { name: 'destructive', var: '--destructive' },
  { name: 'info', var: '--info' },
  { name: 'border', var: '--border' },
]

const radiusMap = [
  { label: 'xs', cls: 'rounded-xs' },
  { label: 'sm', cls: 'rounded-sm' },
  { label: 'md', cls: 'rounded-md' },
  { label: 'lg', cls: 'rounded-lg' },
  { label: 'xl', cls: 'rounded-xl' },
  { label: '2xl', cls: 'rounded-2xl' },
  { label: 'full', cls: 'rounded-full' },
]

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-24 border-b pb-10">
      <h2 className="text-xl sm:text-2xl">{title}</h2>
      <p className="mb-6 mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
        {description}
      </p>
      {children}
    </section>
  )
}

const navItems = [
  ['#colors', 'Colors'],
  ['#typography', 'Typography'],
  ['#radius', 'Radius'],
  ['#buttons', 'Buttons'],
  ['#badges', 'Badges'],
  ['#forms', 'Forms'],
  ['#cards', 'Cards'],
  ['#feedback', 'Feedback'],
] as const

export default function DesignSystemPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')

  function validateEmail(value: string) {
    setEmail(value)
    setError(/^\S+@\S+\.\S+$/.test(value) ? '' : 'Enter a valid email address.')
  }

  return (
    <Container className="py-8 sm:py-12">
      <header className="mb-10">
        <Badge variant="outline">Phase 2</Badge>
        <h1 className="mt-3 text-3xl sm:text-4xl">Design System</h1>
        <p className="mt-3 max-w-2xl text-base text-muted-foreground">
          The mobile-first foundation every page is built on. Resize to
          320px–1920px or toggle dark mode with the button in the header
          to validate contrast and spacing.
        </p>
      </header>

      <nav
        aria-label="Sections"
        className="mb-10 flex flex-wrap gap-2 border-y py-3"
      >
        {navItems.map(([href, label]) => (
          <a
            key={href}
            href={href}
            className="rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            {label}
          </a>
        ))}
      </nav>

      <div className="space-y-10">
        <Section
          id="colors"
          title="Colors"
          description="Pure OKLCH tokens mapped to Tailwind utilities. The same variables re-theme automatically in dark mode."
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {colors.map((c) => (
              <div
                key={c.name}
                className="overflow-hidden rounded-lg border shadow-card"
              >
                <div
                  className="flex h-16 items-end p-2 sm:h-20"
                  style={{ backgroundColor: `var(${c.var})` }}
                >
                  <span
                    className="truncate rounded px-1 text-xs font-semibold"
                    style={{ color: `var(${c.fgVar ?? '--foreground'})` }}
                  >
                    {c.name}
                  </span>
                </div>
                <div className="px-3 py-2 text-xs text-muted-foreground">
                  <code>{c.var}</code>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section
          id="typography"
          title="Typography"
          description="Display font (Space Grotesk) for headings, Inter for body. Line-height 1.1 for headings, 1.6 for body — tuned so 320px never wraps awkwardly."
        >
          <div className="space-y-4">
            <p className="text-3xl font-display font-bold leading-tight sm:text-5xl">
              A hackathon looks like this heading
            </p>
            <p className="text-2xl font-display font-semibold sm:text-3xl">
              Section heading — 24 / 30px
            </p>
            <p className="text-lg font-display font-semibold">Card title — 18px</p>
            <p className="max-w-2xl text-base">
              Body text. Every paragraph uses <code>text-wrap: pretty</code> to
              keep ragged edges tidy on narrow screens, and balanced line
              wrapping on headings. Contrast is validated at 14px+ for small
              screen readability.
            </p>
            <p className="text-sm text-muted-foreground">
              Muted / caption text — 14px, muted-foreground.
            </p>
            <p className="font-mono text-sm">
              Mono — for code, IDs and timestamps: 0x7F3E, 2026-08-21
            </p>
          </div>
        </Section>

        <Section
          id="radius"
          title="Border radius"
          description="A consistent radius scale keeps interactions feeling cohesive."
        >
          <div className="flex flex-wrap gap-4">
            {radiusMap.map((r) => (
              <div key={r.label} className="text-center">
                <div
                  className={`h-14 w-14 bg-primary ${r.cls} flex items-center justify-center text-xs font-semibold text-primary-foreground`}
                >
                  {r.label}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{r.cls}</p>
              </div>
            ))}
          </div>
        </Section>
        <Section
          id="buttons"
          title="Buttons"
          description="All sizes keep a 44px touch target on mobile, easing to 40px on larger screens. Disabled and destructive states included."
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Delete</Button>
              <Button variant="success">Success</Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
              <Button size="icon" aria-label="Settings">
                ⚙
              </Button>
              <Button disabled>Disabled</Button>
              <LinkButton to="/design-system#buttons" variant="outline">
                Link button
              </LinkButton>
            </div>
          </div>
        </Section>

        <Section
          id="badges"
          title="Badges"
          description="Compact status and category labels."
        >
          <div className="flex flex-wrap items-center gap-2">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="success">Open</Badge>
            <Badge variant="warning">Closing soon</Badge>
            <Badge variant="destructive">Closed</Badge>
            <Badge variant="info">Info</Badge>
          </div>
        </Section>

        <Section
          id="forms"
          title="Forms"
          description="Input, textarea, select and the composable Field wrapper with label, hint and error states."
        >
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardContent className="space-y-4">
                <Field label="Full name" htmlFor="ds-name" hint="As shown on your college ID.">
                  <Input id="ds-name" placeholder="Jane Doe" />
                </Field>

                <Field
                  label="Email address"
                  htmlFor="ds-email"
                  required
                  error={error || undefined}
                >
                  <Input
                    id="ds-email"
                    type="email"
                    value={email}
                    invalid={Boolean(error)}
                    placeholder="jane@college.edu"
                    onChange={(e) => validateEmail(e.target.value)}
                  />
                </Field>

                <Field label="Track" htmlFor="ds-track">
                  <Select id="ds-track" defaultValue="">
                    <option value="" disabled>
                      Select a track…
                    </option>
                    <option value="ai">AI & ML</option>
                    <option value="web">Web</option>
                    <option value="mobile">Mobile</option>
                  </Select>
                </Field>

                <Field label="Bio" htmlFor="ds-bio">
                  <Textarea id="ds-bio" rows={3} placeholder="Tell us about yourself…" />
                </Field>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Standalone fields</CardTitle>
                <CardDescription>
                  Each primitive also works with the plain Label wrapper.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="ds-city">City</Label>
                  <Input id="ds-city" placeholder="Bengaluru" />
                </div>
                <div>
                  <Label htmlFor="ds-count">Team size</Label>
                  <Select id="ds-count" defaultValue="4">
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5</option>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        </Section>

        <Section
          id="cards"
          title="Cards"
          description="Surface container plus header, title, content and footer slots."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <Badge variant="success" className="self-start">
                  Live
                </Badge>
                <CardTitle>Innovate 48h</CardTitle>
                <CardDescription>
                  48 hours to solve a real-world problem.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Teams of up to 4. Submissions open Friday 9:00 AM.
                </p>
              </CardContent>
              <CardFooter className="justify-end">
                <Button size="sm">Apply</Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Prize pool</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(
                  [
                    ['1st place', '₹100,000'],
                    ['2nd place', '₹60,000'],
                    ['3rd place', '₹40,000'],
                  ] as const
                ).map(([place, amount]) => (
                  <div
                    key={place}
                    className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                  >
                    <span>{place}</span>
                    <span className="font-display font-semibold">{amount}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </Section>

        <Section
          id="feedback"
          title="Feedback and loading"
          description="Spinner with role status and a screen-reader-only label."
        >
          <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <Spinner size="sm" /> Small
            </span>
            <span className="inline-flex items-center gap-2">
              <Spinner size="md" /> Medium
            </span>
            <span className="inline-flex items-center gap-2">
              <Spinner size="lg" /> Large
            </span>
          </div>
        </Section>

      </div>
    </Container>
  )
}


