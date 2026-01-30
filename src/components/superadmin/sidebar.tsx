'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAuth } from '@/hooks/use-auth'
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Settings,
  LogOut,
  Menu,
  X,
  Shield,
  Activity,
  FileText,
  Stethoscope
} from 'lucide-react'

interface NavItem {
  title: string
  href: string
  icon: React.ElementType
}

const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/superadmin',
    icon: LayoutDashboard,
  },
  {
    title: 'Admin Clinical',
    href: '/superadmin/admin-clinical',
    icon: Shield,
  },
  {
    title: 'Add Admin Clinical',
    href: '/superadmin/admin-clinical/create',
    icon: UserPlus,
  },
  {
    title: 'All Doctors',
    href: '/superadmin/doctors',
    icon: Stethoscope,
  },
  {
    title: 'Activity Log',
    href: '/superadmin/activity',
    icon: Activity,
  },
  {
    title: 'Reports',
    href: '/superadmin/reports',
    icon: FileText,
  },
]

export function SuperAdminSidebar() {
  const pathname = usePathname()
  const { doctor, signOut } = useAuth()
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const sidebarContent = (
    <>
      {/* Header */}
      <div className="p-4 border-b bg-indigo-600">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">SuperAdmin</p>
            <p className="text-xs text-indigo-200">Control Panel</p>
          </div>
        </div>
      </div>

      {/* User Profile */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 bg-indigo-600">
            <AvatarImage src={doctor?.profile_image || ''} />
            <AvatarFallback className="bg-indigo-600 text-white">
              {doctor?.full_name ? getInitials(doctor.full_name) : 'SA'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {doctor?.full_name || 'Super Admin'}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {doctor?.email}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {navItems.map(item => {
            const isActive = pathname === item.href ||
              (item.href !== '/superadmin' && pathname.startsWith(item.href))

            return (
              <Link
                key={item.title}
                href={item.href}
                onClick={() => setIsMobileOpen(false)}
              >
                <div
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                    isActive
                      ? 'bg-indigo-100 text-indigo-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-100'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.title}</span>
                </div>
              </Link>
            )
          })}
        </nav>
      </ScrollArea>

      {/* Bottom Actions */}
      <div className="p-4 border-t space-y-2">
        <Link href="/superadmin/settings" onClick={() => setIsMobileOpen(false)}>
          <Button
            variant="ghost"
            className={cn(
              'w-full justify-start gap-3',
              pathname === '/superadmin/settings' && 'bg-indigo-100 text-indigo-700'
            )}
          >
            <Settings className="h-5 w-5" />
            Settings
          </Button>
        </Link>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={signOut}
        >
          <LogOut className="h-5 w-5" />
          Sign Out
        </Button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        {isMobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </Button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white border-r">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-white border-r transform transition-transform duration-200 ease-in-out lg:hidden flex flex-col',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {sidebarContent}
      </aside>
    </>
  )
}
