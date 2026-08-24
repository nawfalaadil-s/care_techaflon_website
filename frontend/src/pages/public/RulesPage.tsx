import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Container } from '@/components/ui/container'

const RULES = [
  {
    text: 'Only CSE and AI & DS students may participate. Students from other departments are not eligible.',
    critical: true,
  },
  {
    text: 'Team size must be between 3 and 4 students (including the team leader).',
    critical: true,
  },
  {
    text: 'A student can participate in only one team. Your register number must be unique across all teams.',
    critical: true,
  },
  {
    text: 'Only the Team Leader can register the team and access the Team Portal.',
    critical: true,
  },
  {
    text: 'All team details must be accurate and verified. False information will lead to disqualification.',
    critical: true,
  },
  {
    text: 'Register numbers must be valid and match the student\'s official record.',
    critical: true,
  },
  {
    text: 'Teams may consist of CSE students only, AI & DS students only, or a combination of both departments.',
    critical: false,
  },
  {
    text: 'The selected development theme (AI/ML, Web Development, or App Development) must be provided during registration.',
    critical: false,
  },
  {
    text: 'Problem statements will be provided during Event Phase 1 on 28 August 2026.',
    critical: false,
  },
  {
    text: 'Project submission is available only when enabled by the administrator.',
    critical: false,
  },
  {
    text: 'Project submission is one-time only. Once submitted, it cannot be edited or withdrawn.',
    critical: true,
  },
  {
    text: 'GitHub and deployment links must be valid and accessible. Submitted links cannot be changed after submission.',
    critical: false,
  },
  {
    text: 'Submitted projects become the property of the event organizers for evaluation purposes.',
    critical: false,
  },
  {
    text: 'Admin decisions regarding eligibility, team approval, and event management are final.',
    critical: false,
  },
  {
    text: 'Teams must submit their project through the Team Portal when submission is enabled by the admin.',
    critical: false,
  },
  {
    text: 'Once the admin locks the submission, teams cannot edit their project details.',
    critical: true,
  },
]

export default function RulesPage() {
  return (
    <Container className="py-8 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8">
          <Badge variant="outline">Official</Badge>
          <h1 className="mt-3 text-3xl sm:text-4xl">TechAFlon Rules</h1>
          <p className="mt-2 text-muted-foreground">
            The rules for TechAFlon - The Doomsday Protocol. By participating, 
            you agree to these rules and the code of conduct.
          </p>
        </header>

        {/* Section anchors */}
        <nav aria-label="Rule sections" className="-mx-4 mb-10 overflow-x-auto px-4 pb-2">
          <ul className="flex w-max gap-2">
            <li>
              <a
                href="#general"
                className="inline-flex h-9 items-center whitespace-nowrap rounded-full border px-3.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                General
              </a>
            </li>
            <li>
              <a
                href="#teams"
                className="inline-flex h-9 items-center whitespace-nowrap rounded-full border px-3.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                Teams
              </a>
            </li>
            <li>
              <a
                href="#registration"
                className="inline-flex h-9 items-center whitespace-nowrap rounded-full border px-3.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                Registration
              </a>
            </li>
            <li>
              <a
                href="#submission"
                className="inline-flex h-9 items-center whitespace-nowrap rounded-full border px-3.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                Submission
              </a>
            </li>
            <li>
              <a
                href="#conduct"
                className="inline-flex h-9 items-center whitespace-nowrap rounded-full border px-3.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                Conduct
              </a>
            </li>
          </ul>
        </nav>

        <div className="space-y-8">
          {/* General Rules */}
          <section id="general" className="scroll-mt-24" aria-labelledby="rules-general">
            <h2 id="rules-general" className="mb-3 font-display text-xl font-semibold">
              General Rules
            </h2>
            <ol className="space-y-2.5">
              {RULES.slice(0, 2).map((rule, i) => (
                <li
                  key={i}
                  className={`flex gap-3 rounded-lg border p-3.5 text-sm leading-relaxed ${
                    rule.critical
                      ? 'border-warning/40 bg-warning/10'
                      : ''
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`mt-0.5 shrink-0 font-semibold ${
                      rule.critical ? 'text-warning' : 'text-primary'
                    }`}
                  >
                    {rule.critical ? '!' : '•'}
                  </span>
                  <span>{rule.text}</span>
                </li>
              ))}
            </ol>
          </section>

          {/* Team Rules */}
          <section id="teams" className="scroll-mt-24" aria-labelledby="rules-teams">
            <h2 id="rules-teams" className="mb-3 font-display text-xl font-semibold">
              Team Rules
            </h2>
            <ol className="space-y-2.5">
              {RULES.slice(2, 7).map((rule, i) => (
                <li
                  key={i}
                  className={`flex gap-3 rounded-lg border p-3.5 text-sm leading-relaxed ${
                    rule.critical
                      ? 'border-warning/40 bg-warning/10'
                      : ''
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`mt-0.5 shrink-0 font-semibold ${
                      rule.critical ? 'text-warning' : 'text-primary'
                    }`}
                  >
                    {rule.critical ? '!' : '•'}
                  </span>
                  <span>{rule.text}</span>
                </li>
              ))}
            </ol>
          </section>

          {/* Registration Rules */}
          <section id="registration" className="scroll-mt-24" aria-labelledby="rules-registration">
            <h2 id="rules-registration" className="mb-3 font-display text-xl font-semibold">
              Registration Rules
            </h2>
            <ol className="space-y-2.5">
              {RULES.slice(7, 9).map((rule, i) => (
                <li
                  key={i}
                  className={`flex gap-3 rounded-lg border p-3.5 text-sm leading-relaxed ${
                    rule.critical
                      ? 'border-warning/40 bg-warning/10'
                      : ''
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`mt-0.5 shrink-0 font-semibold ${
                      rule.critical ? 'text-warning' : 'text-primary'
                    }`}
                  >
                    {rule.critical ? '!' : '•'}
                  </span>
                  <span>{rule.text}</span>
                </li>
              ))}
            </ol>
          </section>

          {/* Submission Rules */}
          <section id="submission" className="scroll-mt-24" aria-labelledby="rules-submission">
            <h2 id="rules-submission" className="mb-3 font-display text-xl font-semibold">
              Submission Rules
            </h2>
            <ol className="space-y-2.5">
              {RULES.slice(9, 14).map((rule, i) => (
                <li
                  key={i}
                  className={`flex gap-3 rounded-lg border p-3.5 text-sm leading-relaxed ${
                    rule.critical
                      ? 'border-warning/40 bg-warning/10'
                      : ''
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`mt-0.5 shrink-0 font-semibold ${
                      rule.critical ? 'text-warning' : 'text-primary'
                    }`}
                  >
                    {rule.critical ? '!' : '•'}
                  </span>
                  <span>{rule.text}</span>
                </li>
              ))}
            </ol>
          </section>

          {/* Conduct Rules */}
          <section id="conduct" className="scroll-mt-24" aria-labelledby="rules-conduct">
            <h2 id="rules-conduct" className="mb-3 font-display text-xl font-semibold">
              Conduct & Final Notes
            </h2>
            <ol className="space-y-2.5">
              {RULES.slice(14).map((rule, i) => (
                <li
                  key={i}
                  className={`flex gap-3 rounded-lg border p-3.5 text-sm leading-relaxed ${
                    rule.critical
                      ? 'border-warning/40 bg-warning/10'
                      : ''
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`mt-0.5 shrink-0 font-semibold ${
                      rule.critical ? 'text-warning' : 'text-primary'
                    }`}
                  >
                    {rule.critical ? '!' : '•'}
                  </span>
                  <span>{rule.text}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <p className="mt-12 rounded-lg border bg-muted/40 p-4 text-center text-xs text-muted-foreground">
          By participating in TechAFlon, you accept these rules and the code of conduct.
          Organizers may clarify edge cases on site — their interpretation is
          final. Questions? See the{' '}
          <Link to="/faq" className="link-underline font-medium text-primary">
            FAQ
          </Link>{' '}
          or email cssa@caretech.edu.
        </p>
      </div>
    </Container>
  )
}
