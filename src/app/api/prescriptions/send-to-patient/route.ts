import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'

// Generate HTML for the prescription/consultation document
function generateDocumentHTML(
  type: 'prescription' | 'consultation',
  data: any,
  patient: any,
  doctor: any
): string {
  const patientName = `${patient?.first_name || ''} ${patient?.last_name || ''}`
  const patientAge = patient?.date_of_birth
    ? Math.floor((Date.now() - new Date(patient.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : ''
  const patientGender = patient?.gender || ''

  let bodyContent = ''

  if (type === 'prescription' && data) {
    const items = (data.doc_prescription_items || []).sort((a: any, b: any) => a.sort_order - b.sort_order)
    bodyContent = `
      <div class="rx-symbol">Rx</div>
      ${data.diagnosis ? `<div class="section"><strong>Diagnosis:</strong> ${data.diagnosis}</div>` : ''}
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
      ${data.notes ? `<div class="section" style="margin-top:20px"><strong>Notes:</strong> ${data.notes}</div>` : ''}
    `
  } else if (type === 'consultation' && data) {
    const vitals = data.vitals || {}
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
      ${data.chief_complaint ? `<div class="section"><strong>Chief Complaint:</strong><br/>${data.chief_complaint}</div>` : ''}
      ${data.history_of_present_illness ? `<div class="section"><strong>History of Present Illness:</strong><br/>${data.history_of_present_illness}</div>` : ''}
      ${data.examination_findings ? `<div class="section"><strong>Examination Findings:</strong><br/>${data.examination_findings}</div>` : ''}
      ${data.diagnosis ? `<div class="section"><strong>Diagnosis:</strong><br/>${data.diagnosis}</div>` : ''}
      ${data.treatment_plan ? `<div class="section"><strong>Treatment Plan:</strong><br/>${data.treatment_plan}</div>` : ''}
      ${data.follow_up_instructions ? `<div class="section"><strong>Follow-up Instructions:</strong><br/>${data.follow_up_instructions}</div>` : ''}
      ${data.additional_notes ? `<div class="section"><strong>Additional Notes:</strong><br/>${data.additional_notes}</div>` : ''}
    `
  }

  const docDate = type === 'prescription'
    ? (data?.prescription_date || new Date().toISOString().split('T')[0])
    : (data?.consultation_date || new Date().toISOString().split('T')[0])

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${type === 'prescription' ? 'Prescription' : 'Consultation Note'} - ${patientName}</title>
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

        <div class="doc-type">${type === 'prescription' ? 'Prescription' : 'Consultation Note'}</div>

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
    </body>
    </html>
  `
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { type, data, patientId, appointmentId } = await request.json()

    if (!type || !data || !patientId) {
      return NextResponse.json(
        { error: 'Missing required fields: type, data, patientId' },
        { status: 400 }
      )
    }

    // Get doctor info
    const { data: doctor, error: doctorError } = await supabase
      .from('doc_doctors')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (doctorError || !doctor) {
      return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })
    }

    // Get patient info
    const { data: patient, error: patientError } = await supabase
      .from('doc_patients')
      .select('*')
      .eq('id', patientId)
      .single()

    if (patientError || !patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }

    // Generate HTML document
    const html = generateDocumentHTML(type, data, patient, doctor)

    // Use document ID for consistent filename (so edits update the same file)
    const docId = data.id
    const fileName = `${doctor.id}/${patientId}/${type}_${docId}.html`

    // Check if a report already exists for this prescription/consultation
    const { data: existingReport } = await supabase
      .from('doc_patient_reports')
      .select('id, file_url')
      .eq('doctor_id', doctor.id)
      .eq('patient_id', patientId)
      .eq('file_url', fileName)
      .single()

    // Upload HTML file to Supabase storage (upsert to update if exists)
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('doctor-prescriptions')
      .upload(fileName, html, {
        contentType: 'text/html',
        upsert: true  // Update if file already exists
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload document' }, { status: 500 })
    }

    let report
    const docDate = type === 'prescription' 
      ? (data.prescription_date || new Date().toISOString().split('T')[0])
      : (data.consultation_date || new Date().toISOString().split('T')[0])

    if (existingReport) {
      // Update existing report record
      const { data: updatedReport, error: updateError } = await supabase
        .from('doc_patient_reports')
        .update({
          file_name: `${type === 'prescription' ? 'Prescription' : 'Consultation Note'} - ${format(new Date(docDate), 'MMM d, yyyy')}`,
          description: type === 'prescription' 
            ? `Prescription with ${(data.doc_prescription_items || []).length} medication(s)`
            : 'Consultation note',
        })
        .eq('id', existingReport.id)
        .select()
        .single()

      if (updateError) {
        console.error('Update error:', updateError)
        return NextResponse.json({ error: 'Failed to update report record' }, { status: 500 })
      }
      report = updatedReport
    } else {
      // Create new report record
      const { data: newReport, error: reportError } = await supabase
        .from('doc_patient_reports')
        .insert({
          doctor_id: doctor.id,
          patient_id: patientId,
          appointment_id: appointmentId || null,
          file_name: `${type === 'prescription' ? 'Prescription' : 'Consultation Note'} - ${format(new Date(docDate), 'MMM d, yyyy')}`,
          file_url: fileName,
          file_type: type,
          description: type === 'prescription' 
            ? `Prescription with ${(data.doc_prescription_items || []).length} medication(s)`
            : 'Consultation note',
          uploaded_by: 'doctor'
        })
        .select()
        .single()

      if (reportError) {
        console.error('Report error:', reportError)
        return NextResponse.json({ error: 'Failed to create report record' }, { status: 500 })
      }
      report = newReport
    }

    // Create notification for patient
    const isUpdate = !!existingReport
    await supabase
      .from('doc_notifications')
      .insert({
        doctor_id: doctor.id,
        patient_id: patientId,
        appointment_id: appointmentId || null,
        type: 'in_app',
        channel: 'aidocall',
        status: 'sent',
        title: isUpdate 
          ? (type === 'prescription' ? 'Prescription Updated' : 'Consultation Note Updated')
          : (type === 'prescription' ? 'New Prescription Available' : 'Consultation Note Available'),
        message: isUpdate
          ? `Dr. ${doctor.full_name} has updated your ${type === 'prescription' ? 'prescription' : 'consultation note'}.`
          : `Dr. ${doctor.full_name} has shared a ${type === 'prescription' ? 'prescription' : 'consultation note'} with you.`,
        is_read: false
      })

    return NextResponse.json({
      success: true,
      report,
      isUpdate,
      message: isUpdate
        ? `${type === 'prescription' ? 'Prescription' : 'Consultation note'} updated for patient`
        : `${type === 'prescription' ? 'Prescription' : 'Consultation note'} sent to patient successfully`
    })

  } catch (error) {
    console.error('Error sending document to patient:', error)
    return NextResponse.json(
      { error: 'Failed to send document to patient' },
      { status: 500 }
    )
  }
}
