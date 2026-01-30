'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import {
  Search,
  UserPlus,
  MoreVertical,
  Eye,
  Edit,
  Mail,
  Shield,
  Loader2,
  CheckCircle,
  XCircle,
  RefreshCw
} from 'lucide-react'
import { Doctor } from '@/types/database'

type AdminClinical = Doctor

export default function AdminClinicalListPage() {
  const [admins, setAdmins] = useState<AdminClinical[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    fetchAdmins()
  }, [])

  const fetchAdmins = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('doc_doctors')
        .select('*')
        .eq('role', 'admin_clinical')
        .order('created_at', { ascending: false })

      if (error) throw error
      setAdmins(data || [])
    } catch (error) {
      console.error('Error fetching admin clinical users:', error)
      toast.error('Failed to load admin clinical users')
    } finally {
      setIsLoading(false)
    }
  }

  const filteredAdmins = admins.filter(admin => {
    const query = searchQuery.toLowerCase()
    return (
      admin.full_name.toLowerCase().includes(query) ||
      admin.email.toLowerCase().includes(query) ||
      (admin.phone && admin.phone.includes(query))
    )
  })

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const handleToggleActive = async (admin: AdminClinical) => {
    setActionLoading(admin.id)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('doc_doctors')
        .update({ is_active: !admin.is_active })
        .eq('id', admin.id)

      if (error) throw error

      setAdmins(prev => prev.map(a =>
        a.id === admin.id ? { ...a, is_active: !a.is_active } : a
      ))
      toast.success(`Admin Clinical ${admin.is_active ? 'deactivated' : 'activated'}`)
    } catch (error) {
      console.error('Error toggling status:', error)
      toast.error('Failed to update status')
    } finally {
      setActionLoading(null)
    }
  }

  const handleResendCredentials = async (admin: AdminClinical) => {
    setActionLoading(admin.id)
    try {
      const response = await fetch('/api/superadmin/admin-clinical/resend-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: admin.id }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to resend credentials')
      }

      toast.success('Credentials resent successfully')
    } catch (error) {
      console.error('Error resending credentials:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to resend credentials')
    } finally {
      setActionLoading(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Clinical</h1>
          <p className="text-gray-500">Manage clinical administrators who create and manage doctors</p>
        </div>
        <Link href="/superadmin/admin-clinical/create">
          <Button className="bg-indigo-600 hover:bg-indigo-700">
            <UserPlus className="h-4 w-4 mr-2" />
            Add Admin Clinical
          </Button>
        </Link>
      </div>

      {/* Search and Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="md:col-span-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-indigo-600" />
              <div>
                <p className="text-2xl font-bold">{admins.length}</p>
                <p className="text-xs text-gray-500">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{admins.filter(a => a.is_active).length}</p>
                <p className="text-xs text-gray-500">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Admin Clinical Users</CardTitle>
          <CardDescription>
            {filteredAdmins.length} admin clinical user{filteredAdmins.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredAdmins.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No admin clinical users found</p>
              <Link href="/superadmin/admin-clinical/create">
                <Button variant="outline" className="mt-4">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add First Admin Clinical
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Admin Clinical</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAdmins.map((admin) => (
                  <TableRow key={admin.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={admin.profile_image || ''} />
                          <AvatarFallback className="bg-indigo-100 text-indigo-600">
                            {getInitials(admin.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{admin.full_name}</p>
                          <p className="text-sm text-gray-500">{admin.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{admin.phone || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={admin.is_active ? 'default' : 'secondary'}>
                        {admin.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(admin.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" disabled={actionLoading === admin.id}>
                            {actionLoading === admin.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <MoreVertical className="h-4 w-4" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <Link href={`/superadmin/admin-clinical/${admin.id}`}>
                            <DropdownMenuItem>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                          </Link>
                          <Link href={`/superadmin/admin-clinical/${admin.id}/edit`}>
                            <DropdownMenuItem>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                          </Link>
                          <DropdownMenuItem onClick={() => handleResendCredentials(admin)}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Resend Credentials
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleActive(admin)}>
                            {admin.is_active ? (
                              <>
                                <XCircle className="h-4 w-4 mr-2" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4 mr-2" />
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
          )}
        </CardContent>
      </Card>
    </div>
  )
}
