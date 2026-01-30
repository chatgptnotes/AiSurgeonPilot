'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Shield, ArrowLeft } from 'lucide-react'

export default function SignupPage() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 p-3 bg-indigo-100 rounded-full w-fit">
          <Shield className="h-8 w-8 text-indigo-600" />
        </div>
        <CardTitle>Registration Disabled</CardTitle>
        <CardDescription>
          Self-registration is not available for this platform
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription className="text-center">
            Doctor accounts are created by the platform administrator.
            If you are a doctor and need access, please contact your organization&apos;s admin.
          </AlertDescription>
        </Alert>

        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <p className="text-sm font-medium text-gray-700">How to get access:</p>
          <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
            <li>Contact your organization&apos;s administrator</li>
            <li>Provide your professional details</li>
            <li>Administrator will create your account</li>
            <li>You will receive login credentials via email</li>
          </ol>
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-500 mb-2">Already have credentials?</p>
          <Link href="/login">
            <Button className="w-full bg-green-600 hover:bg-green-700">
              Sign In
            </Button>
          </Link>
        </div>
      </CardContent>
      <CardFooter className="flex justify-center">
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>
      </CardFooter>
    </Card>
  )
}
