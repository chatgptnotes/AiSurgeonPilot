import { NextRequest } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { UserRole } from '@/types/database'

interface AuthSuccess {
  userId: string
  doctorId: string
  role: UserRole
}

interface AuthError {
  error: string
  status: number
}

export type AuthResult = AuthSuccess | AuthError

/**
 * Verify that the authenticated user has one of the allowed roles
 */
export async function verifyRole(
  allowedRoles: UserRole[]
): Promise<AuthResult> {
  const supabase = await createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return { error: 'Unauthorized', status: 401 }
  }

  const { data: doctor } = await supabase
    .from('doc_doctors')
    .select('id, role')
    .eq('user_id', user.id)
    .single()

  if (!doctor || !allowedRoles.includes(doctor.role as UserRole)) {
    const rolesStr = allowedRoles.join(' or ')
    return { error: `Forbidden: ${rolesStr} access required`, status: 403 }
  }

  return {
    userId: user.id,
    doctorId: doctor.id,
    role: doctor.role as UserRole
  }
}

/**
 * Check if the result is an error
 */
export function isAuthError(result: AuthResult): result is AuthError {
  return 'error' in result
}

/**
 * Verify user is a SuperAdmin
 */
export async function verifySuperAdmin(): Promise<AuthResult> {
  return verifyRole(['superadmin'])
}

/**
 * Verify user is an Admin Clinical
 */
export async function verifyAdminClinical(): Promise<AuthResult> {
  return verifyRole(['admin_clinical'])
}

/**
 * Verify user is either SuperAdmin or Admin Clinical
 */
export async function verifyAdminOrSuperAdmin(): Promise<AuthResult> {
  return verifyRole(['superadmin', 'admin_clinical'])
}

/**
 * Verify user is a Doctor
 */
export async function verifyDoctor(): Promise<AuthResult> {
  return verifyRole(['doctor'])
}
