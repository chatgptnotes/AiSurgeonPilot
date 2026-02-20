/**
 * Script to reset a SuperAdmin password
 *
 * Usage:
 *   npx ts-node scripts/reset-superadmin-password.ts
 *
 * Required env vars:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'
import * as readline from 'readline'

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer)
    })
  })
}

async function main() {
  console.log('\n=== AiSurgeonPilot SuperAdmin Password Reset ===\n')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Error: Missing required environment variables.')
    console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  // Find all superadmins
  const { data: admins, error: fetchError } = await supabase
    .from('doc_doctors')
    .select('user_id, email, full_name')
    .eq('role', 'superadmin')

  if (fetchError) {
    console.error('Failed to fetch superadmins:', fetchError.message)
    rl.close()
    process.exit(1)
  }

  if (!admins || admins.length === 0) {
    console.error('No superadmin users found.')
    rl.close()
    process.exit(1)
  }

  // List superadmins
  console.log('SuperAdmin users found:\n')
  admins.forEach((admin, index) => {
    console.log(`  ${index + 1}. ${admin.full_name} (${admin.email})`)
  })

  let selectedAdmin = admins[0]
  if (admins.length > 1) {
    const choice = await question(`\nSelect user (1-${admins.length}): `)
    const idx = parseInt(choice, 10) - 1
    if (idx < 0 || idx >= admins.length) {
      console.error('Invalid selection.')
      rl.close()
      process.exit(1)
    }
    selectedAdmin = admins[idx]
  } else {
    console.log(`\nResetting password for: ${selectedAdmin.full_name} (${selectedAdmin.email})`)
  }

  const newPassword = await question('Enter new password (min 6 characters): ')

  if (newPassword.length < 6) {
    console.error('Password must be at least 6 characters.')
    rl.close()
    process.exit(1)
  }

  // Reset password using Supabase Admin API
  const { error: updateError } = await supabase.auth.admin.updateUserById(
    selectedAdmin.user_id,
    { password: newPassword }
  )

  if (updateError) {
    console.error('Failed to reset password:', updateError.message)
    rl.close()
    process.exit(1)
  }

  console.log('\n=== Password Reset Successfully ===')
  console.log(`Email: ${selectedAdmin.email}`)
  console.log(`New Password: ${newPassword}`)
  console.log('\nYou can now login at: /login')

  rl.close()
}

main().catch((err) => {
  console.error('Error:', err)
  rl.close()
  process.exit(1)
})
