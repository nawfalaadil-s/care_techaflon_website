import { useState } from 'react'
import { Link } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Container } from '@/components/ui/container'
import { Input } from '@/components/ui/input'

interface FaqItem {
  question: string
  answer: string
}

const FAQ_CATEGORIES = [
  {
    id: 'participation',
    title: 'Participation',
    items: [
      {
        question: 'Who can participate?',
        answer: 'Only students from CSE and AI & DS at CARE College of Engineering, Trichy can participate.',
      },
      {
        question: 'What is the maximum team size?',
        answer: 'A team must have a minimum of 3 and maximum of 4 students.',
      },
      {
        question: 'Can students from CSE and AI & DS form a team together?',
        answer: 'Yes. Teams can consist of CSE students, AI & DS students, or a combination of both departments.',
      },
      {
        question: 'Can a student join multiple teams?',
        answer: 'No. Each student can participate in only one team. Your register number must be unique across all teams.',
      },
    ],
  },
  {
    id: 'registration',
    title: 'Registration',
    items: [
      {
        question: 'Who can register the team?',
        answer: 'Only the Team Leader can register the team. The team leader will receive a unique Team ID (format: TFLN-2026-XXX).',
      },
      {
        question: 'Which academic years can participate?',
        answer: '2nd Year, 3rd Year and Final Year students are eligible to participate.',
      },
      {
        question: 'When does registration open?',
        answer: 'Registration opens on 27 August 2026.',
      },
      {
        question: 'When does registration close?',
        answer: 'Registration closes on 29 August 2026.',
      },
    ],
  },
  {
    id: 'event',
    title: 'Event',
    items: [
      {
        question: 'When is Event Phase 1?',
        answer: 'Event Phase 1 takes place on 31 August 2026.',
      },
      {
        question: 'What happens during Phase 1?',
        answer: 'Problem statements are provided on the spot during the event. Teams build their projects and submit their required project information through the portal.',
      },
      {
        question: 'What themes can teams choose during registration?',
        answer: 'Teams can choose one of the following development themes: AI / ML or Web Development.',
      },
    ],
  },
  {
    id: 'problem-statements',
    title: 'Problem Statements',
    items: [
      {
        question: 'When will the problem statement be available?',
        answer: 'Problem statements will be provided during Event Phase 1 on 31 August 2026.',
      },
      {
        question: 'How will we receive our problem statement?',
        answer: 'The allocated problem statement will appear in the Team Leader portal after the admin assigns it to your team.',
      },
    ],
  },
  {
    id: 'submission',
    title: 'Project Submission',
    items: [
      {
        question: 'Can I edit my project submission?',
        answer: 'No. Once the project submission is successfully completed, it is locked and cannot be edited.',
      },
      {
        question: 'Can we change the GitHub link after submission?',
        answer: 'No. The submission is one-time only. The GitHub link, deployment link, and project details are locked after successful submission.',
      },
      {
        question: 'When can we submit the project?',
        answer: 'Only when the administrator enables project submission in the portal. The admin has full control over when submissions are accepted.',
      },
    ],
  },
  {
    id: 'portal',
    title: 'Team Portal',
    items: [
      {
        question: 'How do I access the Team Portal?',
        answer: 'Approved Team Leaders can log in using their registered email and the provided initial password (Demo@123).',
      },
      {
        question: 'Where can I see venue information?',
        answer: 'Venue and event instructions will be available in the Team Leader portal when published by the admin.',
      },
    ],
  },
  {
    id: 'certificates',
    title: 'Certificates',
    items: [
      {
        question: 'How will I receive my certificate?',
        answer: 'Certificates will be made available through the Team Portal and sent to the registered email address when published by the admin.',
      },
    ],
  },
  {
    id: 'contact',
    title: 'Contact',
    items: [
      {
        question: 'Who should I contact for questions?',
        answer: 'Contact CSSA — Computer Science Students Association for any questions or clarifications.',
      },
    ],
  },
]

export default function FaqPage() {
  const [query, setQuery] = useState('')

  const results = FAQ_CATEGORIES.map((category) => ({
    ...category,
    items: category.items.filter(
      (item: FaqItem) =>
        item.question.toLowerCase().includes(query.toLowerCase()) ||
        item.answer.toLowerCase().includes(query.toLowerCase()),
    ),
  })).filter((category) => category.items.length > 0)

  const totalMatches = results.reduce((sum, c) => sum + c.items.length, 0)

  return (
    <Container className="py-8 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8">
          <Badge variant="outline">Help center</Badge>
          <h1 className="mt-3 text-3xl sm:text-4xl">
            Frequently asked questions
          </h1>
          <p className="mt-2 text-muted-foreground">
            Everything about TechAFlon, registration, logistics and judging.
            Can’t find it? Email{' '}
            <a
              href="mailto:cssa@caretech.edu"
              className="link-underline font-medium text-primary"
            >
              cssa@caretech.edu
            </a>
            .
          </p>
        </header>

        <div className="sticky top-16 z-10 -mx-2 bg-background/95 px-2 py-3 backdrop-blur">
          <label htmlFor="faq-search" className="sr-only">
            Search questions
          </label>
          <Input
            id="faq-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search questions ��� e.g. “team size”, “submission”…"
          />
          {query.trim() && (
            <p role="status" aria-live="polite" className="mt-2 text-xs text-muted-foreground">
              {totalMatches} answer{totalMatches === 1 ? '' : 's'} matching “{query.trim()}”
            </p>
          )}
        </div>

        {results.length === 0 ? (
          <Card className="mt-6">
            <CardContent className="space-y-4 pt-6 text-center">
              <p className="text-sm text-muted-foreground">
                No answers match your search. Try different words, or just ask us.
              </p>
              <div className="flex flex-col justify-center gap-2 sm:flex-row">
                <Button variant="outline" onClick={() => setQuery('')}>
                  Clear search
                </Button>
                <a
                  href="mailto:cssa@caretech.edu"
                  className="inline-flex h-11 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-accent sm:h-10"
                >
                  Email the organizers
                </a>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {results.map((category) => (
              <section key={category.id} aria-labelledby={`faq-${category.id}`}>
                <h2
                  id={`faq-${category.id}`}
                  className="mb-3 font-display text-lg font-semibold"
                >
                  {category.title}
                </h2>
                <div className="space-y-2.5">
                  {category.items.map((item, i) => (
                    <details key={i} className="group rounded-lg border">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3.5 text-sm font-medium [&::-webkit-details-marker]:hidden">
                        {item.question}
                        <span
                          aria-hidden="true"
                          className="shrink-0 text-lg leading-none text-primary transition-transform duration-200 group-open:rotate-45"
                        >
                          +
                        </span>
                      </summary>
                      <p className="border-t px-4 pb-4 pt-3 text-sm leading-relaxed text-muted-foreground">
                        {item.answer}
                      </p>
                    </details>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        <div className="mt-12 rounded-lg border bg-muted/40 p-6 text-center">
          <h2 className="font-display text-xl font-semibold">Ready to enter the Doomsday Protocol?</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Registration takes about three minutes — no payment, no fuss.
          </p>
          <Link
            to="/register"
            className="mt-4 inline-flex h-11 items-center justify-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90 sm:h-10"
          >
            Register your team
          </Link>
        </div>
      </div>
    </Container>
  )
}
