# AiSurgeonPilot - Project Overview

## Architecture

This is a **two-portal system** with a shared database:

### 1. AiSurgeonPilot (Doctor/Telecaller Portal)
- **URL**: https://ai-surgeon-pilot-784p.vercel.app
- **Users**: Doctors, Telecallers
- **Features**:
  - View booked appointments
  - Manage availability & calendar
  - Connect Zoom account (OAuth)
  - View meeting recordings & transcripts
  - AI-powered transcript analysis (summary, diagnosis, prescription)
  - Patient management
  - Digital office tools

### 2. AidocCall (Patient Portal)
- **URL**: https://aidoccall.com
- **Users**: Patients
- **Features**:
  - Patient registration
  - Browse & choose doctors
  - Book appointments (online/physical)
  - Upload medical documents
  - View appointment history

---

## Data Flow

```
Patient (aidoccall.com)              Doctor (AiSurgeonPilot)
        |                                      |
        |  1. Books appointment                |
        |  --------------------------------->  |
        |                                      |
        |  2. Zoom meeting created             |
        |  3. Recall bot scheduled             |
        |                                      |
        |  4. At appointment time:             |
        |     - Doctor joins Zoom              |
        |     - Patient joins Zoom             |
        |     - Recall bot joins & records     |
        |                                      |
        |  5. After meeting:                   |
        |     - Transcript saved to DB         |
        |     - Doctor views in AiSurgeonPilot |
```

---

## Shared Database (Supabase)

### Key Tables
| Table | Purpose |
|-------|---------|
| `doc_doctors` | Doctor profiles, Zoom tokens |
| `doc_appointments` | Bookings from patients |
| `doc_meetings` | Meeting records & transcripts |
| `doc_patients` | Patient profiles |
| `doc_availability` | Doctor schedules |
| `doc_availability_overrides` | Holidays/special days |
| `doc_notifications` | Email/WhatsApp logs |

---

## Integrations

### Zoom
- **OAuth**: Doctor connects Zoom in AiSurgeonPilot
- **Meeting Creation**: Auto-create when appointment booked
- **Recordings**: Fetch from Zoom cloud
- **Transcripts**: Fetch VTT transcripts

### Recall.ai
- **Purpose**: Bot joins Zoom meetings automatically
- **Scheduling**: Bot scheduled when appointment is booked
- **Transcription**: Real-time transcription during meeting
- **Webhook**: Delivers transcript when meeting ends

### Notifications
- **Email**: Via Resend
- **WhatsApp**: Via DoubleTick

### AI
- **Gemini**: Transcript analysis (summary, diagnosis, prescription)

---

## Environment Variables

### AiSurgeonPilot
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ZOOM_CLIENT_ID=
ZOOM_CLIENT_SECRET=
ZOOM_REDIRECT_URI=https://ai-surgeon-pilot-784p.vercel.app/api/zoom/callback
RECALL_API_KEY=
GEMINI_API_KEY=
DOUBLETICK_API_KEY=
DOUBLETICK_PHONE_NUMBER=
```

---

## API Endpoints

### Zoom APIs (AiSurgeonPilot)
- `POST /api/zoom/authorize` - Start OAuth
- `GET /api/zoom/callback` - OAuth callback
- `POST /api/zoom/create-meeting` - Create Zoom meeting
- `GET /api/zoom/recordings` - List recordings
- `POST /api/zoom/transcript` - Fetch transcript

### Recall APIs (AiSurgeonPilot)
- `POST /api/recall/schedule-bot` - Schedule bot for meeting
- `POST /api/recall/webhook` - Receive transcript callback
- `POST /api/recall/transcript` - Manually fetch transcript

### Notification APIs
- `POST /api/notifications/send-meeting-link` - Email + WhatsApp
- `POST /api/notifications/booking-confirmation` - WhatsApp confirmation
- `GET /api/cron/appointment-reminders` - 15-min reminder cron

---

## Important Notes

1. **Booking Origin**: Patients book from aidoccall.com, but meeting creation APIs are in AiSurgeonPilot
2. **Shared DB**: Both portals use the same Supabase database
3. **Cross-Origin**: aidoccall.com needs to call AiSurgeonPilot APIs for Zoom/Recall
4. **Token Storage**: Zoom tokens stored in `doc_doctors` table
5. **Bot ID Storage**: Recall bot ID stored in `doc_appointments.recall_bot_id`
