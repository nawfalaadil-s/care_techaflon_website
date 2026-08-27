import { useAuthStore } from '@/store/authStore'

export function isOrganizer(
  user: { is_admin: boolean; role: string } | null,
): boolean {
  return Boolean(user && (user.is_admin || ['organizer', 'admin'].includes(user.role)))
}

/** True when the current session belongs to an organizer/admin. */
export function useIsOrganizer(): boolean {
  return isOrganizer(useAuthStore((s) => s.user))
}
