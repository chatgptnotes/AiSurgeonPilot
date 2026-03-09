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
  Upload,
  Loader2,
  Send,
  ClipboardList,
  Plus,
  Trash2,
  Printer,
  Save,
  Stethoscope,
  X,
  CalendarPlus,
  CheckCircle,
  Bell,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type {
  Patient,
  PatientDoctorSelection,
  PatientMedicalHistory,
  PatientAllergy,
  PatientMedication,
  Appointment,
} from '@/types/database'

// ---- Common medication data for dropdowns ----
const COMMON_MEDICATIONS = [
  'Amoxicillin', 'Azithromycin', 'Ciprofloxacin', 'Metformin', 'Atorvastatin',
  'Amlodipine', 'Omeprazole', 'Pantoprazole', 'Losartan', 'Metoprolol',
  'Ibuprofen', 'Paracetamol', 'Aspirin', 'Diclofenac', 'Cetirizine',
  'Montelukast', 'Salbutamol', 'Prednisolone', 'Dexamethasone', 'Ranitidine',
  'Domperidone', 'Ondansetron', 'Tramadol', 'Gabapentin', 'Clopidogrel',
  'Warfarin', 'Enoxaparin', 'Insulin Glargine', 'Levothyroxine', 'Prednisone',
  'Fluconazole', 'Acyclovir', 'Ceftriaxone', 'Doxycycline', 'Clindamycin',
  'Metronidazole', 'Lisinopril', 'Hydrochlorothiazide', 'Furosemide', 'Spironolactone',
]

const DOSAGE_OPTIONS = [
  '50mg', '100mg', '150mg', '200mg', '250mg', '300mg', '400mg', '500mg', '600mg', '750mg', '1g',
  '5ml', '10ml', '15ml', '2.5mg', '5mg', '10mg', '20mg', '25mg', '40mg', '80mg',
  '1 tablet', '2 tablets', '1 capsule', '2 capsules', '1 teaspoon', '2 teaspoons',
  '1 unit', '2 units', '5 units', '10 units',
]

const FREQUENCY_OPTIONS = [
  'Once daily (OD)', 'Twice daily (BD)', 'Three times daily (TDS)', 'Four times daily (QDS)',
  'Every 4 hours', 'Every 6 hours', 'Every 8 hours', 'Every 12 hours',
  'Once weekly', 'Twice weekly', 'As needed (PRN)', 'At bedtime (HS)',
  'Before meals (AC)', 'After meals (PC)', 'Morning only', 'Evening only',
]

const DURATION_OPTIONS = [
  '3 days', '5 days', '7 days', '10 days', '14 days', '21 days',
  '1 month', '2 months', '3 months', '6 months',
  'Until next visit', 'Ongoing', 'As directed',
]

const ROUTE_OPTIONS = [
  'Oral', 'Topical', 'Intravenous (IV)', 'Intramuscular (IM)', 'Subcutaneous (SC)',
  'Sublingual', 'Inhalation', 'Rectal', 'Ophthalmic', 'Otic', 'Nasal',
]

const INSTRUCTION_OPTIONS = [
  'Take with food', 'Take on empty stomach', 'Take with plenty of water',
  'Avoid alcohol', 'Avoid sunlight exposure', 'Do not crush or chew',
  'Apply thin layer to affected area', 'Shake well before use',
  'Store in refrigerator', 'Complete the full course',
  'Discontinue if rash appears', 'Monitor blood sugar levels',
]

interface PrescriptionItem {
  id: string
  medication_name: string
  dosage: string
  frequency: string
  duration: string
  instructions: string
  route: string
}

interface ConsultationNote {
  id?: string
  consultation_date: string
  chief_complaint: string
  history_of_present_illness: string
  examination_findings: string
  diagnosis: string
  treatment_plan: string
  follow_up_instructions: string
  additional_notes: string
  vitals: {
    blood_pressure?: string
    pulse?: string
    temperature?: string
    spo2?: string
    respiratory_rate?: string
    weight?: string
  }
}

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
  const [doctorDocuments, setDoctorDocuments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Send email state
  const [sendingEmailFor, setSendingEmailFor] = useState<string | null>(null)

  // Upload prescription state
  const [uploadingDocument, setUploadingDocument] = useState(false)
  const [uploadForm, setUploadForm] = useState({
    documentType: 'prescription',
    description: ''
  })

  // Consultation notes state
  const [consultationNotes, setConsultationNotes] = useState<any[]>([])
  const [savingNote, setSavingNote] = useState(false)
  const [currentNote, setCurrentNote] = useState<ConsultationNote>({
    consultation_date: new Date().toISOString().split('T')[0],
    chief_complaint: '',
    history_of_present_illness: '',
    examination_findings: '',
    diagnosis: '',
    treatment_plan: '',
    follow_up_instructions: '',
    additional_notes: '',
    vitals: {},
  })
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)

  // Prescription state
  const [prescriptions, setPrescriptions] = useState<any[]>([])
  const [savingPrescription, setSavingPrescription] = useState(false)
  const [prescriptionDiagnosis, setPrescriptionDiagnosis] = useState('')
  const [prescriptionNotes, setPrescriptionNotes] = useState('')
  const [prescriptionItems, setPrescriptionItems] = useState<PrescriptionItem[]>([
    { id: crypto.randomUUID(), medication_name: '', dosage: '', frequency: '', duration: '', instructions: '', route: 'Oral' }
  ])
  const [editingPrescriptionId, setEditingPrescriptionId] = useState<string | null>(null)

  // Print preview state
  const [showPrintPreview, setShowPrintPreview] = useState(false)
  const [printData, setPrintData] = useState<any>(null)
  const [printType, setPrintType] = useState<'prescription' | 'consultation'>('prescription')
  const [sendingToPatient, setSendingToPatient] = useState(false)

  // Follow-up appointment state
  const [followUpDays, setFollowUpDays] = useState('7')
  const [followUpVisitType, setFollowUpVisitType] = useState<'online' | 'physical'>('physical')
  const [followUpTime, setFollowUpTime] = useState('10:00')
  const [followUpNotes, setFollowUpNotes] = useState('')
  const [creatingFollowUp, setCreatingFollowUp] = useState(false)
  const [followUps, setFollowUps] = useState<any[]>([])

  // Medication search state
  const [medSearchQuery, setMedSearchQuery] = useState<Record<string, string>>({})
  const [showMedDropdown, setShowMedDropdown] = useState<string | null>(null)

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
      const [selectionRes, historyRes, allergiesRes, medsRes, appointmentsRes, documentsRes, consultNotesRes, prescriptionsRes] = await Promise.all([
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
          .eq('doctor_id', doctor.id)
          .or(`patient_id.eq.${patientId},patient_email.eq.${patientData.email}`)
          .order('appointment_date', { ascending: false })
          .order('start_time', { ascending: false }),
        supabase
          .from('doc_patient_reports')
          .select('*')
          .or(`doc_patient_id.eq.${patientId},patient_id.eq.${patientId}`)
          .eq('doctor_id', doctor.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('doc_consultation_notes')
          .select('*')
          .eq('doctor_id', doctor.id)
          .eq('patient_id', patientId)
          .order('consultation_date', { ascending: false }),
        supabase
          .from('doc_prescriptions')
          .select('*, doc_prescription_items(*)')
          .eq('doctor_id', doctor.id)
          .eq('patient_id', patientId)
          .order('prescription_date', { ascending: false }),
      ])

      if (selectionRes.data) setSelection(selectionRes.data)
      if (historyRes.data) setMedicalHistory(historyRes.data)
      if (allergiesRes.data) setAllergies(allergiesRes.data)
      if (medsRes.data) setMedications(medsRes.data)
      if (appointmentsRes.data) setAppointments(appointmentsRes.data)
      if (documentsRes.data) {
        // Separate patient and doctor uploaded documents
        const patientDocs = documentsRes.data.filter((doc: any) => doc.uploaded_by === 'patient' || !doc.uploaded_by)
        const doctorDocs = documentsRes.data.filter((doc: any) => doc.uploaded_by === 'doctor')
        setDocuments(patientDocs)
        setDoctorDocuments(doctorDocs)
      }
      if (consultNotesRes.data) setConsultationNotes(consultNotesRes.data)
      if (prescriptionsRes.data) setPrescriptions(prescriptionsRes.data)

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

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !doctor || !patientId) return

    setUploadingDocument(true)
    try {
      const supabase = createClient()

      // Sanitize file name
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      // Store in doctor-prescriptions bucket: doctor/{doctorId}/{patientId}/{timestamp}_{filename}
      const filePath = `${doctor.id}/${patientId}/${Date.now()}_${sanitizedName}`

      // Upload file to doctor-prescriptions bucket (separate bucket with public read access)
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('doctor-prescriptions')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Create document record
      const { data: docData, error: docError } = await supabase
        .from('doc_patient_reports')
        .insert({
          doc_patient_id: patientId,
          doctor_id: doctor.id,
          file_type: uploadForm.documentType,
          file_name: file.name,
          file_url: uploadData.path,
          uploaded_by: 'doctor',
          description: uploadForm.description || null
        })
        .select()
        .single()

      if (docError) throw docError

      // Add to doctor documents list
      setDoctorDocuments(prev => [docData, ...prev])

      // Reset form
      setUploadForm({ documentType: 'prescription', description: '' })
      // Reset file input
      e.target.value = ''

      toast.success('Document uploaded successfully')
    } catch (error) {
      console.error('Error uploading document:', error)
      toast.error('Failed to upload document')
    } finally {
      setUploadingDocument(false)
    }
  }

  const handleSendEmail = async (apt: Appointment) => {
    if (!doctor || !apt.patient_email) return

    setSendingEmailFor(apt.id)
    try {
      const meetingLink = apt.meeting_link || doctor.standard_meeting_link

      const response = await fetch('/api/notifications/send-meeting-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: apt.id,
          patientName: apt.patient_name,
          patientEmail: apt.patient_email,
          patientPhone: apt.patient_phone || null,
          doctorName: doctor.full_name,
          appointmentDate: format(new Date(apt.appointment_date), 'MMMM d, yyyy'),
          startTime: apt.start_time.slice(0, 5),
          meetingLink: meetingLink || '',
          doctorId: doctor.id,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success(`Email sent to ${apt.patient_email}`)
      } else {
        toast.error('Failed to send email')
      }
    } catch (error) {
      console.error('Send email error:', error)
      toast.error('Failed to send email')
    } finally {
      setSendingEmailFor(null)
    }
  }

  // ---- Consultation Note Handlers ----
  const handleSaveConsultationNote = async () => {
    if (!doctor || !patientId) return
    setSavingNote(true)
    try {
      const supabase = createClient()
      const noteData = {
        doctor_id: doctor.id,
        patient_id: patientId,
        consultation_date: currentNote.consultation_date,
        chief_complaint: currentNote.chief_complaint || null,
        history_of_present_illness: currentNote.history_of_present_illness || null,
        examination_findings: currentNote.examination_findings || null,
        diagnosis: currentNote.diagnosis || null,
        treatment_plan: currentNote.treatment_plan || null,
        follow_up_instructions: currentNote.follow_up_instructions || null,
        additional_notes: currentNote.additional_notes || null,
        vitals: currentNote.vitals,
      }

      if (editingNoteId) {
        const { data, error } = await supabase
          .from('doc_consultation_notes')
          .update({ ...noteData, updated_at: new Date().toISOString() })
          .eq('id', editingNoteId)
          .select()
          .single()
        if (error) throw error
        setConsultationNotes(prev => prev.map(n => n.id === editingNoteId ? data : n))
        toast.success('Consultation note updated')
      } else {
        const { data, error } = await supabase
          .from('doc_consultation_notes')
          .insert(noteData)
          .select()
          .single()
        if (error) throw error
        setConsultationNotes(prev => [data, ...prev])
        toast.success('Consultation note saved')
      }
      resetNoteForm()
    } catch (error: any) {
      console.error('Error saving consultation note:', error)
      toast.error(`Failed to save consultation note: ${error?.message || 'Unknown error'}`)
    } finally {
      setSavingNote(false)
    }
  }

  const resetNoteForm = () => {
    setCurrentNote({
      consultation_date: new Date().toISOString().split('T')[0],
      chief_complaint: '',
      history_of_present_illness: '',
      examination_findings: '',
      diagnosis: '',
      treatment_plan: '',
      follow_up_instructions: '',
      additional_notes: '',
      vitals: {},
    })
    setEditingNoteId(null)
  }

  const loadNoteForEdit = (note: any) => {
    setCurrentNote({
      consultation_date: note.consultation_date,
      chief_complaint: note.chief_complaint || '',
      history_of_present_illness: note.history_of_present_illness || '',
      examination_findings: note.examination_findings || '',
      diagnosis: note.diagnosis || '',
      treatment_plan: note.treatment_plan || '',
      follow_up_instructions: note.follow_up_instructions || '',
      additional_notes: note.additional_notes || '',
      vitals: note.vitals || {},
    })
    setEditingNoteId(note.id)
  }

  // ---- Prescription Handlers ----
  const addPrescriptionItem = () => {
    setPrescriptionItems(prev => [...prev, {
      id: crypto.randomUUID(),
      medication_name: '',
      dosage: '',
      frequency: '',
      duration: '',
      instructions: '',
      route: 'Oral',
    }])
  }

  const removePrescriptionItem = (id: string) => {
    if (prescriptionItems.length <= 1) return
    setPrescriptionItems(prev => prev.filter(item => item.id !== id))
  }

  const updatePrescriptionItem = (id: string, field: keyof PrescriptionItem, value: string) => {
    setPrescriptionItems(prev => prev.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ))
  }

  const handleSavePrescription = async () => {
    if (!doctor || !patientId) return
    const validItems = prescriptionItems.filter(item => item.medication_name && item.dosage && item.frequency && item.duration)
    if (validItems.length === 0) {
      toast.error('Please add at least one complete medication entry')
      return
    }
    setSavingPrescription(true)
    try {
      const supabase = createClient()

      if (editingPrescriptionId) {
        // Update prescription
        const { error: updateError } = await supabase
          .from('doc_prescriptions')
          .update({
            diagnosis: prescriptionDiagnosis || null,
            notes: prescriptionNotes || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingPrescriptionId)

        if (updateError) throw updateError

        // Delete old items and insert new
        await supabase.from('doc_prescription_items').delete().eq('prescription_id', editingPrescriptionId)
        const { error: itemsError } = await supabase
          .from('doc_prescription_items')
          .insert(validItems.map((item, index) => ({
            prescription_id: editingPrescriptionId,
            medication_name: item.medication_name,
            dosage: item.dosage,
            frequency: item.frequency,
            duration: item.duration,
            instructions: item.instructions || null,
            route: item.route,
            sort_order: index,
          })))
        if (itemsError) throw itemsError

        // Refetch
        const { data } = await supabase
          .from('doc_prescriptions')
          .select('*, doc_prescription_items(*)')
          .eq('id', editingPrescriptionId)
          .single()
        if (data) setPrescriptions(prev => prev.map(p => p.id === editingPrescriptionId ? data : p))
        toast.success('Prescription updated')
      } else {
        // Create prescription
        const { data: rxData, error: rxError } = await supabase
          .from('doc_prescriptions')
          .insert({
            doctor_id: doctor.id,
            patient_id: patientId,
            prescription_date: new Date().toISOString().split('T')[0],
            diagnosis: prescriptionDiagnosis || null,
            notes: prescriptionNotes || null,
          })
          .select()
          .single()
        if (rxError) throw rxError

        const { error: itemsError } = await supabase
          .from('doc_prescription_items')
          .insert(validItems.map((item, index) => ({
            prescription_id: rxData.id,
            medication_name: item.medication_name,
            dosage: item.dosage,
            frequency: item.frequency,
            duration: item.duration,
            instructions: item.instructions || null,
            route: item.route,
            sort_order: index,
          })))
        if (itemsError) throw itemsError

        // Refetch with items
        const { data } = await supabase
          .from('doc_prescriptions')
          .select('*, doc_prescription_items(*)')
          .eq('id', rxData.id)
          .single()
        if (data) setPrescriptions(prev => [data, ...prev])
        toast.success('Prescription saved')
      }
      resetPrescriptionForm()
    } catch (error: any) {
      console.error('Error saving prescription:', error)
      toast.error(`Failed to save prescription: ${error?.message || 'Unknown error'}`)
    } finally {
      setSavingPrescription(false)
    }
  }

  const resetPrescriptionForm = () => {
    setPrescriptionDiagnosis('')
    setPrescriptionNotes('')
    setPrescriptionItems([
      { id: crypto.randomUUID(), medication_name: '', dosage: '', frequency: '', duration: '', instructions: '', route: 'Oral' }
    ])
    setEditingPrescriptionId(null)
  }

  const loadPrescriptionForEdit = (rx: any) => {
    setPrescriptionDiagnosis(rx.diagnosis || '')
    setPrescriptionNotes(rx.notes || '')
    setPrescriptionItems(
      (rx.doc_prescription_items || [])
        .sort((a: any, b: any) => a.sort_order - b.sort_order)
        .map((item: any) => ({
          id: item.id,
          medication_name: item.medication_name,
          dosage: item.dosage,
          frequency: item.frequency,
          duration: item.duration,
          instructions: item.instructions || '',
          route: item.route || 'Oral',
        }))
    )
    if (rx.doc_prescription_items?.length === 0) {
      setPrescriptionItems([
        { id: crypto.randomUUID(), medication_name: '', dosage: '', frequency: '', duration: '', instructions: '', route: 'Oral' }
      ])
    }
    setEditingPrescriptionId(rx.id)
  }

  // ---- Print / Document Generation ----
  const openPrintPreview = (type: 'prescription' | 'consultation', data: any) => {
    setPrintType(type)
    setPrintData(data)
    setShowPrintPreview(true)
  }

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const patientName = `${patient?.first_name || ''} ${patient?.last_name || ''}`
    const patientAge = patient?.date_of_birth ? calculateAge(patient.date_of_birth) : ''
    const patientGender = patient?.gender || ''

    let bodyContent = ''

    if (printType === 'prescription' && printData) {
      const items = (printData.doc_prescription_items || []).sort((a: any, b: any) => a.sort_order - b.sort_order)
      bodyContent = `
        <div class="rx-symbol">Rx</div>
        ${printData.diagnosis ? `<div class="section"><strong>Diagnosis:</strong> ${printData.diagnosis}</div>` : ''}
        <table class="med-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Medication</th>
              <th>Dosage</th>
              <th>Route</th>
              <th>Frequency</th>
              <th>Duration</th>
              <th>Instructions</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((item: any, i: number) => `
              <tr>
                <td>${i + 1}</td>
                <td><strong>${item.medication_name}</strong></td>
                <td>${item.dosage}</td>
                <td>${item.route || 'Oral'}</td>
                <td>${item.frequency}</td>
                <td>${item.duration}</td>
                <td>${item.instructions || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ${printData.notes ? `<div class="section" style="margin-top:20px"><strong>Notes:</strong> ${printData.notes}</div>` : ''}
      `
    } else if (printType === 'consultation' && printData) {
      const vitals = printData.vitals || {}
      bodyContent = `
        ${Object.keys(vitals).some(k => vitals[k]) ? `
          <div class="vitals-bar">
            <strong>Vitals:</strong>
            ${vitals.blood_pressure ? `<span>BP: ${vitals.blood_pressure}</span>` : ''}
            ${vitals.pulse ? `<span>Pulse: ${vitals.pulse}/min</span>` : ''}
            ${vitals.temperature ? `<span>Temp: ${vitals.temperature}&deg;F</span>` : ''}
            ${vitals.spo2 ? `<span>SpO2: ${vitals.spo2}%</span>` : ''}
            ${vitals.respiratory_rate ? `<span>RR: ${vitals.respiratory_rate}/min</span>` : ''}
            ${vitals.weight ? `<span>Wt: ${vitals.weight} kg</span>` : ''}
          </div>
        ` : ''}
        ${printData.chief_complaint ? `<div class="section"><strong>Chief Complaint:</strong><br/>${printData.chief_complaint}</div>` : ''}
        ${printData.history_of_present_illness ? `<div class="section"><strong>History of Present Illness:</strong><br/>${printData.history_of_present_illness}</div>` : ''}
        ${printData.examination_findings ? `<div class="section"><strong>Examination Findings:</strong><br/>${printData.examination_findings}</div>` : ''}
        ${printData.diagnosis ? `<div class="section"><strong>Diagnosis:</strong><br/>${printData.diagnosis}</div>` : ''}
        ${printData.treatment_plan ? `<div class="section"><strong>Treatment Plan:</strong><br/>${printData.treatment_plan}</div>` : ''}
        ${printData.follow_up_instructions ? `<div class="section"><strong>Follow-up Instructions:</strong><br/>${printData.follow_up_instructions}</div>` : ''}
        ${printData.additional_notes ? `<div class="section"><strong>Additional Notes:</strong><br/>${printData.additional_notes}</div>` : ''}
      `
    }

    const docDate = printType === 'prescription'
      ? (printData?.prescription_date || new Date().toISOString().split('T')[0])
      : (printData?.consultation_date || new Date().toISOString().split('T')[0])

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${printType === 'prescription' ? 'Prescription' : 'Consultation Note'} - ${patientName}</title>
        <style>
          @page { size: A4; margin: 15mm; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Georgia', 'Times New Roman', serif; font-size: 13px; color: #1a1a1a; line-height: 1.5; }
          .page { max-width: 210mm; margin: 0 auto; padding: 10mm; }
          .header { border-bottom: 3px double #1a5c2e; padding-bottom: 15px; margin-bottom: 20px; }
          .header-top { display: flex; justify-content: space-between; align-items: flex-start; }
          .clinic-name { font-size: 22px; font-weight: bold; color: #1a5c2e; margin-bottom: 2px; }
          .doctor-name { font-size: 16px; font-weight: bold; color: #333; }
          .doctor-details { font-size: 11px; color: #555; margin-top: 4px; }
          .doc-type { font-size: 18px; font-weight: bold; color: #1a5c2e; text-align: center; margin: 15px 0; text-transform: uppercase; letter-spacing: 2px; }
          .patient-info { display: flex; justify-content: space-between; background: #f5f9f5; padding: 10px 15px; border-radius: 6px; margin-bottom: 18px; font-size: 12px; }
          .patient-info span { margin-right: 20px; }
          .rx-symbol { font-size: 28px; font-weight: bold; color: #1a5c2e; margin: 10px 0; font-family: serif; }
          .section { margin-bottom: 14px; padding: 8px 0; }
          .section strong { color: #1a5c2e; }
          .med-table { width: 100%; border-collapse: collapse; margin: 10px 0; }
          .med-table th { background: #1a5c2e; color: white; padding: 8px 10px; text-align: left; font-size: 11px; text-transform: uppercase; }
          .med-table td { padding: 8px 10px; border-bottom: 1px solid #e0e0e0; font-size: 12px; }
          .med-table tr:nth-child(even) { background: #f9f9f9; }
          .vitals-bar { background: #f0f7f0; padding: 10px 15px; border-radius: 6px; margin-bottom: 18px; display: flex; flex-wrap: wrap; gap: 15px; font-size: 12px; }
          .vitals-bar span { background: white; padding: 3px 10px; border-radius: 4px; border: 1px solid #d0e0d0; }
          .footer { margin-top: 40px; border-top: 1px solid #ccc; padding-top: 15px; display: flex; justify-content: space-between; }
          .signature-line { width: 200px; border-top: 1px solid #333; text-align: center; padding-top: 5px; font-size: 12px; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="header">
            <div class="header-top">
              <div>
                <div class="clinic-name">${doctor?.clinic_name || 'Medical Clinic'}</div>
                <div class="doctor-name">Dr. ${doctor?.full_name || ''}</div>
                <div class="doctor-details">
                  ${doctor?.qualification || ''} ${doctor?.specialization ? `| ${doctor.specialization}` : ''}
                  ${doctor?.phone ? `<br/>Phone: ${doctor.phone}` : ''}
                </div>
              </div>
              <div style="text-align:right; font-size:11px; color:#555;">
                ${doctor?.clinic_address ? `<div>${doctor.clinic_address}</div>` : ''}
              </div>
            </div>
          </div>

          <div class="doc-type">${printType === 'prescription' ? 'Prescription' : 'Consultation Note'}</div>

          <div class="patient-info">
            <div>
              <span><strong>Patient:</strong> ${patientName}</span>
              ${patientAge ? `<span><strong>Age:</strong> ${patientAge} yrs</span>` : ''}
              ${patientGender ? `<span><strong>Gender:</strong> ${patientGender}</span>` : ''}
              ${patient?.blood_group ? `<span><strong>Blood Group:</strong> ${patient.blood_group}</span>` : ''}
            </div>
            <div><strong>Date:</strong> ${format(new Date(docDate), 'MMMM d, yyyy')}</div>
          </div>

          ${bodyContent}

          <div class="footer">
            <div style="font-size:11px; color:#888;">
              Generated by AiSurgeonPilot
            </div>
            <div class="signature-line">
              Dr. ${doctor?.full_name || ''}
            </div>
          </div>
        </div>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `)
    printWindow.document.close()
    setShowPrintPreview(false)
  }

  const handleSendToPatient = async (type?: 'prescription' | 'consultation', data?: any) => {
    const docType = type || printType
    const docData = data || printData
    
    if (!docData || !patient?.id) return

    setSendingToPatient(true)
    try {
      const response = await fetch('/api/prescriptions/send-to-patient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: docType,
          data: docData,
          patientId: patient.id,
          appointmentId: docData.appointment_id || null
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send')
      }

      const result = await response.json()
      toast.success(result.message || 'Document sent to patient!')
      setShowPrintPreview(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send document to patient')
    } finally {
      setSendingToPatient(false)
    }
  }

  // ---- Follow-up Appointment Handler ----
  const handleCreateFollowUp = async () => {
    if (!doctor || !patient) return
    
    setCreatingFollowUp(true)
    try {
      const supabase = createClient()
      
      // Calculate follow-up date
      const followUpDate = new Date()
      followUpDate.setDate(followUpDate.getDate() + parseInt(followUpDays))
      const dateStr = followUpDate.toISOString().split('T')[0]
      
      // Calculate end time (30 min appointment)
      const [hours, minutes] = followUpTime.split(':').map(Number)
      const endHours = minutes + 30 >= 60 ? hours + 1 : hours
      const endMinutes = (minutes + 30) % 60
      const endTime = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`
      
      // Get fee based on visit type
      const fee = followUpVisitType === 'online' 
        ? (doctor.online_fee_inr || doctor.online_fee || 0)
        : (doctor.consultation_fee_inr || doctor.consultation_fee || 0)

      // Create follow-up appointment
      const { data: appointment, error: aptError } = await supabase
        .from('doc_appointments')
        .insert({
          doctor_id: doctor.id,
          patient_id: patient.id,
          patient_name: `${patient.first_name} ${patient.last_name}`,
          patient_email: patient.email,
          patient_phone: patient.phone_number,
          appointment_date: dateStr,
          start_time: followUpTime,
          end_time: endTime,
          visit_type: followUpVisitType,
          status: 'pending',
          payment_status: 'pending',
          amount: fee,
          notes: followUpNotes || `Follow-up appointment scheduled ${followUpDays} days after previous visit`,
        })
        .select()
        .single()

      if (aptError) throw aptError

      // Send email notification
      try {
        await fetch('/api/notifications/followup-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patientName: `${patient.first_name} ${patient.last_name}`,
            patientEmail: patient.email,
            doctorName: doctor.full_name,
            date: format(followUpDate, 'MMMM d, yyyy'),
            time: followUpTime,
            visitType: followUpVisitType,
            notes: followUpNotes,
          }),
        })
      } catch (emailError) {
        console.error('Email notification failed:', emailError)
      }

      // Create in-app notification for patient (in AidoCall)
      try {
        await supabase
          .from('doc_notifications')
          .insert({
            doctor_id: doctor.id,
            patient_id: patient.id,
            appointment_id: appointment.id,
            type: 'in_app',
            channel: 'aidocall',
            status: 'sent',
            title: 'Follow-up Appointment Scheduled',
            message: `Dr. ${doctor.full_name} has scheduled a follow-up appointment for you on ${format(followUpDate, 'MMMM d, yyyy')} at ${followUpTime}`,
            sent_at: new Date().toISOString(),
          })
      } catch (notifError) {
        console.error('In-app notification failed:', notifError)
      }

      // Update appointments list
      setAppointments(prev => [appointment, ...prev])
      
      // Reset form
      setFollowUpDays('7')
      setFollowUpNotes('')
      
      toast.success(`Follow-up appointment scheduled for ${format(followUpDate, 'MMMM d, yyyy')} at ${followUpTime}`)
    } catch (error: any) {
      console.error('Error creating follow-up:', error)
      toast.error(`Failed to create follow-up: ${error?.message || 'Unknown error'}`)
    } finally {
      setCreatingFollowUp(false)
    }
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
          <TabsList className="flex-wrap">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="history">Medical History</TabsTrigger>
            <TabsTrigger value="consultation">Consultation Notes</TabsTrigger>
            <TabsTrigger value="prescription">Prescription</TabsTrigger>
            <TabsTrigger value="appointments">Appointments ({appointments.length})</TabsTrigger>
            <TabsTrigger value="followup">Follow-up</TabsTrigger>
            <TabsTrigger value="documents">Documents ({documents.length + doctorDocuments.length})</TabsTrigger>
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

          {/* Consultation Notes Tab */}
          <TabsContent value="consultation" className="space-y-6">
            {/* Consultation Note Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-green-600" />
                  {editingNoteId ? 'Edit Consultation Note' : 'New Consultation Note'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Date & Vitals Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Consultation Date</Label>
                    <Input
                      type="date"
                      value={currentNote.consultation_date}
                      onChange={(e) => setCurrentNote(prev => ({ ...prev, consultation_date: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Vitals */}
                <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                  <Label className="text-sm font-semibold text-gray-700">Vitals</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Blood Pressure</Label>
                      <Input
                        placeholder="120/80"
                        value={currentNote.vitals.blood_pressure || ''}
                        onChange={(e) => setCurrentNote(prev => ({ ...prev, vitals: { ...prev.vitals, blood_pressure: e.target.value } }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Pulse (bpm)</Label>
                      <Input
                        placeholder="72"
                        value={currentNote.vitals.pulse || ''}
                        onChange={(e) => setCurrentNote(prev => ({ ...prev, vitals: { ...prev.vitals, pulse: e.target.value } }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Temperature (F)</Label>
                      <Input
                        placeholder="98.6"
                        value={currentNote.vitals.temperature || ''}
                        onChange={(e) => setCurrentNote(prev => ({ ...prev, vitals: { ...prev.vitals, temperature: e.target.value } }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">SpO2 (%)</Label>
                      <Input
                        placeholder="98"
                        value={currentNote.vitals.spo2 || ''}
                        onChange={(e) => setCurrentNote(prev => ({ ...prev, vitals: { ...prev.vitals, spo2: e.target.value } }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Resp. Rate</Label>
                      <Input
                        placeholder="16"
                        value={currentNote.vitals.respiratory_rate || ''}
                        onChange={(e) => setCurrentNote(prev => ({ ...prev, vitals: { ...prev.vitals, respiratory_rate: e.target.value } }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Weight (kg)</Label>
                      <Input
                        placeholder="70"
                        value={currentNote.vitals.weight || ''}
                        onChange={(e) => setCurrentNote(prev => ({ ...prev, vitals: { ...prev.vitals, weight: e.target.value } }))}
                      />
                    </div>
                  </div>
                </div>

                {/* Main consultation fields */}
                <div className="space-y-2">
                  <Label>Chief Complaint</Label>
                  <Textarea
                    placeholder="Patient's primary reason for visit..."
                    rows={2}
                    value={currentNote.chief_complaint}
                    onChange={(e) => setCurrentNote(prev => ({ ...prev, chief_complaint: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>History of Present Illness</Label>
                  <Textarea
                    placeholder="Detailed history of current symptoms, onset, duration, aggravating/relieving factors..."
                    rows={3}
                    value={currentNote.history_of_present_illness}
                    onChange={(e) => setCurrentNote(prev => ({ ...prev, history_of_present_illness: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Examination Findings</Label>
                  <Textarea
                    placeholder="Physical examination findings, observations..."
                    rows={3}
                    value={currentNote.examination_findings}
                    onChange={(e) => setCurrentNote(prev => ({ ...prev, examination_findings: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Diagnosis</Label>
                    <Textarea
                      placeholder="Primary and secondary diagnosis..."
                      rows={2}
                      value={currentNote.diagnosis}
                      onChange={(e) => setCurrentNote(prev => ({ ...prev, diagnosis: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Treatment Plan</Label>
                    <Textarea
                      placeholder="Treatment plan, procedures, referrals..."
                      rows={2}
                      value={currentNote.treatment_plan}
                      onChange={(e) => setCurrentNote(prev => ({ ...prev, treatment_plan: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Follow-up Instructions</Label>
                    <Textarea
                      placeholder="Follow-up date, precautions, lifestyle advice..."
                      rows={2}
                      value={currentNote.follow_up_instructions}
                      onChange={(e) => setCurrentNote(prev => ({ ...prev, follow_up_instructions: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Additional Notes</Label>
                    <Textarea
                      placeholder="Any additional observations or notes..."
                      rows={2}
                      value={currentNote.additional_notes}
                      onChange={(e) => setCurrentNote(prev => ({ ...prev, additional_notes: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    className="bg-green-600 hover:bg-green-700 gap-2"
                    onClick={handleSaveConsultationNote}
                    disabled={savingNote}
                  >
                    {savingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {editingNoteId ? 'Update Note' : 'Save Note'}
                  </Button>
                  {editingNoteId && (
                    <Button variant="outline" onClick={resetNoteForm}>Cancel Edit</Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Previous Consultation Notes */}
            <Card>
              <CardHeader>
                <CardTitle>Previous Consultation Notes ({consultationNotes.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {consultationNotes.length === 0 ? (
                  <div className="text-center py-8">
                    <ClipboardList className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500">No consultation notes yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {consultationNotes.map((note) => (
                      <div key={note.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-green-100 text-green-800">
                              {format(new Date(note.consultation_date), 'MMM d, yyyy')}
                            </Badge>
                            {note.diagnosis && (
                              <span className="text-sm font-medium text-gray-700">{note.diagnosis}</span>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="gap-1 border-blue-300 text-blue-700 hover:bg-blue-50"
                              onClick={() => handleSendToPatient('consultation', note)}
                              disabled={sendingToPatient}
                            >
                              {sendingToPatient ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                              Send
                            </Button>
                            <Button variant="outline" size="sm" className="gap-1" onClick={() => openPrintPreview('consultation', note)}>
                              <Printer className="h-3.5 w-3.5" />
                              Print
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => loadNoteForEdit(note)}>Edit</Button>
                          </div>
                        </div>
                        {note.chief_complaint && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase">Chief Complaint</p>
                            <p className="text-sm text-gray-700">{note.chief_complaint}</p>
                          </div>
                        )}
                        {note.diagnosis && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase">Diagnosis</p>
                            <p className="text-sm text-gray-700">{note.diagnosis}</p>
                          </div>
                        )}
                        {note.treatment_plan && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase">Treatment Plan</p>
                            <p className="text-sm text-gray-700">{note.treatment_plan}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Prescription Tab */}
          <TabsContent value="prescription" className="space-y-6">
            {/* Prescription Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Stethoscope className="h-5 w-5 text-blue-600" />
                  {editingPrescriptionId ? 'Edit Prescription' : 'New Prescription'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Diagnosis</Label>
                    <Input
                      placeholder="Primary diagnosis for this prescription..."
                      value={prescriptionDiagnosis}
                      onChange={(e) => setPrescriptionDiagnosis(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Additional Notes</Label>
                    <Input
                      placeholder="Any special instructions..."
                      value={prescriptionNotes}
                      onChange={(e) => setPrescriptionNotes(e.target.value)}
                    />
                  </div>
                </div>

                {/* Medication Items */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">Medications</Label>
                    <Button variant="outline" size="sm" className="gap-1" onClick={addPrescriptionItem}>
                      <Plus className="h-3.5 w-3.5" />
                      Add Medication
                    </Button>
                  </div>

                  {prescriptionItems.map((item, index) => (
                    <div key={item.id} className="border rounded-lg p-4 bg-gray-50 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-500">Medication #{index + 1}</span>
                        {prescriptionItems.length > 1 && (
                          <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 h-7 w-7 p-0" onClick={() => removePrescriptionItem(item.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* Medication Name - with search */}
                        <div className="space-y-1 relative">
                          <Label className="text-xs">Medication Name *</Label>
                          <Input
                            placeholder="Type to search..."
                            value={item.medication_name}
                            onChange={(e) => {
                              updatePrescriptionItem(item.id, 'medication_name', e.target.value)
                              setMedSearchQuery(prev => ({ ...prev, [item.id]: e.target.value }))
                              setShowMedDropdown(item.id)
                            }}
                            onFocus={() => setShowMedDropdown(item.id)}
                            onBlur={() => setTimeout(() => setShowMedDropdown(null), 200)}
                          />
                          {showMedDropdown === item.id && (medSearchQuery[item.id] || '').length > 0 && (
                            <div className="absolute z-10 top-full left-0 right-0 bg-white border rounded-md shadow-lg max-h-40 overflow-y-auto">
                              {COMMON_MEDICATIONS
                                .filter(med => med.toLowerCase().includes((medSearchQuery[item.id] || '').toLowerCase()))
                                .slice(0, 8)
                                .map(med => (
                                  <button
                                    key={med}
                                    type="button"
                                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-green-50 hover:text-green-700"
                                    onMouseDown={(e) => {
                                      e.preventDefault()
                                      updatePrescriptionItem(item.id, 'medication_name', med)
                                      setShowMedDropdown(null)
                                    }}
                                  >
                                    {med}
                                  </button>
                                ))}
                            </div>
                          )}
                        </div>

                        {/* Dosage */}
                        <div className="space-y-1">
                          <Label className="text-xs">Dosage *</Label>
                          <Select value={item.dosage} onValueChange={(val) => updatePrescriptionItem(item.id, 'dosage', val)}>
                            <SelectTrigger><SelectValue placeholder="Select dosage" /></SelectTrigger>
                            <SelectContent>
                              {DOSAGE_OPTIONS.map(d => (
                                <SelectItem key={d} value={d}>{d}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Route */}
                        <div className="space-y-1">
                          <Label className="text-xs">Route</Label>
                          <Select value={item.route} onValueChange={(val) => updatePrescriptionItem(item.id, 'route', val)}>
                            <SelectTrigger><SelectValue placeholder="Route" /></SelectTrigger>
                            <SelectContent>
                              {ROUTE_OPTIONS.map(r => (
                                <SelectItem key={r} value={r}>{r}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* Frequency */}
                        <div className="space-y-1">
                          <Label className="text-xs">Frequency *</Label>
                          <Select value={item.frequency} onValueChange={(val) => updatePrescriptionItem(item.id, 'frequency', val)}>
                            <SelectTrigger><SelectValue placeholder="Select frequency" /></SelectTrigger>
                            <SelectContent>
                              {FREQUENCY_OPTIONS.map(f => (
                                <SelectItem key={f} value={f}>{f}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Duration */}
                        <div className="space-y-1">
                          <Label className="text-xs">Duration *</Label>
                          <Select value={item.duration} onValueChange={(val) => updatePrescriptionItem(item.id, 'duration', val)}>
                            <SelectTrigger><SelectValue placeholder="Select duration" /></SelectTrigger>
                            <SelectContent>
                              {DURATION_OPTIONS.map(d => (
                                <SelectItem key={d} value={d}>{d}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Instructions */}
                        <div className="space-y-1">
                          <Label className="text-xs">Instructions</Label>
                          <Select value={item.instructions} onValueChange={(val) => updatePrescriptionItem(item.id, 'instructions', val)}>
                            <SelectTrigger><SelectValue placeholder="Select instruction" /></SelectTrigger>
                            <SelectContent>
                              {INSTRUCTION_OPTIONS.map(i => (
                                <SelectItem key={i} value={i}>{i}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    className="bg-green-600 hover:bg-green-700 gap-2"
                    onClick={handleSavePrescription}
                    disabled={savingPrescription}
                  >
                    {savingPrescription ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {editingPrescriptionId ? 'Update Prescription' : 'Save Prescription'}
                  </Button>
                  {editingPrescriptionId && (
                    <Button variant="outline" onClick={resetPrescriptionForm}>Cancel Edit</Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Previous Prescriptions */}
            <Card>
              <CardHeader>
                <CardTitle>Previous Prescriptions ({prescriptions.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {prescriptions.length === 0 ? (
                  <div className="text-center py-8">
                    <Pill className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500">No prescriptions yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {prescriptions.map((rx) => {
                      const items = (rx.doc_prescription_items || []).sort((a: any, b: any) => a.sort_order - b.sort_order)
                      return (
                        <div key={rx.id} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-blue-100 text-blue-800">
                                {format(new Date(rx.prescription_date), 'MMM d, yyyy')}
                              </Badge>
                              {rx.diagnosis && (
                                <span className="text-sm font-medium text-gray-700">{rx.diagnosis}</span>
                              )}
                              <Badge variant="outline">{items.length} medication{items.length !== 1 ? 's' : ''}</Badge>
                            </div>
                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="gap-1 border-blue-300 text-blue-700 hover:bg-blue-50"
                                onClick={() => handleSendToPatient('prescription', rx)}
                                disabled={sendingToPatient}
                              >
                                {sendingToPatient ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                                Send
                              </Button>
                              <Button variant="outline" size="sm" className="gap-1" onClick={() => openPrintPreview('prescription', rx)}>
                                <Printer className="h-3.5 w-3.5" />
                                Print
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => loadPrescriptionForEdit(rx)}>Edit</Button>
                            </div>
                          </div>
                          {items.length > 0 && (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="text-xs">#</TableHead>
                                  <TableHead className="text-xs">Medication</TableHead>
                                  <TableHead className="text-xs">Dosage</TableHead>
                                  <TableHead className="text-xs">Frequency</TableHead>
                                  <TableHead className="text-xs">Duration</TableHead>
                                  <TableHead className="text-xs">Instructions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {items.map((item: any, i: number) => (
                                  <TableRow key={item.id}>
                                    <TableCell className="text-xs">{i + 1}</TableCell>
                                    <TableCell className="text-xs font-medium">{item.medication_name}</TableCell>
                                    <TableCell className="text-xs">{item.dosage}</TableCell>
                                    <TableCell className="text-xs">{item.frequency}</TableCell>
                                    <TableCell className="text-xs">{item.duration}</TableCell>
                                    <TableCell className="text-xs">{item.instructions || '-'}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
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
                        <TableHead>Actions</TableHead>
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
                          <TableCell>{(patient as any)?.is_indian_resident ? `₹${apt.amount}` : `$${apt.amount}`}</TableCell>
                          <TableCell>
                            <span className="text-sm text-gray-500 truncate max-w-[200px] block">
                              {apt.notes || '-'}
                            </span>
                          </TableCell>
                          <TableCell>
                            {apt.visit_type === 'online' && apt.status === 'confirmed' && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5"
                                disabled={sendingEmailFor === apt.id}
                                onClick={() => handleSendEmail(apt)}
                              >
                                {sendingEmailFor === apt.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Send className="h-3.5 w-3.5" />
                                )}
                                {sendingEmailFor === apt.id ? 'Sending...' : 'Send Email'}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Follow-up Tab */}
          <TabsContent value="followup" className="space-y-6">
            {/* Schedule Follow-up Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarPlus className="h-5 w-5 text-green-600" />
                  Schedule Follow-up Appointment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Days after */}
                  <div className="space-y-2">
                    <Label>Follow-up After</Label>
                    <Select value={followUpDays} onValueChange={setFollowUpDays}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select days" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3 days</SelectItem>
                        <SelectItem value="5">5 days</SelectItem>
                        <SelectItem value="7">7 days (1 week)</SelectItem>
                        <SelectItem value="10">10 days</SelectItem>
                        <SelectItem value="14">14 days (2 weeks)</SelectItem>
                        <SelectItem value="21">21 days (3 weeks)</SelectItem>
                        <SelectItem value="30">30 days (1 month)</SelectItem>
                        <SelectItem value="45">45 days</SelectItem>
                        <SelectItem value="60">60 days (2 months)</SelectItem>
                        <SelectItem value="90">90 days (3 months)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Visit Type */}
                  <div className="space-y-2">
                    <Label>Visit Type</Label>
                    <Select value={followUpVisitType} onValueChange={(v) => setFollowUpVisitType(v as 'online' | 'physical')}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="physical">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            Physical Visit
                          </div>
                        </SelectItem>
                        <SelectItem value="online">
                          <div className="flex items-center gap-2">
                            <Video className="h-4 w-4" />
                            Online Consultation
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Time */}
                  <div className="space-y-2">
                    <Label>Preferred Time</Label>
                    <Select value={followUpTime} onValueChange={setFollowUpTime}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select time" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="09:00">09:00 AM</SelectItem>
                        <SelectItem value="09:30">09:30 AM</SelectItem>
                        <SelectItem value="10:00">10:00 AM</SelectItem>
                        <SelectItem value="10:30">10:30 AM</SelectItem>
                        <SelectItem value="11:00">11:00 AM</SelectItem>
                        <SelectItem value="11:30">11:30 AM</SelectItem>
                        <SelectItem value="12:00">12:00 PM</SelectItem>
                        <SelectItem value="14:00">02:00 PM</SelectItem>
                        <SelectItem value="14:30">02:30 PM</SelectItem>
                        <SelectItem value="15:00">03:00 PM</SelectItem>
                        <SelectItem value="15:30">03:30 PM</SelectItem>
                        <SelectItem value="16:00">04:00 PM</SelectItem>
                        <SelectItem value="16:30">04:30 PM</SelectItem>
                        <SelectItem value="17:00">05:00 PM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Follow-up date preview */}
                  <div className="space-y-2">
                    <Label>Scheduled Date</Label>
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm font-medium text-green-800">
                        {format(new Date(Date.now() + parseInt(followUpDays) * 24 * 60 * 60 * 1000), 'EEEE, MMMM d, yyyy')}
                      </p>
                      <p className="text-xs text-green-600">at {followUpTime}</p>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label>Notes (Optional)</Label>
                  <Textarea
                    placeholder="Add any notes for this follow-up appointment..."
                    value={followUpNotes}
                    onChange={(e) => setFollowUpNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Action buttons */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Bell className="h-4 w-4" />
                    <span>Patient will be notified via Email and AidoCall app</span>
                  </div>
                  <Button 
                    onClick={handleCreateFollowUp} 
                    disabled={creatingFollowUp}
                    className="bg-green-600 hover:bg-green-700 gap-2"
                  >
                    {creatingFollowUp ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CalendarPlus className="h-4 w-4" />
                    )}
                    {creatingFollowUp ? 'Scheduling...' : 'Schedule Follow-up'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Follow-ups */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-500" />
                  Scheduled Appointments
                </CardTitle>
              </CardHeader>
              <CardContent>
                {appointments.filter(apt => apt.status === 'confirmed' || apt.status === 'pending').length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500">No upcoming appointments</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {appointments
                      .filter(apt => apt.status === 'confirmed' || apt.status === 'pending')
                      .slice(0, 5)
                      .map(apt => (
                        <div key={apt.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-lg ${apt.visit_type === 'online' ? 'bg-blue-100' : 'bg-orange-100'}`}>
                              {apt.visit_type === 'online' ? (
                                <Video className="h-5 w-5 text-blue-600" />
                              ) : (
                                <MapPin className="h-5 w-5 text-orange-600" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium">
                                {format(new Date(apt.appointment_date), 'EEEE, MMMM d, yyyy')}
                              </p>
                              <p className="text-sm text-gray-500">
                                {apt.start_time} - {apt.end_time} • {apt.visit_type === 'online' ? 'Online' : 'Physical'} Visit
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={statusColors[apt.status]}>{apt.status}</Badge>
                            {apt.notes && apt.notes.includes('Follow-up') && (
                              <Badge variant="outline" className="text-green-600 border-green-300">
                                Follow-up
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-6">
            {/* Upload Prescription Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5 text-green-500" />
                  Upload Prescription / Document
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="documentType">Document Type</Label>
                      <Select
                        value={uploadForm.documentType}
                        onValueChange={(value) => setUploadForm({ ...uploadForm, documentType: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="prescription">Prescription</SelectItem>
                          <SelectItem value="lab_report">Lab Report</SelectItem>
                          <SelectItem value="referral">Referral Letter</SelectItem>
                          <SelectItem value="medical_certificate">Medical Certificate</SelectItem>
                          <SelectItem value="diagnosis">Diagnosis Report</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description (Optional)</Label>
                      <Input
                        id="description"
                        placeholder="Brief description..."
                        value={uploadForm.description}
                        onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="file">Select File</Label>
                    <div className="flex items-center gap-4">
                      <Input
                        id="file"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        onChange={handleDocumentUpload}
                        disabled={uploadingDocument}
                        className="flex-1"
                      />
                      {uploadingDocument && (
                        <div className="flex items-center gap-2 text-green-600">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm">Uploading...</span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      Supported formats: PDF, JPG, PNG, DOC, DOCX
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Doctor Uploaded Documents */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-green-500" />
                  Your Uploaded Documents ({doctorDocuments.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {doctorDocuments.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500">No documents uploaded yet</p>
                    <p className="text-sm text-gray-400">Upload prescriptions or reports for this patient above</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {doctorDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-100"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-green-100 rounded-lg">
                            <FileText className="h-6 w-6 text-green-600" />
                          </div>
                          <div>
                            <p className="font-medium">{doc.file_name}</p>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <Badge className="bg-green-100 text-green-800 text-xs">
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
                          onClick={() => {
                            const supabase = createClient()
                            const { data } = supabase.storage
                              .from('doctor-prescriptions')
                              .getPublicUrl(doc.file_url)
                            if (data?.publicUrl) {
                              window.open(data.publicUrl, '_blank')
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

            {/* Patient Uploaded Documents */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5 text-purple-500" />
                  Patient Uploaded Documents ({documents.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {documents.length === 0 ? (
                  <div className="text-center py-8">
                    <FolderOpen className="h-10 w-10 mx-auto mb-3 text-gray-300" />
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

      {/* Print Preview Dialog */}
      <Dialog open={showPrintPreview} onOpenChange={setShowPrintPreview}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="h-5 w-5" />
              Generate {printType === 'prescription' ? 'Prescription' : 'Consultation Note'} Document
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg space-y-2 text-sm">
              <p><strong>Doctor:</strong> Dr. {doctor?.full_name}</p>
              <p><strong>Clinic:</strong> {doctor?.clinic_name || 'Not set'}</p>
              <p><strong>Patient:</strong> {patient?.first_name} {patient?.last_name}</p>
              {printType === 'prescription' && printData && (
                <p><strong>Medications:</strong> {(printData.doc_prescription_items || []).length} item(s)</p>
              )}
              {printType === 'consultation' && printData && (
                <p><strong>Date:</strong> {format(new Date(printData.consultation_date), 'MMMM d, yyyy')}</p>
              )}
            </div>
            <p className="text-sm text-gray-500">
              This will generate a professionally formatted document with your clinic letterhead. You can print it or save as PDF.
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowPrintPreview(false)}>Cancel</Button>
              <Button className="bg-green-600 hover:bg-green-700 gap-2" onClick={handlePrint}>
                <Printer className="h-4 w-4" />
                Print / Save as PDF
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
