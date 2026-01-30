# AiSurgeonPilot

A comprehensive telemedicine platform for surgeons with AI-powered meeting transcription, patient management, and scheduling.

## Features

- **SuperAdmin Panel** - Manage doctors, view reports, and platform activity
- **Doctor Dashboard** - Appointments, patients, calendar, and settings
- **Patient Management** - Complete patient profiles with medical history
- **Video Consultations** - Zoom integration with AI transcription
- **Scheduling** - Availability management and booking links
- **Notifications** - Email and WhatsApp integration

## Tech Stack

- **Framework**: Next.js 16 with TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Email**: Resend
- **WhatsApp**: DoubleTick
- **Video**: Zoom OAuth
- **AI**: Google Gemini

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account

### Installation

1. Clone the repository and install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env
```

3. Configure your `.env` file with Supabase credentials and other API keys.

4. Run database migrations:

```sql
-- Execute the migration file in Supabase SQL Editor
-- Location: supabase/migrations/20260129_add_superadmin_fields.sql
```

5. Create your first SuperAdmin:

```bash
npx ts-node scripts/create-superadmin.ts
```

6. Start development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the application.

## SuperAdmin Setup

### Option 1: Using the Script

```bash
npx ts-node scripts/create-superadmin.ts
```

Follow the prompts to enter name, email, and password.

### Option 2: Manual SQL

Execute in Supabase SQL Editor:

```sql
-- First, create an auth user in Supabase Dashboard under Authentication > Users

-- Then insert the doctor profile:
INSERT INTO doc_doctors (
  user_id,
  email,
  full_name,
  role,
  is_verified,
  is_active,
  must_change_password
) VALUES (
  'auth-user-uuid-here',
  'admin@example.com',
  'Super Admin',
  'superadmin',
  true,
  true,
  false
);
```

## Routes

### SuperAdmin Routes

| Route | Description |
|-------|-------------|
| `/superadmin` | Dashboard overview |
| `/superadmin/doctors` | Doctor management list |
| `/superadmin/doctors/create` | Add new doctor |
| `/superadmin/doctors/[id]` | Doctor details |
| `/superadmin/doctors/[id]/edit` | Edit doctor |
| `/superadmin/activity` | Platform activity log |
| `/superadmin/reports` | Analytics and reports |
| `/superadmin/settings` | Admin settings |

### Doctor Routes

| Route | Description |
|-------|-------------|
| `/dashboard` | Doctor dashboard |
| `/patients` | Patient list |
| `/appointments` | Appointment management |
| `/calendar` | Schedule calendar |
| `/settings` | Profile settings |

### Public Routes

| Route | Description |
|-------|-------------|
| `/login` | Login page |
| `/signup` | Registration disabled notice |
| `/book/[slug]` | Patient booking page |

## Doctor Registration Flow

1. SuperAdmin creates doctor account in `/superadmin/doctors/create`
2. System generates a secure temporary password
3. Credentials sent via Email and/or WhatsApp
4. Doctor logs in and is redirected to change password
5. After password change, doctor accesses dashboard

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key |
| `NEXT_PUBLIC_APP_URL` | Yes | Application URL |
| `RESEND_API_KEY` | No | For email notifications |
| `DOUBLETICK_API_KEY` | No | For WhatsApp notifications |

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix ESLint issues |

## Database Schema

Key tables:

- `doc_doctors` - Doctor/SuperAdmin profiles
- `doc_patients` - Patient profiles
- `doc_appointments` - Appointment bookings
- `doc_meetings` - Meeting records with transcripts
- `doc_availability` - Doctor schedules

## Security Features

- Role-based access control (SuperAdmin/Doctor)
- Password change enforcement on first login
- Account activation/deactivation
- Session management via Supabase Auth
- RLS policies for data protection

## Version

v1.3 - 2026-01-29

## Changelog

### v1.3 (2026-01-29)
- Added SuperAdmin panel
- Doctor management by SuperAdmin
- Credential sharing via Email/WhatsApp
- Disabled self-registration
- Password change enforcement
- Activity logging and reports

### v1.2 (2026-01-23)
- Calendar integration
- WhatsApp notifications
- Patient follow-up system

## License

Proprietary - All rights reserved.
