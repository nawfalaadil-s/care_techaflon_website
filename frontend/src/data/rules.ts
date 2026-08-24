/**
 * Hackathon rules, structured for rendering and future admin editing
 * (Phase 14 wires this to admin-managed settings).
 */

export interface RuleSection {
  id: string
  title: string
  /** Individual rules; entries marked with `critical` render highlighted. */
  rules: { text: string; critical?: boolean }[]
}

export const RULES_LAST_UPDATED = '2026-08-21'

export const RULE_SECTIONS: RuleSection[] = [
  {
    id: 'eligibility',
    title: '1. Eligibility',
    rules: [
      {
        text: 'Participants must be current college/university students or alumni within one year of graduation.',
      },
      {
        text: 'A valid student ID (or graduation certificate for alumni) is required at check-in.',
      },
      {
        text: 'Participants under 18 need a signed parental consent form submitted before the event.',
      },
      {
        text: 'Organizers, mentors, sponsors and judges may not compete on any team.',
        critical: true,
      },
    ],
  },
  {
    id: 'teams',
    title: '2. Team composition',
    rules: [
      { text: 'Teams consist of 1–4 members, including the team leader.' },
      {
        text: 'Each participant may appear on exactly one team. Duplicate registrations are removed without notice.',
        critical: true,
      },
      {
        text: 'Team rosters lock when submissions open — no member swaps after that point.',
      },
      {
        text: 'Cross-college teams are welcome; the leader’s institution represents the team for college-level prizes.',
      },
    ],
  },
  {
    id: 'project',
    title: '3. Project & code requirements',
    rules: [
      {
        text: 'All production code, assets and content must be created during the 36-hour event window.',
        critical: true,
      },
      {
        text: 'Open-source libraries, frameworks, public APIs and generative AI tools are allowed and must be disclosed in the submission notes.',
      },
      {
        text: 'Projects must not reuse a team’s pre-existing codebase or a previous hackathon submission.',
        critical: true,
      },
      { text: 'Hardware projects may bring unmodified components; assembled kits must be disclosed.' },
      {
        text: 'Projects violating platform terms, laws, or our code of conduct are disqualified immediately.',
      },
    ],
  },
  {
    id: 'submissions',
    title: '4. Submission & demos',
    rules: [
      {
        text: 'Submissions close at the deadline announced on event day — typically 30 minutes before judging begins. No exceptions.',
        critical: true,
      },
      {
        text: 'Every submission requires: a public repository URL, a written pitch (max 2000 characters) and an optional live-demo link.',
      },
      {
        text: 'Demos run on your own hardware. Wi-Fi hiccups are not an excuse — prepare offline fallbacks.',
      },
      {
        text: 'Teams get 4 minutes to demo plus 2 minutes of judge Q&A. Exceeding time costs points.',
      },
      {
        text: 'All listed team members should be present for their demo slot; absent teams may forfeit.',
      },
    ],
  },
  {
    id: 'judging',
    title: '5. Judging',
    rules: [
      { text: 'Impact & problem fit — 30%' },
      { text: 'Technical execution — 30%' },
      { text: 'Design & usability — 20%' },
      { text: 'Demo & presentation — 20%' },
      {
        text: 'Judges score independently; the panel’s aggregated decisions are final and not subject to appeal.',
      },
      {
        text: 'Prizes are awarded per team, split evenly among listed members at the time of winning.',
      },
    ],
  },
  {
    id: 'conduct',
    title: '6. Code of conduct',
    rules: [
      {
        text: 'Be excellent to each other. Harassment, discrimination or intimidation of any kind ends your participation immediately.',
        critical: true,
      },
      { text: 'Respect venue property, equipment and the quiet rest area.' },
      { text: 'Report incidents to any organizer — reports are handled confidentially.' },
    ],
  },
  {
    id: 'ip',
    title: '7. Intellectual property',
    rules: [
      {
        text: 'Teams retain full ownership of everything they build during the event.',
      },
      {
        text: 'Optional sponsor prize tracks may request a non-transferable license; accepting is always the team’s choice.',
      },
      {
        text: 'By submitting, teams grant organizers a non-exclusive license to showcase screenshots and demo footage for event promotion with attribution.',
      },
    ],
  },
]
