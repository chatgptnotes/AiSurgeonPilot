'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle } from 'lucide-react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const errorParam = searchParams.get('error')
  const [error, setError] = useState<string | null>(
    errorParam === 'account_deactivated'
      ? 'Your account has been deactivated. Please contact the administrator.'
      : null
  )
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    const supabase = createClient()

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      setError(signInError.message)
      setIsLoading(false)
      return
    }

    if (!data.user) {
      setError('Login failed. Please try again.')
      setIsLoading(false)
      return
    }

    // Fetch doctor profile to check role and status
    const { data: doctor, error: doctorError } = await supabase
      .from('doc_doctors')
      .select('role, is_active, must_change_password')
      .eq('user_id', data.user.id)
      .single()

    if (doctorError || !doctor) {
      setError('Account not found. Please contact the administrator.')
      await supabase.auth.signOut()
      setIsLoading(false)
      return
    }

    // Check if account is deactivated
    if (doctor.is_active === false) {
      setError('Your account has been deactivated. Please contact the administrator.')
      await supabase.auth.signOut()
      setIsLoading(false)
      return
    }

    // Check if must change password
    if (doctor.must_change_password) {
      router.push('/change-password')
      return
    }

    // Redirect based on role
    if (doctor.role === 'superadmin') {
      router.push('/superadmin')
    } else if (doctor.role === 'admin_clinical') {
      router.push('/admin-clinical')
    } else {
      router.push('/dashboard')
    }

    router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome Back</CardTitle>
        <CardDescription>Sign in to your account</CardDescription>
      </CardHeader>
      <form onSubmit={handleLogin}>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="doctor@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          <div className="text-right">
            <Link
              href="/forgot-password"
              className="text-sm text-green-600 hover:text-green-700"
            >
              Forgot password?
            </Link>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            type="submit"
            className="w-full bg-green-600 hover:bg-green-700"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </Button>
        </CardFooter>
      </form>
      <div className="px-6 pb-6 text-center text-sm text-gray-600">
        Don&apos;t have an account?{' '}
        <a
          href="/request-account"
          className="text-green-600 hover:text-green-700 font-medium cursor-pointer"
        >
          Request Access
        </a>
      </div>
    </Card>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <Card>
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    }>
      <LoginForm />
    </Suspense>
  )
}
