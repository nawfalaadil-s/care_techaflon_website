/**
 * Shared auth types — mirror backend/app/schemas/user.py.
 */

export type UserRole = 'leader' | 'organizer' | 'admin'

export interface UserRead {
  id: string
  email: string
  full_name: string
  is_active: boolean
  is_admin: boolean
  role: UserRole
  /** True while the account still uses the provisioned Demo@1234 password. */
  must_change_password?: boolean
}

export interface AuthToken {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  user: UserRead
}

export interface RegisterPayload {
  email: string
  full_name: string
  password: string
}

export interface LoginPayload {
  email: string
  password: string
}
