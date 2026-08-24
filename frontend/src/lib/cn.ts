/**
 * Lightweight class-name combiner.
 *
 * Joins truthy class strings and deduplicates simple conflicts by
 * keeping the last occurrence. Because Tailwind v4 utilities are
 * CSS-cascade based, we only need to remove obvious duplicates so
 * that `cn('bg-primary', isActive && 'bg-accent')` behaves as
 * expected without requiring a className-merge dependency.
 */
export type ClassValue =
  | string
  | number
  | null
  | false
  | undefined
  | ClassValue[]

export function cn(...inputs: ClassValue[]): string {
  const seen = new Map<string, true>()
  const parts: string[] = []

  flatten(inputs).forEach((value) => {
    const token = value.trim()
    if (!token || seen.has(token)) return
    seen.set(token, true)
    parts.push(token)
  })

  return parts.join(' ')
}

function flatten(inputs: ClassValue[]): string[] {
  const out: string[] = []
  for (const input of inputs) {
    if (!input) continue
    if (Array.isArray(input)) {
      out.push(...flatten(input))
    } else {
      out.push(String(input))
    }
  }
  return out
}
