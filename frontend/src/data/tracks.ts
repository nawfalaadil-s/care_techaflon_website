/** Theme metadata for TechAFlon - The Doomsday Protocol. */

export const THEME_LABELS: Record<string, string> = {
  'ai-ml': 'AI / ML',
  web: 'Web Development',
  app: 'App Development',
}

export const THEME_OPTIONS = Object.entries(THEME_LABELS).map(
  ([value, label]) => ({ value, label }),
)

export const YEAR_OPTIONS = [
  '2nd Year',
  '3rd Year',
  'Final Year',
]

export const DEPARTMENT_OPTIONS = ['CSE', 'AI & DS']

/** Team size constraints for TechAFlon */
export const MIN_TEAM_SIZE = 3
export const MAX_TEAM_SIZE = 4

// Legacy aliases — several pages still import these older names.
// Keep them pointing at the canonical constants above.
export const TRACK_LABELS = THEME_LABELS
export const TRACK_OPTIONS = THEME_OPTIONS
export const MAX_MEMBERS = MAX_TEAM_SIZE
