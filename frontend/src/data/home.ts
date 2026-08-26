/**
 * TechaFlon — Doomsday Theme Content
 * 
 * TechAFlon: Avengers Doomsday Theme Internal Hackathon
 * Hosted by CSSA, CARE College of Engineering, Trichy
 * 
 * Theme: TechAFlon — The Doomsday Protocol
 * Departments: CSE × AI & DS
 * Event Date: 31 August 2026
 */

export interface TeamMember {
  name: string
  email: string
  registerNumber: string
  department: 'CSE' | 'AI & DS'
  year: '2nd Year' | '3rd Year' | 'Final Year'
  section: string
}

export interface HomeContent {
  event: {
    name: string
    tagline: string
    description: string
    dateLabel: string
    format: string
    location: string
    startDate: string
  }
  hero: {
    eyebrow: string
    headline: string
    highlight: string
    subtext: string
  }
  stats: Array<{ value: string; label: string }>
  tracks: Array<{ id: string; icon: string; title: string; description: string }>
  timeline: Array<{ date: string; label: string; description: string }>
  prizes: never[]
  steps: Array<{ title: string; description: string }>
  cta: {
    title: string
    description: string
  }
  about: {
    title: string
    description: string
  }
  departments: {
    title: string
    cse: {
      name: string
      description: string
    }
    aiDs: {
      name: string
      description: string
    }
  }
  eligibility: {
    title: string
    rules: Array<{ title: string; description: string }>
  }
  phases: Array<{ phase: string; date: string; description: string; status: string }>
}

export const homeContent: HomeContent = {
  event: {
    name: 'TechaFlon',
    tagline: 'THE DOOMSDAY PROTOCOL',
    description:
      'An internal innovation hackathon for CSE and AI & DS students of CARE College of Engineering, Trichy.',
    dateLabel: '31 AUGUST 2026',
    format: 'Internal Hackathon',
    location: 'CARE College of Engineering, Trichy',
    startDate: '2026-08-31T10:00:00+05:30',
  },
  hero: {
    eyebrow: 'CSSA PRESENTS',
    headline: 'TECHAFLON',
    highlight: 'THE DOOMSDAY PROTOCOL',
    subtext:
      'The clock is running. Build what comes next. An internal hackathon for CSE × AI & DS students.',
  },
  stats: [
    { value: '31', label: 'August' },
    { value: 'CSE × AI & DS', label: 'Departments' },
    { value: 'TBD', label: 'Venue' },
  ],
  tracks: [
    {
      id: 'ai-ml',
      icon: '◉',
      title: 'AI / ML',
      description:
        'Intelligent systems, predictive models and tools that learn from data.',
    },
    {
      id: 'web',
      icon: '◈',
      title: 'Web Development',
      description:
        'Fast, accessible applications and services built for the real web.',
    },

  ],
  timeline: [],
  prizes: [],
  steps: [
    {
      title: 'Register',
      description: 'Sign up your team (3-4 students from CSE/AI-DS).',
    },
    {
      title: 'Problem Statement',
      description: 'Receive your allocated problem on event day.',
    },
    {
      title: 'Build',
      description: 'Develop your solution during the event.',
    },
    {
      title: 'Submit',
      description: 'Submit your project through the team portal.',
    },
  ],
  cta: {
    title: 'READY TO ENTER THE DOOMSDAY PROTOCOL?',
    description:
      'Gather your team. Choose your battlefield. The countdown has already begun.',
  },
  about: {
    title: 'WHAT IS TECHAFLON?',
    description:
      'TechAFlon is an internal hackathon conducted by the Computer Science Students Association (CSSA) at CARE College of Engineering, Trichy. The event brings together students from Computer Science and Engineering and Artificial Intelligence & Data Science to collaborate, solve challenging problems, and build innovative technology solutions.',
  },
  departments: {
    title: 'TWO DEPARTMENTS. ONE BATTLEFIELD.',
    cse: {
      name: 'CSE',
      description: 'Computer Science and Engineering',
    },
    aiDs: {
      name: 'AI & DS',
      description: 'Artificial Intelligence and Data Science',
    },
  },
  eligibility: {
    title: 'WHO CAN ENTER?',
    rules: [
      { title: 'Team Size', description: 'Minimum 3 students, Maximum 4 students' },
      { title: 'Departments', description: 'Only CSE and AI & DS students' },
      { title: 'Team Composition', description: 'CSE only, AI & DS only, or combined' },
      { title: 'Registration', description: 'Only Team Leader can register' },
      { title: 'Academic Year', description: '2nd Year, 3rd Year, Final Year' },
    ],
  },
  phases: [
    {
      phase: 'Phase 1',
      date: '31.08.2026',
      description: 'Event Phase - Problem statements provided on spot',
      status: 'UPCOMING',
    },
    {
      phase: 'Registration',
      date: '27.08.2026 - 29.08.2026',
      description: 'Registration opens and closes',
      status: 'UPCOMING',
    },
  ],
}
