/**
 * Script to create a SuperAdmin user
 *
 * Usage:
 *   npx ts-node scripts/create-superadmin.ts
 *
 * Or add to package.json:
 *   "create-superadmin": "ts-node scripts/create-superadmin.ts"
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

function generatePassword(length = 16): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const numbers = '0123456789'
  const symbols = '!@#$%^&*'
  const allChars = uppercase + lowercase + numbers + symbols

  let password = ''
  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += lowercase[Math.floor(Math.random() * lowercase.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  password += symbols[Math.floor(Math.random() * symbols.length)]

  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)]
  }

  return password.split('').sort(() => Math.random() - 0.5).join('')
}

async function main() {
  console.log('\n=== AiSurgeonPilot SuperAdmin Setup ===\n')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Error: Missing required environment variables.')
    console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  // Check if superadmin already exists
  const { data: existingAdmin } = await supabase
    .from('doc_doctors')
    .select('id, email')
    .eq('role', 'superadmin')
    .single()

  if (existingAdmin) {
    console.log(`SuperAdmin already exists: ${existingAdmin.email}`)
    const proceed = await question('Create another SuperAdmin? (y/n): ')
    if (proceed.toLowerCase() !== 'y') {
      console.log('Cancelled.')
      rl.close()
      process.exit(0)
    }
  }

  // Get details
  const fullName = await question('Full Name: ')
  const email = await question('Email: ')
  const customPassword = await question('Password (leave empty to auto-generate): ')

  const password = customPassword || generatePassword()

  console.log('\nCreating SuperAdmin...')

  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: email.toLowerCase(),
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
    },
  })

  if (authError) {
    console.error('Failed to create auth user:', authError.message)
    rl.close()
    process.exit(1)
  }

  // Create doctor profile with superadmin role
  const { error: profileError } = await supabase
    .from('doc_doctors')
    .insert({
      user_id: authData.user.id,
      email: email.toLowerCase(),
      full_name: fullName,
      role: 'superadmin',
      is_verified: true,
      is_active: true,
      must_change_password: false,
    })

  if (profileError) {
    console.error('Failed to create profile:', profileError.message)
    // Rollback auth user
    await supabase.auth.admin.deleteUser(authData.user.id)
    rl.close()
    process.exit(1)
  }

  console.log('\n=== SuperAdmin Created Successfully ===')
  console.log(`Email: ${email}`)
  console.log(`Password: ${password}`)
  console.log('\nPlease save these credentials securely!')
  console.log('Login at: /login')

  rl.close()
}

main().catch((err) => {
  console.error('Error:', err)
  rl.close()
  process.exit(1)
})
