'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/dashboard/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'
import { format } from 'date-fns'
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  Calendar,
  Droplet,
  Ruler,
  Weight,
  Heart,
  Star,
  AlertTriangle,
  Pill,
  FileText,
  Clock,
  Video,
  MapPin,
  FolderOpen,
  Download,
  Eye,
} from 'lucide-react'
import type {
  Patient,
  PatientDoctorSelection,
  PatientMedicalHistory,
  PatientAllergy,
  PatientMedication,
  Appointment,
} from '@/types/database'

const severityColors: Record<string, string> = {
  mild: 'bg-yellow-100 text-yellow-800',
  moderate: 'bg-orange-100 text-orange-800',
  severe: 'bg-red-100 text-red-800',
}

const conditionTypeColors: Record<string, string> = {
  chronic: 'bg-purple-100 text-purple-800',
  past: 'bg-gray-100 text-gray-800',
  ongoing: 'bg-blue-100 text-blue-800',
  genetic: 'bg-pink-100 text-pink-800',
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-green-100 text-green-800',
  completed: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-red-100 text-red-800',
}

export default function PatientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const patientId = params.id as string
  const { doctor, isLoading: authLoading } = useAuth()

  const [patient, setPatient] = useState<Patient | null>(null)
  const [selection, setSelection] = useState<PatientDoctorSelection | null>(null)
  const [medicalHistory, setMedicalHistory] = useState<PatientMedicalHistory[]>([])
  const [allergies, setAllergies] = useState<PatientAllergy[]>([])
  const [medications, setMedications] = useState<PatientMedication[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [documents, setDocuments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPatientData = async () => {
      if (!doctor || !patientId) return

      const supabase = createClient()

      // Fetch patient basic info
      const { data: patientData, error: patientError } = await supabase
        .from('doc_patients')
        .select('*')
        .eq('id', patientId)
        .single()

      if (patientError || !patientData) {
        toast.error('Patient not found')
        router.push('/patients')
        return
      }

      setPatient(patientData)

      // Fetch all related data in parallel
      const [selectionRes, historyRes, allergiesRes, medsRes, appointmentsRes, documentsRes] = await Promise.all([
        supabase
          .from('doc_patient_doctor_selections')
          .select('*')
          .eq('patient_id', patientId)
          .eq('doctor_id', doctor.id)
          .single(),
        supabase
          .from('doc_patient_medical_history')
          .select('*')
          .eq('patient_id', patientId)
          .order('is_current', { ascending: false })
          .order('created_at', { ascending: false }),
        supabase
          .from('doc_patient_allergies')
          .select('*')
          .eq('patient_id', patientId)
          .order('severity', { ascending: false }),
        supabase
          .from('doc_patient_medications')
          .select('*')
          .eq('patient_id', patientId)
          .order('is_current', { ascending: false })
          .order('created_at', { ascending: false }),
        supabase
          .from('doc_appointments')
          .select('*')
          .eq('patient_id', patientId)
          .eq('doctor_id', doctor.id)
          .order('appointment_date', { ascending: false })
          .order('start_time', { ascending: false }),
        supabase
          .from('doc_patient_reports')
          .select('*')
          .eq('doc_patient_id', patientId)
          .eq('doctor_id', doctor.id)
          .order('created_at', { ascending: false }),
      ])

      if (selectionRes.data) setSelection(selectionRes.data)
      if (historyRes.data) setMedicalHistory(historyRes.data)
      if (allergiesRes.data) setAllergies(allergiesRes.data)
      if (medsRes.data) setMedications(medsRes.data)
      if (appointmentsRes.data) setAppointments(appointmentsRes.data)
      if (documentsRes.data) setDocuments(documentsRes.data)

      setLoading(false)
    }

    if (doctor) {
      fetchPatientData()
    }
  }, [doctor, patientId, router])

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

  if (!patient) {
    return null
  }

  const currentMedications = medications.filter((m) => m.is_current)
  const pastMedications = medications.filter((m) => !m.is_current)
  const currentConditions = medicalHistory.filter((h) => h.is_current)
  const pastConditions = medicalHistory.filter((h) => !h.is_current)

  return (
    <div>
      <Header title="Patient Profile" />

      <div className="p-6 space-y-6">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => router.push('/patients')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Patients
        </Button>

        {/* Patient Header Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={patient.profile_image_url || ''} />
                <AvatarFallback className="bg-green-100 text-green-700 text-2xl">
                  {getInitials(patient.first_name, patient.last_name)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-bold">
                    {patient.first_name} {patient.last_name}
                  </h1>
                  {selection?.is_primary_doctor && (
                    <Badge className="bg-yellow-100 text-yellow-800 gap-1">
                      <Star className="h-3 w-3" />
                      You are their primary doctor
                    </Badge>
                  )}
                  {allergies.length > 0 && (
                    <Badge className="bg-red-100 text-red-800 gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Has Allergies
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail className="h-4 w-4" />
                    <span>{patient.email}</span>
                  </div>
                  {patient.phone_number && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone className="h-4 w-4" />
                      <span>{patient.phone_number}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>{calculateAge(patient.date_of_birth)} years old</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <User className="h-4 w-4" />
                    <span className="capitalize">{patient.gender}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  {patient.blood_group && (
                    <Badge variant="outline" className="gap-1">
                      <Droplet className="h-3 w-3 text-red-500" />
                      Blood: {patient.blood_group}
                    </Badge>
                  )}
                  {patient.height_cm && (
                    <Badge variant="outline" className="gap-1">
                      <Ruler className="h-3 w-3" />
                      {patient.height_cm} cm
                    </Badge>
                  )}
                  {patient.weight_kg && (
                    <Badge variant="outline" className="gap-1">
                      <Weight className="h-3 w-3" />
                      {patient.weight_kg} kg
                    </Badge>
                  )}
                  {patient.marital_status && (
                    <Badge variant="outline" className="gap-1">
                      <Heart className="h-3 w-3" />
                      <span className="capitalize">{patient.marital_status}</span>
                    </Badge>
                  )}
                </div>

                {selection?.selected_at && (
                  <p className="text-sm text-gray-500">
                    Patient since {format(new Date(selection.selected_at), 'MMMM d, yyyy')}
                    {selection.selection_reason && ` - "${selection.selection_reason}"`}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for different sections */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="history">Medical History</TabsTrigger>
            <TabsTrigger value="appointments">Appointments ({appointments.length})</TabsTrigger>
            <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Allergies Card */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    Allergies
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {allergies.length === 0 ? (
                    <p className="text-sm text-gray-500">No allergies recorded</p>
                  ) : (
                    <div className="space-y-2">
                      {allergies.map((allergy) => (
                        <div key={allergy.id} className="flex items-start justify-between p-2 bg-gray-50 rounded">
                          <div>
                            <p className="font-medium">{allergy.allergy_name}</p>
                            <p className="text-sm text-gray-500 capitalize">{allergy.allergy_type}</p>
                            {allergy.reaction_description && (
                              <p className="text-sm text-gray-600 mt-1">{allergy.reaction_description}</p>
                            )}
                          </div>
                          {allergy.severity && (
                            <Badge className={severityColors[allergy.severity]}>
                              {allergy.severity}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Current Medications Card */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Pill className="h-5 w-5 text-blue-500" />
                    Current Medications
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {currentMedications.length === 0 ? (
                    <p className="text-sm text-gray-500">No current medications</p>
                  ) : (
                    <div className="space-y-2">
                      {currentMedications.map((med) => (
                        <div key={med.id} className="p-2 bg-gray-50 rounded">
                          <p className="font-medium">{med.medication_name}</p>
                          <div className="text-sm text-gray-500 space-y-0.5">
                            {med.dosage && <p>Dosage: {med.dosage}</p>}
                            {med.frequency && <p>Frequency: {med.frequency}</p>}
                            {med.prescribing_doctor && <p>Prescribed by: {med.prescribing_doctor}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Current Conditions Card */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5 text-purple-500" />
                    Current Conditions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {currentConditions.length === 0 ? (
                    <p className="text-sm text-gray-500">No current conditions recorded</p>
                  ) : (
                    <div className="space-y-2">
                      {currentConditions.map((condition) => (
                        <div key={condition.id} className="flex items-start justify-between p-2 bg-gray-50 rounded">
                          <div>
                            <p className="font-medium">{condition.condition_name}</p>
                            {condition.diagnosed_date && (
                              <p className="text-sm text-gray-500">
                                Diagnosed: {format(new Date(condition.diagnosed_date), 'MMM d, yyyy')}
                              </p>
                            )}
                            {condition.notes && (
                              <p className="text-sm text-gray-600 mt-1">{condition.notes}</p>
                            )}
                          </div>
                          {condition.condition_type && (
                            <Badge className={conditionTypeColors[condition.condition_type]}>
                              {condition.condition_type}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Appointments Card */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5 text-green-500" />
                    Recent Appointments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {appointments.length === 0 ? (
                    <p className="text-sm text-gray-500">No appointments yet</p>
                  ) : (
                    <div className="space-y-2">
                      {appointments.slice(0, 3).map((apt) => (
                        <div key={apt.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex items-center gap-2">
                            {apt.visit_type === 'online' ? (
                              <Video className="h-4 w-4 text-blue-500" />
                            ) : (
                              <MapPin className="h-4 w-4 text-orange-500" />
                            )}
                            <div>
                              <p className="font-medium">
                                {format(new Date(apt.appointment_date), 'MMM d, yyyy')}
                              </p>
                              <p className="text-sm text-gray-500">
                                {apt.start_time} - {apt.end_time}
                              </p>
                            </div>
                          </div>
                          <Badge className={statusColors[apt.status]}>{apt.status}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Medical History Tab */}
          <TabsContent value="history" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Past Conditions */}
              <Card>
                <CardHeader>
                  <CardTitle>Past Medical History</CardTitle>
                </CardHeader>
                <CardContent>
                  {pastConditions.length === 0 ? (
                    <p className="text-sm text-gray-500">No past conditions recorded</p>
                  ) : (
                    <div className="space-y-2">
                      {pastConditions.map((condition) => (
                        <div key={condition.id} className="flex items-start justify-between p-2 bg-gray-50 rounded">
                          <div>
                            <p className="font-medium">{condition.condition_name}</p>
                            {condition.diagnosed_date && (
                              <p className="text-sm text-gray-500">
                                Diagnosed: {format(new Date(condition.diagnosed_date), 'MMM d, yyyy')}
                              </p>
                            )}
                            {condition.notes && (
                              <p className="text-sm text-gray-600 mt-1">{condition.notes}</p>
                            )}
                          </div>
                          {condition.condition_type && (
                            <Badge className={conditionTypeColors[condition.condition_type]}>
                              {condition.condition_type}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Past Medications */}
              <Card>
                <CardHeader>
                  <CardTitle>Past Medications</CardTitle>
                </CardHeader>
                <CardContent>
                  {pastMedications.length === 0 ? (
                    <p className="text-sm text-gray-500">No past medications recorded</p>
                  ) : (
                    <div className="space-y-2">
                      {pastMedications.map((med) => (
                        <div key={med.id} className="p-2 bg-gray-50 rounded">
                          <p className="font-medium">{med.medication_name}</p>
                          <div className="text-sm text-gray-500 space-y-0.5">
                            {med.dosage && <p>Dosage: {med.dosage}</p>}
                            {med.start_date && med.end_date && (
                              <p>
                                {format(new Date(med.start_date), 'MMM d, yyyy')} -{' '}
                                {format(new Date(med.end_date), 'MMM d, yyyy')}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Appointments Tab */}
          <TabsContent value="appointments">
            <Card>
              <CardContent className="p-0">
                {appointments.length === 0 ? (
                  <div className="text-center py-12">
                    <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500">No appointments with this patient</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {appointments.map((apt) => (
                        <TableRow key={apt.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {format(new Date(apt.appointment_date), 'MMM d, yyyy')}
                              </p>
                              <p className="text-sm text-gray-500">
                                {apt.start_time} - {apt.end_time}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="gap-1">
                              {apt.visit_type === 'online' ? (
                                <Video className="h-3 w-3" />
                              ) : (
                                <MapPin className="h-3 w-3" />
                              )}
                              {apt.visit_type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={statusColors[apt.status]}>{apt.status}</Badge>
                          </TableCell>
                          <TableCell>${apt.amount}</TableCell>
                          <TableCell>
                            <span className="text-sm text-gray-500 truncate max-w-[200px] block">
                              {apt.notes || '-'}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5 text-purple-500" />
                  Patient Uploaded Documents
                </CardTitle>
              </CardHeader>
              <CardContent>
                {documents.length === 0 ? (
                  <div className="text-center py-12">
                    <FolderOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500">No documents uploaded by this patient</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-purple-100 rounded-lg">
                            <FileText className="h-6 w-6 text-purple-600" />
                          </div>
                          <div>
                            <p className="font-medium">{doc.file_name}</p>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <Badge variant="outline" className="text-xs">
                                {doc.file_type}
                              </Badge>
                              <span>Uploaded {format(new Date(doc.created_at), 'MMM d, yyyy')}</span>
                            </div>
                            {doc.description && (
                              <p className="text-sm text-gray-600 mt-1">{doc.description}</p>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={async () => {
                            const supabase = createClient()
                            const { data } = await supabase.storage
                              .from('patient-documents')
                              .createSignedUrl(doc.file_url, 3600)
                            if (data?.signedUrl) {
                              window.open(data.signedUrl, '_blank')
                            } else {
                              toast.error('Could not open document')
                            }
                          }}
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
