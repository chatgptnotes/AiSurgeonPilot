import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  const isAuthPage = pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/change-password') ||
    pathname.startsWith('/request-account')

  const isPublicPage = pathname.startsWith('/book/') ||
    pathname === '/'

  const isSuperAdminPage = pathname.startsWith('/superadmin')
  const isAdminClinicalPage = pathname.startsWith('/admin-clinical')

  // If user is not authenticated and trying to access protected routes
  if (!user && !isAuthPage && !isPublicPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // If user is authenticated, check role for proper routing
  if (user) {
    // Fetch user's doctor profile to get role
    const { data: doctor } = await supabase
      .from('doc_doctors')
      .select('role, must_change_password, is_active')
      .eq('user_id', user.id)
      .single()

    // Check if account is deactivated
    if (doctor && doctor.is_active === false && !isAuthPage) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('error', 'account_deactivated')
      // Sign out the user
      await supabase.auth.signOut()
      return NextResponse.redirect(url)
    }

    // Check if must change password (redirect to change-password page)
    if (doctor?.must_change_password && !pathname.startsWith('/change-password')) {
      const url = request.nextUrl.clone()
      url.pathname = '/change-password'
      return NextResponse.redirect(url)
    }

    // If authenticated and on auth page, redirect based on role
    if (isAuthPage && !pathname.startsWith('/change-password')) {
      const url = request.nextUrl.clone()
      if (doctor?.role === 'superadmin') {
        url.pathname = '/superadmin'
      } else if (doctor?.role === 'admin_clinical') {
        url.pathname = '/admin-clinical'
      } else {
        url.pathname = '/dashboard'
      }
      return NextResponse.redirect(url)
    }

    // If non-superadmin trying to access superadmin pages
    if (isSuperAdminPage && doctor?.role !== 'superadmin') {
      const url = request.nextUrl.clone()
      if (doctor?.role === 'admin_clinical') {
        url.pathname = '/admin-clinical'
      } else {
        url.pathname = '/dashboard'
      }
      return NextResponse.redirect(url)
    }

    // If non-admin trying to access admin-clinical pages
    if (isAdminClinicalPage && doctor?.role !== 'admin_clinical') {
      const url = request.nextUrl.clone()
      if (doctor?.role === 'superadmin') {
        url.pathname = '/superadmin'
      } else {
        url.pathname = '/dashboard'
      }
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
