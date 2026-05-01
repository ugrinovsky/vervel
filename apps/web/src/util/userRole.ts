import type { UserRole } from '@/api/auth';

export function userRoleFromApiString(role: string): UserRole | null {
  if (role === 'athlete' || role === 'trainer' || role === 'both') return role;
  return null;
}
