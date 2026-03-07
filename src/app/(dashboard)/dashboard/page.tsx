'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import {
  Users,
  Calendar,
  DollarSign,
  UserCheck,
  Video,
  TrendingUp,
  Search,
  Bell,
  Settings,
  Info,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import Link from 'next/link'
import { format, addDays, startOfWeek, isSameDay } from 'date-fns'

interface DashboardStats {
  totalPatients: number
  weekAppointments: number
  monthRevenue: number
  lastWeekPatients: number
  lastWeekAppointments: number
  lastMonthRevenue: number
}

interface Appointment {
  id: string
  patient_name: string
  patient_email: string
  patient_id: string | null
  start_time: string
  end_time: string
  visit_type: 'online' | 'physical'
  status: string
}

const quickActions = [
  {
    title: 'Patient Followup',
    icon: UserCheck,
    href: '/digital-office/patient-followup',
    badge: 'New',
  },
  {
    title: 'Doctor Directory',
    icon: Users,
    href: '/digital-office/directory',
    badge: 'New',
  },
  {
    title: 'Zoom Meetings',
    icon: Video,
    href: '/meetings',
    badge: 'New',
  },
]

export default function DashboardPage() {
  const router = useRouter()
  const { doctor, isLoading } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    totalPatients: 0,
    weekAppointments: 0,
    monthRevenue: 0,
    lastWeekPatients: 0,
    lastWeekAppointments: 0,
    lastMonthRevenue: 0,
  })
  const [loadingStats, setLoadingStats] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [weekDates, setWeekDates] = useState<Date[]>([])
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([])
  const [loadingAppointments, setLoadingAppointments] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<{id: string, name: string, email: string, type: 'patient' | 'appointment'}[]>([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)

  // Generate week dates
  useEffect(() => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 }) // Start from Monday
    const dates = Array.from({ length: 6 }, (_, i) => addDays(start, i))
    setWeekDates(dates)
  }, [selectedDate])

  // Fetch appointments for selected date
  useEffect(() => {
    const fetchAppointments = async () => {
      if (!doctor) return
      setLoadingAppointments(true)

      const supabase = createClient()
      const dateStr = format(selectedDate, 'yyyy-MM-dd')

      try {
        const { data } = await supabase
          .from('doc_appointments')
          .select('id, patient_name, patient_email, patient_id, start_time, end_time, visit_type, status')
          .eq('doctor_id', doctor.id)
          .eq('appointment_date', dateStr)
          .in('status', ['confirmed', 'pending'])
          .order('start_time', { ascending: true })

        setTodayAppointments(data || [])
      } catch (error) {
        console.error('Error fetching appointments:', error)
      } finally {
        setLoadingAppointments(false)
      }
    }

    if (doctor) {
      fetchAppointments()
    }
  }, [doctor, selectedDate])

  useEffect(() => {
    const fetchStats = async () => {
      if (!doctor) return

      const supabase = createClient()
      const today = new Date()
      const weekStart = startOfWeek(today, { weekStartsOn: 1 })
      const lastWeekStart = addDays(weekStart, -7)
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
      const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0)

      try {
        // Get unique patients
        const { data: patientData } = await supabase
          .from('doc_appointments')
          .select('patient_email')
          .eq('doctor_id', doctor.id)

        const uniquePatients = new Set(patientData?.map((p: { patient_email: string }) => p.patient_email) || [])

        // Get week's appointments
        const { count: weekCount } = await supabase
          .from('doc_appointments')
          .select('*', { count: 'exact', head: true })
          .eq('doctor_id', doctor.id)
          .gte('appointment_date', format(weekStart, 'yyyy-MM-dd'))
          .lte('appointment_date', format(today, 'yyyy-MM-dd'))

        // Get last week's appointments for comparison
        const { count: lastWeekCount } = await supabase
          .from('doc_appointments')
          .select('*', { count: 'exact', head: true })
          .eq('doctor_id', doctor.id)
          .gte('appointment_date', format(lastWeekStart, 'yyyy-MM-dd'))
          .lt('appointment_date', format(weekStart, 'yyyy-MM-dd'))

        // Get month's revenue - convert all to USD
        const INR_TO_USD = 85
        const { data: revenueData, error: revError } = await supabase
          .from('doc_appointments')
          .select('amount, patient_id')
          .eq('doctor_id', doctor.id)
          .eq('payment_status', 'paid')
          .gte('appointment_date', format(monthStart, 'yyyy-MM-dd'))

        // Fetch patient residency for currency detection
        let patientCurrencyMap: Record<string, boolean> = {}
        if (revenueData && revenueData.length > 0) {
          const patientIds = [...new Set(revenueData.map((r: any) => r.patient_id).filter(Boolean))]
          if (patientIds.length > 0) {
            const { data: patients } = await supabase
              .from('doc_patients')
              .select('id, is_indian_resident')
              .in('id', patientIds)
            patients?.forEach((p: any) => { patientCurrencyMap[p.id] = p.is_indian_resident })
          }
        }

        const monthRevenue = Math.round((revenueData?.reduce((sum: number, row: any) => {
          const amount = row.amount || 0
          const isIndian = patientCurrencyMap[row.patient_id]
          // Indian patients paid in INR, convert to USD. Others already in USD.
          return sum + (isIndian === true ? amount / INR_TO_USD : amount)
        }, 0) || 0) * 100) / 100

        // Get last month's revenue for comparison
        const { data: lastMonthRevenueData } = await supabase
          .from('doc_appointments')
          .select('amount, patient_id')
          .eq('doctor_id', doctor.id)
          .eq('payment_status', 'paid')
          .gte('appointment_date', format(lastMonthStart, 'yyyy-MM-dd'))
          .lte('appointment_date', format(lastMonthEnd, 'yyyy-MM-dd'))

        // Fetch patient residency for last month too
        if (lastMonthRevenueData && lastMonthRevenueData.length > 0) {
          const lastPatientIds: string[] = [...new Set(lastMonthRevenueData.map((r: any) => r.patient_id).filter(Boolean))] as string[]
          const missingIds = lastPatientIds.filter(id => !(id in patientCurrencyMap))
          if (missingIds.length > 0) {
            const { data: patients } = await supabase
              .from('doc_patients')
              .select('id, is_indian_resident')
              .in('id', missingIds)
            patients?.forEach((p: any) => { patientCurrencyMap[p.id] = p.is_indian_resident })
          }
        }

        const lastMonthRevenue = Math.round((lastMonthRevenueData?.reduce((sum: number, row: any) => {
          const amount = row.amount || 0
          const isIndian = patientCurrencyMap[row.patient_id]
          return sum + (isIndian === true ? amount / INR_TO_USD : amount)
        }, 0) || 0) * 100) / 100

        setStats({
          totalPatients: uniquePatients.size || 0,
          weekAppointments: weekCount || 0,
          monthRevenue,
          lastWeekPatients: 0,
          lastWeekAppointments: lastWeekCount || 0,
          lastMonthRevenue,
        })
      } catch (error) {
        console.error('Error fetching stats:', error)
      } finally {
        setLoadingStats(false)
      }
    }

    if (doctor) {
      fetchStats()
    }
  }, [doctor])

  const calculatePercentChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0
    return Math.round(((current - previous) / previous) * 100)
  }

  const getTimeSlots = () => {
    const slots: { time: string; appointments: Appointment[] }[] = []
    const hours = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00']
    
    hours.forEach(hour => {
      const hourAppointments = todayAppointments.filter(apt => 
        apt.start_time.startsWith(hour.split(':')[0])
      )
      slots.push({ time: hour, appointments: hourAppointments })
    })
    
    return slots
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
      </div>
    )
  }

  const weekApptsChange = calculatePercentChange(stats.weekAppointments, stats.lastWeekAppointments)
  const revenueChange = calculatePercentChange(stats.monthRevenue, stats.lastMonthRevenue)

  // Search with autocomplete
  useEffect(() => {
    const searchPatients = async () => {
      if (!doctor || searchQuery.trim().length < 2) {
        setSearchResults([])
        return
      }

      setSearchLoading(true)
      const supabase = createClient()
      const query = searchQuery.trim().toLowerCase()

      try {
        // Search in appointments (which has patient info)
        const { data: appointments } = await supabase
          .from('doc_appointments')
          .select('id, patient_name, patient_email, patient_id')
          .eq('doctor_id', doctor.id)
          .or(`patient_name.ilike.%${query}%,patient_email.ilike.%${query}%`)
          .limit(5)

        // Search in registered patients
        const { data: patients } = await supabase
          .from('doc_patients')
          .select('id, first_name, last_name, email')
          .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
          .limit(5)

        const results: {id: string, name: string, email: string, type: 'patient' | 'appointment'}[] = []
        const seenEmails = new Set<string>()

        // Add patients first
        patients?.forEach((p: {id: string, first_name: string, last_name: string, email: string}) => {
          if (!seenEmails.has(p.email.toLowerCase())) {
            seenEmails.add(p.email.toLowerCase())
            results.push({
              id: p.id,
              name: `${p.first_name} ${p.last_name}`,
              email: p.email,
              type: 'patient'
            })
          }
        })

        // Add appointment patients
        appointments?.forEach((a: {id: string, patient_name: string, patient_email: string, patient_id: string | null}) => {
          if (!seenEmails.has(a.patient_email.toLowerCase())) {
            seenEmails.add(a.patient_email.toLowerCase())
            results.push({
              id: a.patient_id || a.patient_email,
              name: a.patient_name,
              email: a.patient_email,
              type: 'appointment'
            })
          }
        })

        setSearchResults(results.slice(0, 6))
      } catch (error) {
        console.error('Search error:', error)
      } finally {
        setSearchLoading(false)
      }
    }

    const debounce = setTimeout(searchPatients, 300)
    return () => clearTimeout(debounce)
  }, [searchQuery, doctor])

  // Search handler
  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      setShowSearchResults(false)
      router.push(`/patients?search=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  const handleSearchResultClick = (result: {id: string, name: string, email: string, type: 'patient' | 'appointment'}) => {
    setShowSearchResults(false)
    setSearchQuery('')
    if (result.type === 'patient') {
      router.push(`/patients/${result.id}`)
    } else {
      // For appointment patients without proper ID, use email
      if (result.id.includes('@')) {
        router.push(`/patients/email/${encodeURIComponent(result.email)}`)
      } else {
        router.push(`/patients/${result.id}`)
      }
    }
  }

  // Navigate to patient details
  const handleAppointmentClick = (apt: Appointment) => {
    if (apt.patient_id) {
      router.push(`/patients/${apt.patient_id}`)
    } else {
      // If no patient_id, search by email
      router.push(`/patients/email/${encodeURIComponent(apt.patient_email)}`)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Main Content */}
      <div className="flex-1 p-6 lg:pr-96">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Hello, Dr. {doctor?.full_name?.split(' ')[1] || doctor?.full_name || 'Doctor'}
            </h1>
            <p className="text-gray-500">Save the person who needs your help!</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors">
              <Bell className="h-5 w-5 text-gray-600" />
            </button>
            <Link href="/settings">
              <button className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors">
                <Settings className="h-5 w-5 text-gray-600" />
              </button>
            </Link>
          </div>
        </div>

        {/* Search Bar with Autocomplete */}
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 z-10" />
          <Input 
            placeholder="Search patients by name or email..." 
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setShowSearchResults(true)
            }}
            onKeyDown={handleSearch}
            onFocus={() => setShowSearchResults(true)}
            onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
            className="pl-12 py-6 bg-white border-gray-200 rounded-xl shadow-sm"
          />
          
          {/* Search Results Dropdown */}
          {showSearchResults && searchQuery.trim().length >= 2 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
              {searchLoading ? (
                <div className="p-4 text-center text-gray-500">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-500 mx-auto"></div>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="py-2">
                  <p className="px-4 py-1 text-xs text-gray-400 uppercase">Patients</p>
                  {searchResults.map((result, index) => (
                    <div
                      key={`${result.id}-${index}`}
                      onClick={() => handleSearchResultClick(result)}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-green-700">
                          {result.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{result.name}</p>
                        <p className="text-xs text-gray-500 truncate">{result.email}</p>
                      </div>
                      <Users className="h-4 w-4 text-gray-400" />
                    </div>
                  ))}
                  <div 
                    onClick={() => {
                      setShowSearchResults(false)
                      router.push(`/patients?search=${encodeURIComponent(searchQuery.trim())}`)
                    }}
                    className="border-t border-gray-100 px-4 py-3 text-center text-sm text-green-600 hover:bg-gray-50 cursor-pointer"
                  >
                    View all results for "{searchQuery}"
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center text-gray-500 text-sm">
                  No patients found for "{searchQuery}"
                </div>
              )}
            </div>
          )}
        </div>

        {/* Overview Section */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Total Patients */}
            <Link href="/patients">
              <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <Users className="h-5 w-5 text-blue-500" />
                    </div>
                    <span className="text-gray-600 text-sm">Total Patient</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-900 mb-1">
                    {loadingStats ? '-' : stats.totalPatients}
                  </p>
                  <p className="text-sm text-green-500">
                    +25% <span className="text-gray-400">than last week</span>
                  </p>
                </CardContent>
              </Card>
            </Link>

            {/* Week Appointments */}
            <Link href="/appointments">
              <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-green-50 rounded-lg">
                      <Calendar className="h-5 w-5 text-green-500" />
                    </div>
                    <span className="text-gray-600 text-sm">This Weeks Appointments</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-900 mb-1">
                    {loadingStats ? '-' : stats.weekAppointments}
                  </p>
                  <p className="text-sm">
                    <span className={weekApptsChange >= 0 ? 'text-green-500' : 'text-red-500'}>
                      {weekApptsChange >= 0 ? '+' : ''}{weekApptsChange}%
                    </span>
                    <span className="text-gray-400"> than last week</span>
                  </p>
                </CardContent>
              </Card>
            </Link>

            {/* Revenue */}
            <Link href="/appointments">
              <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-amber-50 rounded-lg">
                      <DollarSign className="h-5 w-5 text-amber-500" />
                    </div>
                    <span className="text-gray-600 text-sm">Revenue This Month</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-900 mb-1">
                    {loadingStats ? '-' : `$${stats.monthRevenue.toLocaleString()}`}
                  </p>
                  <p className="text-sm">
                    <span className={revenueChange >= 0 ? 'text-green-500' : 'text-red-500'}>
                      {revenueChange >= 0 ? '+' : ''}{revenueChange}%
                    </span>
                    <span className="text-gray-400"> than last month</span>
                  </p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>

        {/* Digital Doctors Office Section */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Digital Doctors Office (New Features)</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <Link key={action.title} href={action.href}>
                <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-all cursor-pointer group">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Badge className="bg-green-500 text-white text-xs">{action.badge}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-700 font-medium text-sm group-hover:text-green-600 transition-colors">
                        {action.title}
                      </span>
                      <Info className="h-4 w-4 text-gray-400" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Performance Overview */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Performance Overview</h2>
          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100">
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-50 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-purple-500" />
                    </div>
                    <span className="text-gray-700 font-medium">Consultancy Rate</span>
                  </div>
                  <span className="text-green-500 font-semibold">+12%</span>
                </div>
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <Users className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <span className="text-gray-700 font-medium">New Patient</span>
                      <span className="text-gray-400 text-sm ml-2">11:00 AM</span>
                    </div>
                  </div>
                  <span className="text-green-500 font-semibold">+8 This Week</span>
                </div>
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-50 rounded-lg">
                      <Calendar className="h-5 w-5 text-green-500" />
                    </div>
                    <span className="text-gray-700 font-medium">Appointments Fill Rate</span>
                  </div>
                  <span className="text-green-500 font-semibold">+85</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Profile Completion Banner */}
        {doctor && !doctor.is_verified && (
          <Card className="mt-6 bg-amber-50 border-amber-200">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-amber-800">Complete Your Profile</p>
                <p className="text-sm text-amber-600">
                  Add your details to get verified and start accepting appointments
                </p>
              </div>
              <Link href="/settings">
                <button className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors">
                  Complete Profile
                </button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Right Sidebar - Appointments */}
      <div className="hidden lg:block fixed right-0 top-0 h-screen w-80 bg-slate-800 text-white overflow-y-auto">
        <div className="p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">Appointments</h3>
              <Info className="h-4 w-4 text-slate-400" />
            </div>
            <button className="p-1 hover:bg-slate-700 rounded">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>
          </div>

          {/* Date */}
          <p className="text-slate-400 text-sm mb-4">
            {format(selectedDate, 'EEEE, do')}
          </p>

          {/* Week Navigation */}
          <div className="flex items-center justify-between mb-6">
            <button 
              onClick={() => setSelectedDate(addDays(selectedDate, -7))}
              className="p-1 hover:bg-slate-700 rounded"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex gap-2">
              {weekDates.map((date, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedDate(date)}
                  className={`w-10 h-12 rounded-lg flex flex-col items-center justify-center text-xs transition-colors ${
                    isSameDay(date, selectedDate)
                      ? 'bg-green-500 text-white'
                      : 'hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  <span className="font-semibold">{format(date, 'd')}</span>
                  <span className="text-[10px] uppercase">{format(date, 'EEE')}</span>
                </button>
              ))}
            </div>
            <button 
              onClick={() => setSelectedDate(addDays(selectedDate, 7))}
              className="p-1 hover:bg-slate-700 rounded"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Timeline */}
          <div className="space-y-4">
            {loadingAppointments ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500" />
              </div>
            ) : todayAppointments.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No appointments</p>
                <p className="text-xs">for this day</p>
              </div>
            ) : (
              getTimeSlots().map((slot, index) => (
                <div key={index} className="relative">
                  {/* Time Label */}
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs text-slate-400 w-12">{slot.time}</span>
                    <div className="flex-1 h-px bg-slate-700" />
                  </div>

                  {/* Appointments in this slot */}
                  {slot.appointments.length > 0 && (
                    <div className="ml-14 space-y-2">
                      {slot.appointments.map((apt) => (
                        <div
                          key={apt.id}
                          onClick={() => handleAppointmentClick(apt)}
                          className="flex items-center gap-3 p-2 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-600/50 transition-colors"
                        >
                          <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium">
                              {apt.patient_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{apt.patient_name}</p>
                            <p className="text-xs text-slate-400">
                              {apt.start_time.slice(0, 5)} - {apt.end_time.slice(0, 5)}
                            </p>
                          </div>
                          {apt.visit_type === 'online' && (
                            <Video className="h-4 w-4 text-green-400" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Break time indicator (example for lunch) */}
                  {slot.time === '13:00' && slot.appointments.length === 0 && (
                    <div className="ml-14 p-3 bg-slate-700/30 rounded-lg border border-dashed border-slate-600">
                      <p className="text-sm text-slate-400 text-center">Have a Break</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
