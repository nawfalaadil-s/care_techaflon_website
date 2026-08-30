import { useState, type ReactNode } from 'react'

import { ChevronDown, Filter, RotateCcw, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

/**
 * A reusable admin filter bar.
 *
 * Provides a consistent interface across the admin panel:
 *  - a search box + collapsible "Filters" panel for the page-specific
 *    controls (rendered as children),
 *  - removable active-filter chips with a clear-all shortcut,
 *  - and a live result count.
 *
 * Pass `chips` as a list of active filter descriptors; each has a label and
 * an optional `onRemove`. A global "Clear filters" chip is added whenever any
 * chip reports an `onRemove`.
 */

export interface ActiveChip {
  label: string
  onRemove?: () => void
}

interface AdminFilterBarProps {
  /** Value/onChange for the search box (optional). */
  search?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  /** Whether the collapsible filter panel is present. */
  showFilters?: boolean
  /** Page-specific filter controls rendered inside the collapsible panel. */
  children?: ReactNode
  /** Active filter descriptors used to build removable chips. */
  chips?: ActiveChip[]
  /** Result counts. When given, a status line like "12 of 40" is rendered. */
  resultCount?: { shown: number; total: number }
  /** Extra controls rendered on the right of the search row (e.g. Export). */
  actions?: ReactNode
}

export function AdminFilterBar({
  search,
  onSearchChange,
  searchPlaceholder = 'Search…',
  showFilters = false,
  children,
  chips = [],
  resultCount,
  actions,
}: AdminFilterBarProps) {
  const [filtersOpen, setFiltersOpen] = useState(showFilters)
  // Chips that carry an onRemove → treated as "active" filters.
  const activeChips = chips.filter((c) => !!c.onRemove)

  const hasChildren = !!children
  const hasActiveFilters = chips.some((c) => !!c.onRemove)

  return (
    <div className="space-y-3 rounded-xl border bg-card p-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        {onSearchChange && (
          <label className="min-w-0 flex-1 basis-56">
            <span className="sr-only">{searchPlaceholder}</span>
            <Input
              type="search"
              value={search ?? ''}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
            />
          </label>
        )}

        {hasChildren && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-expanded={filtersOpen}
            onClick={() => setFiltersOpen((open) => !open)}
          >
            <Filter className="h-4 w-4" />
            Filters
            {activeChips.length > 0 && (
              <span className="ml-1 rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                {activeChips.length}
              </span>
            )}
            <ChevronDown
              className={`h-4 w-4 transition-transform ${filtersOpen ? 'rotate-180' : ''}`}
            />
          </Button>
        )}

        {resultCount && (
          <span
            className="ml-auto whitespace-nowrap text-xs text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            Showing {resultCount.shown} of {resultCount.total}
          </span>
        )}

        {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
      </div>

      {hasChildren && filtersOpen && (
        <div className="grid gap-3 border-t border-border pt-3 sm:grid-cols-2 lg:grid-cols-3">
          {children}
        </div>
      )}

      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-border pt-3">
          {hasActiveFilters && (
            <span className="mr-1 text-xs font-medium text-muted-foreground">
              Active filters:
            </span>
          )}
          {chips.map(
            (chip, i) =>
              !!chip.onRemove && (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 rounded-full border bg-muted/60 px-2.5 py-1 text-xs"
                >
                  {chip.label}
                  {chip.onRemove && (
                    <button
                      type="button"
                      aria-label={`Clear filter ${chip.label}`}
                      onClick={chip.onRemove}
                      className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </span>
              ),
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1 text-xs"
            onClick={() => {
              chips.forEach((c) => c.onRemove?.())
            }}
          >
            <RotateCcw className="h-3 w-3" />
            Clear all
          </Button>
        </div>
      )}
    </div>
  )
}
