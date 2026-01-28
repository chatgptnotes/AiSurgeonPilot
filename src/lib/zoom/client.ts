const ZOOM_CLIENT_ID = process.env.ZOOM_CLIENT_ID || ''
const ZOOM_CLIENT_SECRET = process.env.ZOOM_CLIENT_SECRET || ''
const ZOOM_REDIRECT_URI = process.env.ZOOM_REDIRECT_URI || ''

const ZOOM_AUTH_URL = 'https://zoom.us/oauth/authorize'
const ZOOM_TOKEN_URL = 'https://zoom.us/oauth/token'
const ZOOM_API_BASE = 'https://api.zoom.us/v2'

export interface ZoomTokenResponse {
  access_token: string
  token_type: string
  refresh_token: string
  expires_in: number
  scope: string
}

export interface ZoomUser {
  id: string
  email: string
  first_name: string
  last_name: string
}

export interface ZoomRecording {
  id: string
  uuid: string
  topic: string
  start_time: string
  duration: number
  total_size: number
  recording_count: number
  recording_files: ZoomRecordingFile[]
}

export interface ZoomRecordingFile {
  id: string
  meeting_id: string
  recording_start: string
  recording_end: string
  file_type: string
  file_extension: string
  file_size: number
  download_url: string
  status: string
  recording_type: string
}

export interface ZoomRecordingsResponse {
  from: string
  to: string
  page_count: number
  page_size: number
  total_records: number
  meetings: ZoomRecording[]
}

export interface ZoomMeetingRequest {
  topic: string
  type?: number // 1 = instant, 2 = scheduled
  start_time: string // ISO 8601 format
  duration: number // in minutes
  timezone?: string
  agenda?: string
  settings?: {
    host_video?: boolean
    participant_video?: boolean
    join_before_host?: boolean
    mute_upon_entry?: boolean
    waiting_room?: boolean
    auto_recording?: 'none' | 'local' | 'cloud'
  }
}

export interface ZoomMeetingResponse {
  id: number
  uuid: string
  host_id: string
  host_email: string
  topic: string
  type: number
  status: string
  start_time: string
  duration: number
  timezone: string
  created_at: string
  start_url: string
  join_url: string
  password: string
}

export function getZoomAuthUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: ZOOM_CLIENT_ID,
    redirect_uri: ZOOM_REDIRECT_URI,
    state,
  })
  return `${ZOOM_AUTH_URL}?${params.toString()}`
}

export async function exchangeCodeForTokens(code: string): Promise<ZoomTokenResponse> {
  const credentials = Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString('base64')

  const response = await fetch(ZOOM_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: ZOOM_REDIRECT_URI,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to exchange code for tokens: ${error}`)
  }

  return response.json()
}

export async function refreshAccessToken(refreshToken: string): Promise<ZoomTokenResponse> {
  const credentials = Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString('base64')

  const response = await fetch(ZOOM_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to refresh token: ${error}`)
  }

  return response.json()
}

export async function getZoomUser(accessToken: string): Promise<ZoomUser> {
  const response = await fetch(`${ZOOM_API_BASE}/users/me`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get Zoom user: ${error}`)
  }

  return response.json()
}

export async function createZoomMeeting(
  accessToken: string,
  meetingDetails: ZoomMeetingRequest
): Promise<ZoomMeetingResponse> {
  const response = await fetch(`${ZOOM_API_BASE}/users/me/meetings`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      topic: meetingDetails.topic,
      type: meetingDetails.type || 2, // Scheduled meeting
      start_time: meetingDetails.start_time,
      duration: meetingDetails.duration,
      timezone: meetingDetails.timezone || 'Asia/Kolkata',
      agenda: meetingDetails.agenda || '',
      settings: {
        host_video: true,
        participant_video: true,
        join_before_host: true,
        mute_upon_entry: false,
        waiting_room: false,
        auto_recording: 'cloud',
        ...meetingDetails.settings,
      },
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to create Zoom meeting: ${error}`)
  }

  return response.json()
}

export async function getRecordings(
  accessToken: string,
  fromDate?: string,
  toDate?: string
): Promise<ZoomRecordingsResponse> {
  const params = new URLSearchParams()
  if (fromDate) params.append('from', fromDate)
  if (toDate) params.append('to', toDate)
  params.append('page_size', '30')

  const response = await fetch(
    `${ZOOM_API_BASE}/users/me/recordings?${params.toString()}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get recordings: ${error}`)
  }

  return response.json()
}

export async function getMeetingRecordings(
  accessToken: string,
  meetingId: string
): Promise<ZoomRecording> {
  const response = await fetch(
    `${ZOOM_API_BASE}/meetings/${meetingId}/recordings`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get meeting recordings: ${error}`)
  }

  return response.json()
}

export async function downloadTranscript(
  accessToken: string,
  downloadUrl: string
): Promise<string> {
  const urlWithToken = `${downloadUrl}?access_token=${accessToken}`

  const response = await fetch(urlWithToken)

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to download transcript: ${error}`)
  }

  return response.text()
}

export function parseVttToText(vttContent: string): string {
  const lines = vttContent.split('\n')
  const textLines: string[] = []
  let currentSpeaker = ''

  for (const line of lines) {
    const trimmed = line.trim()

    if (!trimmed) continue
    if (trimmed === 'WEBVTT') continue
    if (trimmed.includes('-->')) continue
    if (/^\d+$/.test(trimmed)) continue

    const speakerMatch = trimmed.match(/^(.+?):\s*(.*)$/)
    if (speakerMatch) {
      const [, speaker, text] = speakerMatch
      if (speaker !== currentSpeaker) {
        currentSpeaker = speaker
        textLines.push(`\n${speaker}:`)
      }
      if (text) {
        textLines.push(text)
      }
    } else {
      textLines.push(trimmed)
    }
  }

  return textLines.join(' ').replace(/\s+/g, ' ').trim()
}

export function findTranscriptFile(recordingFiles: ZoomRecordingFile[]): ZoomRecordingFile | null {
  return recordingFiles.find(
    file => file.file_type === 'TRANSCRIPT' || file.recording_type === 'audio_transcript'
  ) || null
}

export function findAudioFile(recordingFiles: ZoomRecordingFile[]): ZoomRecordingFile | null {
  return recordingFiles.find(
    file => file.file_type === 'M4A' || file.recording_type === 'audio_only'
  ) || null
}
