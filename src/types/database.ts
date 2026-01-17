export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      doc_doctors: {
        Row: {
          id: string
          user_id: string
          email: string
          full_name: string
          specialization: string | null
          qualification: string | null
          experience_years: number | null
          clinic_name: string | null
          clinic_address: string | null
          phone: string | null
          profile_image: string | null
          bio: string | null
          consultation_fee: number | null
          online_fee: number | null
          booking_slug: string | null
          stripe_account_id: string | null
          standard_meeting_link: string | null
          zoom_access_token: string | null
          zoom_refresh_token: string | null
          zoom_token_expires_at: string | null
          zoom_user_id: string | null
          zoom_connected_at: string | null
          is_verified: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          email: string
          full_name: string
          specialization?: string | null
          qualification?: string | null
          experience_years?: number | null
          clinic_name?: string | null
          clinic_address?: string | null
          phone?: string | null
          profile_image?: string | null
          bio?: string | null
          consultation_fee?: number | null
          online_fee?: number | null
          booking_slug?: string | null
          stripe_account_id?: string | null
          standard_meeting_link?: string | null
          zoom_access_token?: string | null
          zoom_refresh_token?: string | null
          zoom_token_expires_at?: string | null
          zoom_user_id?: string | null
          zoom_connected_at?: string | null
          is_verified?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          email?: string
          full_name?: string
          specialization?: string | null
          qualification?: string | null
          experience_years?: number | null
          clinic_name?: string | null
          clinic_address?: string | null
          phone?: string | null
          profile_image?: string | null
          bio?: string | null
          consultation_fee?: number | null
          online_fee?: number | null
          booking_slug?: string | null
          stripe_account_id?: string | null
          standard_meeting_link?: string | null
          zoom_access_token?: string | null
          zoom_refresh_token?: string | null
          zoom_token_expires_at?: string | null
          zoom_user_id?: string | null
          zoom_connected_at?: string | null
          is_verified?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      doc_availability: {
        Row: {
          id: string
          doctor_id: string
          day_of_week: number
          start_time: string
          end_time: string
          slot_duration: number
          is_active: boolean
          visit_type: string[]
          created_at: string
        }
        Insert: {
          id?: string
          doctor_id: string
          day_of_week: number
          start_time: string
          end_time: string
          slot_duration?: number
          is_active?: boolean
          visit_type?: string[]
          created_at?: string
        }
        Update: {
          id?: string
          doctor_id?: string
          day_of_week?: number
          start_time?: string
          end_time?: string
          slot_duration?: number
          is_active?: boolean
          visit_type?: string[]
          created_at?: string
        }
      }
      doc_availability_overrides: {
        Row: {
          id: string
          doctor_id: string
          date: string
          is_available: boolean
          start_time: string | null
          end_time: string | null
          reason: string | null
        }
        Insert: {
          id?: string
          doctor_id: string
          date: string
          is_available?: boolean
          start_time?: string | null
          end_time?: string | null
          reason?: string | null
        }
        Update: {
          id?: string
          doctor_id?: string
          date?: string
          is_available?: boolean
          start_time?: string | null
          end_time?: string | null
          reason?: string | null
        }
      }
      doc_appointments: {
        Row: {
          id: string
          doctor_id: string
          patient_id: string | null
          patient_name: string
          patient_email: string
          patient_phone: string | null
          appointment_date: string
          start_time: string
          end_time: string
          visit_type: 'online' | 'physical'
          status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
          payment_status: 'pending' | 'paid' | 'refunded'
          payment_id: string | null
          amount: number
          meeting_link: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          doctor_id: string
          patient_id?: string | null
          patient_name: string
          patient_email: string
          patient_phone?: string | null
          appointment_date: string
          start_time: string
          end_time: string
          visit_type: 'online' | 'physical'
          status?: 'pending' | 'confirmed' | 'completed' | 'cancelled'
          payment_status?: 'pending' | 'paid' | 'refunded'
          payment_id?: string | null
          amount: number
          meeting_link?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          doctor_id?: string
          patient_id?: string | null
          patient_name?: string
          patient_email?: string
          patient_phone?: string | null
          appointment_date?: string
          start_time?: string
          end_time?: string
          visit_type?: 'online' | 'physical'
          status?: 'pending' | 'confirmed' | 'completed' | 'cancelled'
          payment_status?: 'pending' | 'paid' | 'refunded'
          payment_id?: string | null
          amount?: number
          meeting_link?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      doc_patient_reports: {
        Row: {
          id: string
          doctor_id: string
          patient_id: string | null
          appointment_id: string | null
          file_name: string
          file_url: string
          file_type: string
          description: string | null
          uploaded_by: 'doctor' | 'patient'
          created_at: string
        }
        Insert: {
          id?: string
          doctor_id: string
          patient_id?: string | null
          appointment_id?: string | null
          file_name: string
          file_url: string
          file_type: string
          description?: string | null
          uploaded_by: 'doctor' | 'patient'
          created_at?: string
        }
        Update: {
          id?: string
          doctor_id?: string
          patient_id?: string | null
          appointment_id?: string | null
          file_name?: string
          file_url?: string
          file_type?: string
          description?: string | null
          uploaded_by?: 'doctor' | 'patient'
          created_at?: string
        }
      }
      doc_meetings: {
        Row: {
          id: string
          appointment_id: string
          doctor_id: string
          patient_id: string | null
          meeting_link: string | null
          started_at: string | null
          ended_at: string | null
          transcript: string | null
          summary: string | null
          diagnosis: string | null
          prescription: string | null
          follow_up_notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          appointment_id: string
          doctor_id: string
          patient_id?: string | null
          meeting_link?: string | null
          started_at?: string | null
          ended_at?: string | null
          transcript?: string | null
          summary?: string | null
          diagnosis?: string | null
          prescription?: string | null
          follow_up_notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          appointment_id?: string
          doctor_id?: string
          patient_id?: string | null
          meeting_link?: string | null
          started_at?: string | null
          ended_at?: string | null
          transcript?: string | null
          summary?: string | null
          diagnosis?: string | null
          prescription?: string | null
          follow_up_notes?: string | null
          created_at?: string
        }
      }
      doc_notifications: {
        Row: {
          id: string
          doctor_id: string
          patient_id: string | null
          appointment_id: string | null
          type: 'email' | 'whatsapp' | 'sms'
          channel: string
          status: 'sent' | 'failed' | 'pending'
          sent_at: string | null
          metadata: Json | null
        }
        Insert: {
          id?: string
          doctor_id: string
          patient_id?: string | null
          appointment_id?: string | null
          type: 'email' | 'whatsapp' | 'sms'
          channel: string
          status?: 'sent' | 'failed' | 'pending'
          sent_at?: string | null
          metadata?: Json | null
        }
        Update: {
          id?: string
          doctor_id?: string
          patient_id?: string | null
          appointment_id?: string | null
          type?: 'email' | 'whatsapp' | 'sms'
          channel?: string
          status?: 'sent' | 'failed' | 'pending'
          sent_at?: string | null
          metadata?: Json | null
        }
      }
      doc_followups: {
        Row: {
          id: string
          doctor_id: string
          patient_id: string | null
          appointment_id: string | null
          followup_date: string
          notes: string | null
          status: 'pending' | 'completed' | 'cancelled'
          created_at: string
        }
        Insert: {
          id?: string
          doctor_id: string
          patient_id?: string | null
          appointment_id?: string | null
          followup_date: string
          notes?: string | null
          status?: 'pending' | 'completed' | 'cancelled'
          created_at?: string
        }
        Update: {
          id?: string
          doctor_id?: string
          patient_id?: string | null
          appointment_id?: string | null
          followup_date?: string
          notes?: string | null
          status?: 'pending' | 'completed' | 'cancelled'
          created_at?: string
        }
      }
      doc_education_content: {
        Row: {
          id: string
          doctor_id: string
          title: string
          content: string | null
          content_type: 'article' | 'video' | 'pdf'
          file_url: string | null
          category: string | null
          is_published: boolean
          created_at: string
        }
        Insert: {
          id?: string
          doctor_id: string
          title: string
          content?: string | null
          content_type: 'article' | 'video' | 'pdf'
          file_url?: string | null
          category?: string | null
          is_published?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          doctor_id?: string
          title?: string
          content?: string | null
          content_type?: 'article' | 'video' | 'pdf'
          file_url?: string | null
          category?: string | null
          is_published?: boolean
          created_at?: string
        }
      }
      doc_surgery_options: {
        Row: {
          id: string
          doctor_id: string
          name: string
          description: string | null
          estimated_cost_min: number | null
          estimated_cost_max: number | null
          recovery_time: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          doctor_id: string
          name: string
          description?: string | null
          estimated_cost_min?: number | null
          estimated_cost_max?: number | null
          recovery_time?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          doctor_id?: string
          name?: string
          description?: string | null
          estimated_cost_min?: number | null
          estimated_cost_max?: number | null
          recovery_time?: string | null
          is_active?: boolean
          created_at?: string
        }
      }
      doc_patients: {
        Row: {
          id: string
          user_id: string
          email: string
          first_name: string
          last_name: string
          phone_number: string | null
          date_of_birth: string
          gender: 'male' | 'female' | 'other'
          blood_group: 'A+' | 'A-' | 'B+' | 'B-' | 'O+' | 'O-' | 'AB+' | 'AB-' | null
          height_cm: number | null
          weight_kg: number | null
          marital_status: 'single' | 'married' | 'divorced' | 'widowed' | null
          profile_image_url: string | null
          is_profile_complete: boolean
          is_active: boolean
          registration_step: number | null
          registration_completed: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          email: string
          first_name: string
          last_name: string
          phone_number?: string | null
          date_of_birth: string
          gender: 'male' | 'female' | 'other'
          blood_group?: 'A+' | 'A-' | 'B+' | 'B-' | 'O+' | 'O-' | 'AB+' | 'AB-' | null
          height_cm?: number | null
          weight_kg?: number | null
          marital_status?: 'single' | 'married' | 'divorced' | 'widowed' | null
          profile_image_url?: string | null
          is_profile_complete?: boolean
          is_active?: boolean
          registration_step?: number | null
          registration_completed?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          email?: string
          first_name?: string
          last_name?: string
          phone_number?: string | null
          date_of_birth?: string
          gender?: 'male' | 'female' | 'other'
          blood_group?: 'A+' | 'A-' | 'B+' | 'B-' | 'O+' | 'O-' | 'AB+' | 'AB-' | null
          height_cm?: number | null
          weight_kg?: number | null
          marital_status?: 'single' | 'married' | 'divorced' | 'widowed' | null
          profile_image_url?: string | null
          is_profile_complete?: boolean
          is_active?: boolean
          registration_step?: number | null
          registration_completed?: boolean | null
          created_at?: string
          updated_at?: string
        }
      }
      doc_patient_doctor_selections: {
        Row: {
          id: string
          patient_id: string
          doctor_id: string
          is_primary_doctor: boolean
          selection_reason: string | null
          status: 'active' | 'inactive'
          selected_at: string
        }
        Insert: {
          id?: string
          patient_id: string
          doctor_id: string
          is_primary_doctor?: boolean
          selection_reason?: string | null
          status?: 'active' | 'inactive'
          selected_at?: string
        }
        Update: {
          id?: string
          patient_id?: string
          doctor_id?: string
          is_primary_doctor?: boolean
          selection_reason?: string | null
          status?: 'active' | 'inactive'
          selected_at?: string
        }
      }
      doc_patient_medical_history: {
        Row: {
          id: string
          patient_id: string
          condition_name: string
          condition_type: 'chronic' | 'past' | 'ongoing' | 'genetic' | null
          diagnosed_date: string | null
          notes: string | null
          is_current: boolean
          created_at: string
        }
        Insert: {
          id?: string
          patient_id: string
          condition_name: string
          condition_type?: 'chronic' | 'past' | 'ongoing' | 'genetic' | null
          diagnosed_date?: string | null
          notes?: string | null
          is_current?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          patient_id?: string
          condition_name?: string
          condition_type?: 'chronic' | 'past' | 'ongoing' | 'genetic' | null
          diagnosed_date?: string | null
          notes?: string | null
          is_current?: boolean
          created_at?: string
        }
      }
      doc_patient_allergies: {
        Row: {
          id: string
          patient_id: string
          allergy_type: 'drug' | 'food' | 'environmental' | 'other'
          allergy_name: string
          severity: 'mild' | 'moderate' | 'severe' | null
          reaction_description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          patient_id: string
          allergy_type: 'drug' | 'food' | 'environmental' | 'other'
          allergy_name: string
          severity?: 'mild' | 'moderate' | 'severe' | null
          reaction_description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          patient_id?: string
          allergy_type?: 'drug' | 'food' | 'environmental' | 'other'
          allergy_name?: string
          severity?: 'mild' | 'moderate' | 'severe' | null
          reaction_description?: string | null
          created_at?: string
        }
      }
      doc_patient_medications: {
        Row: {
          id: string
          patient_id: string
          medication_name: string
          dosage: string | null
          frequency: string | null
          start_date: string | null
          end_date: string | null
          prescribing_doctor: string | null
          is_current: boolean
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          patient_id: string
          medication_name: string
          dosage?: string | null
          frequency?: string | null
          start_date?: string | null
          end_date?: string | null
          prescribing_doctor?: string | null
          is_current?: boolean
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          patient_id?: string
          medication_name?: string
          dosage?: string | null
          frequency?: string | null
          start_date?: string | null
          end_date?: string | null
          prescribing_doctor?: string | null
          is_current?: boolean
          notes?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

export type Doctor = Database['public']['Tables']['doc_doctors']['Row']
export type DoctorInsert = Database['public']['Tables']['doc_doctors']['Insert']
export type DoctorUpdate = Database['public']['Tables']['doc_doctors']['Update']

export type Availability = Database['public']['Tables']['doc_availability']['Row']
export type AvailabilityInsert = Database['public']['Tables']['doc_availability']['Insert']
export type AvailabilityUpdate = Database['public']['Tables']['doc_availability']['Update']

export type AvailabilityOverride = Database['public']['Tables']['doc_availability_overrides']['Row']
export type AvailabilityOverrideInsert = Database['public']['Tables']['doc_availability_overrides']['Insert']
export type AvailabilityOverrideUpdate = Database['public']['Tables']['doc_availability_overrides']['Update']

export type Appointment = Database['public']['Tables']['doc_appointments']['Row']
export type AppointmentInsert = Database['public']['Tables']['doc_appointments']['Insert']
export type AppointmentUpdate = Database['public']['Tables']['doc_appointments']['Update']

export type PatientReport = Database['public']['Tables']['doc_patient_reports']['Row']
export type PatientReportInsert = Database['public']['Tables']['doc_patient_reports']['Insert']
export type PatientReportUpdate = Database['public']['Tables']['doc_patient_reports']['Update']

export type Meeting = Database['public']['Tables']['doc_meetings']['Row']
export type MeetingInsert = Database['public']['Tables']['doc_meetings']['Insert']
export type MeetingUpdate = Database['public']['Tables']['doc_meetings']['Update']

export type Notification = Database['public']['Tables']['doc_notifications']['Row']
export type NotificationInsert = Database['public']['Tables']['doc_notifications']['Insert']
export type NotificationUpdate = Database['public']['Tables']['doc_notifications']['Update']

export type Followup = Database['public']['Tables']['doc_followups']['Row']
export type FollowupInsert = Database['public']['Tables']['doc_followups']['Insert']
export type FollowupUpdate = Database['public']['Tables']['doc_followups']['Update']

export type EducationContent = Database['public']['Tables']['doc_education_content']['Row']
export type EducationContentInsert = Database['public']['Tables']['doc_education_content']['Insert']
export type EducationContentUpdate = Database['public']['Tables']['doc_education_content']['Update']

export type SurgeryOption = Database['public']['Tables']['doc_surgery_options']['Row']
export type SurgeryOptionInsert = Database['public']['Tables']['doc_surgery_options']['Insert']
export type SurgeryOptionUpdate = Database['public']['Tables']['doc_surgery_options']['Update']

export type Patient = Database['public']['Tables']['doc_patients']['Row']
export type PatientInsert = Database['public']['Tables']['doc_patients']['Insert']
export type PatientUpdate = Database['public']['Tables']['doc_patients']['Update']

export type PatientDoctorSelection = Database['public']['Tables']['doc_patient_doctor_selections']['Row']
export type PatientDoctorSelectionInsert = Database['public']['Tables']['doc_patient_doctor_selections']['Insert']
export type PatientDoctorSelectionUpdate = Database['public']['Tables']['doc_patient_doctor_selections']['Update']

export type PatientMedicalHistory = Database['public']['Tables']['doc_patient_medical_history']['Row']
export type PatientMedicalHistoryInsert = Database['public']['Tables']['doc_patient_medical_history']['Insert']
export type PatientMedicalHistoryUpdate = Database['public']['Tables']['doc_patient_medical_history']['Update']

export type PatientAllergy = Database['public']['Tables']['doc_patient_allergies']['Row']
export type PatientAllergyInsert = Database['public']['Tables']['doc_patient_allergies']['Insert']
export type PatientAllergyUpdate = Database['public']['Tables']['doc_patient_allergies']['Update']

export type PatientMedication = Database['public']['Tables']['doc_patient_medications']['Row']
export type PatientMedicationInsert = Database['public']['Tables']['doc_patient_medications']['Insert']
export type PatientMedicationUpdate = Database['public']['Tables']['doc_patient_medications']['Update']
