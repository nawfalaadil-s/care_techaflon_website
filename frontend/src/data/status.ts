import type { BadgeVariant } from '@/components/ui/badge'

/** Registration review workflow shared by admin pages. */

export const REGISTRATION_STATUSES = [
  'pending',
  'approved',
  'waitlisted',
  'rejected',
] as const

export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number]

export const STATUS_LABELS: Record<RegistrationStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  waitlisted: 'Waitlisted',
  rejected: 'Rejected',
}

export const STATUS_VARIANT: Record<RegistrationStatus, BadgeVariant> = {
  pending: 'warning',
  approved: 'success',
  waitlisted: 'info',
  rejected: 'destructive',
}

/* ------------------------------------------------------------------ */
/* TechAFlon team review workflow (teams table).                       */
/* ------------------------------------------------------------------ */

export const TEAM_STATUSES = [
  'pending',
  'approved',
  'rejected',
  'disqualified',
] as const

export type TeamStatus = (typeof TEAM_STATUSES)[number]

export const TEAM_STATUS_LABELS: Record<TeamStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  disqualified: 'Disqualified',
}

export const TEAM_STATUS_VARIANT: Record<TeamStatus, BadgeVariant> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'destructive',
  disqualified: 'destructive',
}
