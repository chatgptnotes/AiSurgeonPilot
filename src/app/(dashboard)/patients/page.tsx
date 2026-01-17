'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Header } from '@/components/dashboard/header'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Search, Users, Phone, Mail, Calendar, Star, AlertTriangle } from 'lucide-react'
import type { Patient, PatientDoctorSelection, PatientAllergy } from '@/types/database'

interface PatientWithSelection extends Patient {
  selection?: PatientDoctorSelection
  allergies?: PatientAllergy[]
}

export default function PatientsPage() {
  const { doctor, isLoading: authLoading } = useAuth()
  const [patients, setPatients] = useState<PatientWithSelection[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const fetchPatients = async () => {
      if (!doctor) return

      const supabase = createClient()
      const allPatients: PatientWithSelection[] = []
      const processedEmails = new Set<string>()

      // 1. First, fetch patients who explicitly selected this doctor
      const { data: selections } = await supabase
        .from('doc_patient_doctor_selections')
        .select('*')
        .eq('doctor_id', doctor.id)
        .eq('status', 'active')
        .order('selected_at', { ascending: false })

      if (selections && selections.length > 0) {
        const patientIds = selections.map((s: PatientDoctorSelection) => s.patient_id)

        const { data: patientData } = await supabase
          .from('doc_patients')
          .select('*')
          .in('id', patientIds)

        const { data: allergiesData } = await supabase
          .from('doc_patient_allergies')
          .select('*')
          .in('patient_id', patientIds)

        if (patientData) {
          for (const patient of patientData) {
            const selection = selections.find((s: PatientDoctorSelection) => s.patient_id === patient.id)
            const patientAllergies = (allergiesData || []).filter((a: PatientAllergy) => a.patient_id === patient.id)
            allPatients.push({
              ...patient,
              selection,
              allergies: patientAllergies,
            })
            processedEmails.add(patient.email.toLowerCase())
          }
        }
      }

      // 2. Fetch patients from appointments (including patient_id if available)
      const { data: appointmentPatients } = await supabase
        .from('doc_appointments')
        .select('patient_id, patient_email, patient_name, created_at')
        .eq('doctor_id', doctor.id)
        .order('created_at', { ascending: false })

      if (appointmentPatients && appointmentPatients.length > 0) {
        // Collect unique patient IDs and emails from appointments
        const appointmentPatientIds = new Set<string>()
        const appointmentEmailsMap = new Map<string, { patient_id: string | null; patient_email: string; patient_name: string; created_at: string }>()

        for (const p of appointmentPatients) {
          // Track patient IDs (if available)
          if (p.patient_id && !processedEmails.has(p.patient_email.toLowerCase())) {
            appointmentPatientIds.add(p.patient_id)
          }
          // Track emails
          const lowerEmail = p.patient_email.toLowerCase()
          if (!processedEmails.has(lowerEmail) && !appointmentEmailsMap.has(lowerEmail)) {
            appointmentEmailsMap.set(lowerEmail, p)
          }
        }

        // 3a. First, fetch patients by their patient_id (most reliable)
        if (appointmentPatientIds.size > 0) {
          const { data: patientsByIdData } = await supabase
            .from('doc_patients')
            .select('*')
            .in('id', [...appointmentPatientIds])

          if (patientsByIdData && patientsByIdData.length > 0) {
            const patientIds = patientsByIdData.map((p: Patient) => p.id)

            const { data: allergiesData } = await supabase
              .from('doc_patient_allergies')
              .select('*')
              .in('patient_id', patientIds)

            for (const patient of patientsByIdData) {
              const patientAllergies = (allergiesData || []).filter((a: PatientAllergy) => a.patient_id === patient.id)
              allPatients.push({
                ...patient,
                allergies: patientAllergies,
              })
              processedEmails.add(patient.email.toLowerCase())
            }
          }
        }

        // 3b. For remaining emails, try to find by email (case-insensitive)
        const remainingEmails = [...appointmentEmailsMap.keys()].filter(
          (email) => !processedEmails.has(email)
        )

        if (remainingEmails.length > 0) {
          const { data: allRegisteredPatients } = await supabase
            .from('doc_patients')
            .select('*')

          const patientsByEmail = (allRegisteredPatients || []).filter((p: Patient) =>
            remainingEmails.includes(p.email.toLowerCase())
          )

          if (patientsByEmail.length > 0) {
            const patientIds = patientsByEmail.map((p: Patient) => p.id)

            const { data: allergiesData } = await supabase
              .from('doc_patient_allergies')
              .select('*')
              .in('patient_id', patientIds)

            for (const patient of patientsByEmail) {
              const patientAllergies = (allergiesData || []).filter((a: PatientAllergy) => a.patient_id === patient.id)
              allPatients.push({
                ...patient,
                allergies: patientAllergies,
              })
              processedEmails.add(patient.email.toLowerCase())
            }
          }
        }

        // 4. For remaining emails (truly not registered), create basic patient objects
        for (const [lowerEmail, appointmentInfo] of appointmentEmailsMap) {
          if (!processedEmails.has(lowerEmail)) {
            const nameParts = (appointmentInfo.patient_name || 'Unknown Patient').split(' ')
            allPatients.push({
              id: `unregistered-${lowerEmail}`,
              user_id: null,
              email: appointmentInfo.patient_email,
              first_name: nameParts[0] || 'Unknown',
              last_name: nameParts.slice(1).join(' ') || '',
              phone_number: null,
              date_of_birth: '1990-01-01',
              gender: 'other' as const,
              blood_group: null,
              height_cm: null,
              weight_kg: null,
              marital_status: null,
              profile_image_url: null,
              is_profile_complete: false,
              is_active: true,
              created_at: appointmentInfo.created_at,
              updated_at: appointmentInfo.created_at,
            })
          }
        }
      }

      // Sort by created_at date
      allPatients.sort((a, b) => {
        const dateA = a.selection?.selected_at || a.created_at || ''
        const dateB = b.selection?.selected_at || b.created_at || ''
        return dateB.localeCompare(dateA)
      })

      setPatients(allPatients)
      setLoading(false)
    }

    if (doctor) {
      fetchPatients()
    }
  }, [doctor])

  const filteredPatients = patients.filter(patient => {
    const fullName = `${patient.first_name} ${patient.last_name}`.toLowerCase()
    const query = searchQuery.toLowerCase()
    return (
      fullName.includes(query) ||
      patient.email.toLowerCase().includes(query) ||
      (patient.phone_number || '').includes(query)
    )
  })

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase()
  }

  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
      </div>
    )
  }

  return (
    <div>
      <Header title="My Patients" />

      <div className="p-6 space-y-6">
        {/* Search */}
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Patient Count */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Users className="h-4 w-4" />
          <span>{filteredPatients.length} patient{filteredPatients.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Patients Grid */}
        {filteredPatients.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">
                {searchQuery ? 'No patients match your search' : 'No patients found'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredPatients.map((patient) => {
              const isUnregisteredPatient = patient.id.startsWith('unregistered-')

              const cardContent = (
                <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={patient.profile_image_url || ''} />
                        <AvatarFallback className="bg-green-100 text-green-700">
                          {getInitials(patient.first_name, patient.last_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium truncate">
                            {patient.first_name} {patient.last_name}
                          </h3>
                          {patient.selection?.is_primary_doctor && (
                            <Badge className="bg-yellow-100 text-yellow-800 gap-1">
                              <Star className="h-3 w-3" />
                              Primary
                            </Badge>
                          )}
                          {isUnregisteredPatient && (
                            <Badge variant="outline" className="text-xs bg-gray-50">
                              Not Registered
                            </Badge>
                          )}
                        </div>
                        <div className="mt-1 space-y-1">
                          <p className="text-sm text-gray-500 flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            <span className="truncate">{patient.email}</span>
                          </p>
                          {patient.phone_number && (
                            <p className="text-sm text-gray-500 flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {patient.phone_number}
                            </p>
                          )}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {!isUnregisteredPatient && (
                            <Badge variant="outline" className="text-xs">
                              {calculateAge(patient.date_of_birth)} yrs, {patient.gender}
                            </Badge>
                          )}
                          {patient.blood_group && (
                            <Badge variant="outline" className="text-xs">
                              {patient.blood_group}
                            </Badge>
                          )}
                          {patient.allergies && patient.allergies.length > 0 && (
                            <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              {patient.allergies.length} Allerg{patient.allergies.length === 1 ? 'y' : 'ies'}
                            </Badge>
                          )}
                        </div>
                        {patient.selection?.selected_at && (
                          <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Patient since {format(new Date(patient.selection.selected_at), 'MMM d, yyyy')}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )

              // For unregistered patients, link using email as identifier
              const patientLink = isUnregisteredPatient
                ? `/patients/email/${encodeURIComponent(patient.email)}`
                : `/patients/${patient.id}`

              return (
                <Link key={patient.id} href={patientLink}>
                  {cardContent}
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
