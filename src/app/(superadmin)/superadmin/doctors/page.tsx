'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  Search,
  MoreVertical,
  Edit,
  Mail,
  UserCheck,
  UserX,
  Eye,
  Loader2,
  RefreshCw
} from 'lucide-react'

interface Doctor {
  id: string
  user_id: string
  full_name: string
  email: string
  phone: string | null
  specialization: string | null
  qualification: string | null
  is_verified: boolean
  is_active: boolean
  created_at: string
  created_by: string | null
  creator?: {
    full_name: string
  }
}

export default function DoctorsListPage() {
  const searchParams = useSearchParams()
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    fetchDoctors()
  }, [])

  useEffect(() => {
    filterDoctors()
  }, [doctors, searchQuery, statusFilter])

  const fetchDoctors = async () => {
    setIsLoading(true)
    const supabase = createClient()

    // Fetch doctors
    const { data, error } = await supabase
      .from('doc_doctors')
      .select('*')
      .eq('role', 'doctor')
      .order('created_at', { ascending: false })

    if (error) {
      toast.error('Failed to fetch doctors')
      console.error(error)
    } else {
      // Fetch creator names for doctors with created_by
      const doctorsWithCreators = await Promise.all(
        (data || []).map(async (doctor) => {
          if (doctor.created_by) {
            const { data: creator } = await supabase
              .from('doc_doctors')
              .select('full_name')
              .eq('id', doctor.created_by)
              .single()
            return { ...doctor, creator }
          }
          return doctor
        })
      )
      setDoctors(doctorsWithCreators)
    }
    setIsLoading(false)
  }

  const filterDoctors = () => {
    let filtered = [...doctors]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        d =>
          d.full_name.toLowerCase().includes(query) ||
          d.email.toLowerCase().includes(query) ||
          (d.specialization && d.specialization.toLowerCase().includes(query))
      )
    }

    // Status filter
    if (statusFilter === 'active') {
      filtered = filtered.filter(d => d.is_active !== false)
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter(d => d.is_active === false)
    } else if (statusFilter === 'pending') {
      filtered = filtered.filter(d => !d.is_verified)
    } else if (statusFilter === 'verified') {
      filtered = filtered.filter(d => d.is_verified)
    }

    setFilteredDoctors(filtered)
  }

  const handleVerify = async (doctorId: string, verify: boolean) => {
    setActionLoading(doctorId)
    const supabase = createClient()

    const { error } = await supabase
      .from('doc_doctors')
      .update({ is_verified: verify })
      .eq('id', doctorId)

    if (error) {
      toast.error('Failed to update verification status')
    } else {
      toast.success(verify ? 'Doctor verified successfully' : 'Doctor verification removed')
      fetchDoctors()
    }
    setActionLoading(null)
  }

  const handleToggleActive = async (doctorId: string, isActive: boolean) => {
    setActionLoading(doctorId)
    const supabase = createClient()

    const { error } = await supabase
      .from('doc_doctors')
      .update({ is_active: !isActive })
      .eq('id', doctorId)

    if (error) {
      toast.error('Failed to update doctor status')
    } else {
      toast.success(isActive ? 'Doctor deactivated' : 'Doctor activated')
      fetchDoctors()
    }
    setActionLoading(null)
  }

  const handleResendCredentials = async (doctor: Doctor) => {
    setActionLoading(doctor.id)
    try {
      const response = await fetch('/api/superadmin/doctors/resend-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctorId: doctor.id }),
      })

      if (!response.ok) {
        throw new Error('Failed to resend credentials')
      }

      toast.success('Credentials sent successfully')
    } catch (error) {
      toast.error('Failed to resend credentials')
    }
    setActionLoading(null)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Doctors</h1>
          <p className="text-gray-500 mt-1">View all doctors created by Admin Clinical users</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, email, or specialization..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Doctors</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="pending">Pending Verification</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchDoctors}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Doctors Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {filteredDoctors.length} Doctor{filteredDoctors.length !== 1 ? 's' : ''} Found
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : filteredDoctors.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No doctors found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Specialization</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Verified</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDoctors.map((doctor) => (
                    <TableRow key={doctor.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-indigo-600">
                              {doctor.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{doctor.full_name}</p>
                            <p className="text-sm text-gray-500">{doctor.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-gray-600">
                          {doctor.specialization || '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-gray-600">
                          {doctor.creator?.full_name || '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={doctor.is_active !== false ? 'default' : 'secondary'}
                          className={doctor.is_active !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}
                        >
                          {doctor.is_active !== false ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={doctor.is_verified ? 'default' : 'secondary'}
                          className={doctor.is_verified ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}
                        >
                          {doctor.is_verified ? 'Verified' : 'Pending'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-gray-600">{formatDate(doctor.created_at)}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" disabled={actionLoading === doctor.id}>
                              {actionLoading === doctor.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <MoreVertical className="h-4 w-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/superadmin/doctors/${doctor.id}`}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/superadmin/doctors/${doctor.id}/edit`}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleResendCredentials(doctor)}>
                              <Mail className="h-4 w-4 mr-2" />
                              Resend Credentials
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {doctor.is_verified ? (
                              <DropdownMenuItem onClick={() => handleVerify(doctor.id, false)}>
                                <UserX className="h-4 w-4 mr-2" />
                                Remove Verification
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => handleVerify(doctor.id, true)}>
                                <UserCheck className="h-4 w-4 mr-2" />
                                Verify Doctor
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => handleToggleActive(doctor.id, doctor.is_active !== false)}
                              className={doctor.is_active !== false ? 'text-red-600' : 'text-green-600'}
                            >
                              {doctor.is_active !== false ? (
                                <>
                                  <UserX className="h-4 w-4 mr-2" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <UserCheck className="h-4 w-4 mr-2" />
                                  Activate
                                </>
                              )}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
