/**
 * FAQ content, grouped by category.
 * Staged static content (same pattern as home.ts) — Phase 14 wires this to
 * admin-managed settings so organizers can edit without a redeploy.
 */

export interface FaqItem {
  question: string
  answer: string
}

export interface FaqCategory {
  id: string
  title: string
  items: FaqItem[]
}

export const FAQ_CATEGORIES: FaqCategory[] = [
  {
    id: 'eligibility',
    title: 'Eligibility & teams',
    items: [
      {
        question: 'Who can participate?',
        answer:
          'Any student currently enrolled in a college or university, plus recent alumni (within one year of graduation). You’ll verify your student ID at check-in.',
      },
      {
        question: 'How big can my team be?',
        answer:
          'Teams have 1–4 members, including the team leader. You can register solo and add teammates later from the team portal as long as the cap isn’t reached.',
      },
      {
        question: 'Can I compete on multiple teams?',
        answer:
          'No. Each participant may appear on exactly one registered team. Duplicate email addresses across teams are removed at check-in.',
      },
      {
        question: 'Do I need a team before registering?',
        answer:
          'No — register as a solo leader first. You can recruit teammates afterwards; only the leader’s details are required at signup.',
      },
      {
        question: 'Do cross-college teams count?',
        answer:
          'Yes! Team members can come from different institutions. The institution you enter during registration is the one judged for the best-college prize.',
      },
    ],
  },
  {
    id: 'registration',
    title: 'Registration',
    items: [
      {
        question: 'How much does it cost?',
        answer:
          'Nothing — participation, meals, swag and workshop access are completely free thanks to our sponsors.',
      },
      {
        question: 'What if our whole team can’t register together?',
        answer:
          'Only the team leader submits the registration with everyone’s details (or just their own for now). Teammates don’t need accounts until the portal opens.',
      },
      {
        question: 'Can we change our track or problem statement later?',
        answer:
          'Yes. The team leader can edit the track and statement from the team portal any time before submissions close on the final day.',
      },
      {
        question: 'I registered but haven’t received a confirmation email.',
        answer:
          'Check your spam folder first. If it’s not there within 15 minutes, email hello@hackathon.dev from the address you registered with and we’ll sort it out.',
      },
    ],
  },
  {
    id: 'logistics',
    title: 'Event logistics',
    items: [
      {
        question: 'Is the hackathon in person or online?',
        answer:
          'The main event is fully in person over 36 hours. Selected workshops run online the week before — links are emailed to registered leaders.',
      },
      {
        question: 'What should I bring?',
        answer:
          'Your laptop, charger, student ID and any hardware you plan to build on. We provide meals, snacks, Wi-Fi, power strips and mentor support.',
      },
      {
        question: 'Can I start coding before the event?',
        answer:
          'You may plan, design and set up tooling, but all production code, assets and content must be written during the 36-hour window. Public APIs and libraries are fair game.',
      },
      {
        question: 'Are there sleeping arrangements?',
        answer:
          'There’s a designated quiet rest area, but it’s limited — plan to travel light. Showers aren’t available on site.',
      },
    ],
  },
  {
    id: 'judging',
    title: 'Judging & prizes',
    items: [
      {
        question: 'How are projects judged?',
        answer:
          'Four weighted criteria: impact & problem fit (30%), technical execution (30%), design & usability (20%), and demo & presentation (20%). Every team gets 4 minutes to demo plus 2 minutes of judge Q&A.',
      },
      {
        question: 'What do we submit and by when?',
        answer:
          'A public repository link, an optional live-demo URL and a written pitch — all entered through the team portal before the submission deadline announced at the event.',
      },
      {
        question: 'Do we own our project afterwards?',
        answer:
          'Yes — your team keeps full ownership of everything you build. Sponsors may request optional, non-transferable licenses for specific prize tracks; that’s always your call.',
      },
      {
        question: 'When are winners announced?',
        answer:
          'After the final judging round on the closing day. All decisions by the judging panel are final.',
      },
    ],
  },
]

/** Total number of questions — used for page summaries. */
export const FAQ_COUNT = FAQ_CATEGORIES.reduce(
  (sum, category) => sum + category.items.length,
  0,
)
