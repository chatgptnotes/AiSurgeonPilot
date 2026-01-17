'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAuth } from '@/hooks/use-auth'
import {
  LayoutDashboard,
  Calendar,
  CalendarCheck,
  Users,
  FileText,
  Video,
  Settings,
  ChevronDown,
  ChevronRight,
  Building2,
  MessageSquare,
  UserCheck,
  GraduationCap,
  Stethoscope,
  LogOut,
  Bell,
  Menu,
  X
} from 'lucide-react'

interface NavItem {
  title: string
  href?: string
  icon: React.ElementType
  badge?: string
  children?: NavItem[]
}

const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Patients',
    href: '/patients',
    icon: Users,
  },
  {
    title: 'Appointments',
    href: '/appointments',
    icon: CalendarCheck,
  },
  {
    title: 'Calendar',
    href: '/calendar',
    icon: Calendar,
    badge: 'NEW',
  },
  {
    title: 'Digital Doctor Office',
    icon: Building2,
    children: [
      {
        title: 'Doctor Directory',
        href: '/digital-office/directory',
        icon: Users,
      },
      {
        title: 'WhatsApp Manager',
        href: '/digital-office/whatsapp-manager',
        icon: MessageSquare,
        badge: 'NEW',
      },
      {
        title: 'Patient Follow-up',
        href: '/digital-office/patient-followup',
        icon: UserCheck,
        badge: 'NEW',
      },
      {
        title: 'Patient Education',
        href: '/digital-office/patient-education',
        icon: GraduationCap,
        badge: 'NEW',
      },
      {
        title: 'Surgery Options',
        href: '/digital-office/surgery-options',
        icon: Stethoscope,
      },
      {
        title: 'Meeting',
        href: '/meetings',
        icon: Video,
        badge: 'NEW',
      },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const { doctor, signOut } = useAuth()
  const [expandedItems, setExpandedItems] = useState<string[]>(['Digital Doctor Office'])
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  const toggleExpanded = (title: string) => {
    setExpandedItems(prev =>
      prev.includes(title)
        ? prev.filter(item => item !== title)
        : [...prev, title]
    )
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const renderNavItem = (item: NavItem, depth = 0) => {
    const isActive = item.href === pathname
    const isExpanded = expandedItems.includes(item.title)
    const hasChildren = item.children && item.children.length > 0

    return (
      <div key={item.title}>
        {item.href ? (
          <Link href={item.href} onClick={() => setIsMobileOpen(false)}>
            <div
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-green-100 text-green-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-100',
                depth > 0 && 'ml-6'
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="flex-1">{item.title}</span>
              {item.badge && (
                <Badge className="bg-green-500 hover:bg-green-500 text-white text-xs px-1.5 py-0">
                  {item.badge}
                </Badge>
              )}
            </div>
          </Link>
        ) : (
          <button
            onClick={() => toggleExpanded(item.title)}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors w-full',
              'text-gray-600 hover:bg-gray-100',
              depth > 0 && 'ml-6'
            )}
          >
            <item.icon className="h-5 w-5" />
            <span className="flex-1 text-left">{item.title}</span>
            {hasChildren && (
              isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )
            )}
          </button>
        )}

        {hasChildren && isExpanded && (
          <div className="mt-1 space-y-1">
            {item.children!.map(child => renderNavItem(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  const sidebarContent = (
    <>
      {/* User Profile */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 bg-green-600">
            <AvatarImage src={doctor?.profile_image || ''} />
            <AvatarFallback className="bg-green-600 text-white">
              {doctor?.full_name ? getInitials(doctor.full_name) : 'DR'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {doctor?.full_name || 'Doctor'}
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
          {navItems.map(item => renderNavItem(item))}
        </nav>
      </ScrollArea>

      {/* Bottom Actions */}
      <div className="p-4 border-t space-y-2">
        <Link href="/settings" onClick={() => setIsMobileOpen(false)}>
          <Button
            variant="ghost"
            className={cn(
              'w-full justify-start gap-3',
              pathname === '/settings' && 'bg-green-100 text-green-700'
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
