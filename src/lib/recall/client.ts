const RECALL_API_KEY = process.env.RECALL_API_KEY || ''
const RECALL_API_BASE = 'https://us-west-2.recall.ai/api/v1'

export interface RecallBotRequest {
  meeting_url: string
  join_at?: string // ISO 8601 timestamp for scheduled join
  bot_name?: string
  automatic_leave?: {
    waiting_room_timeout?: number // seconds
    noone_joined_timeout?: number // seconds
    everyone_left_timeout?: number // seconds
  }
}

export interface RecallBot {
  id: string
  meeting_url: string
  bot_name: string
  join_at: string | null
  status_changes: {
    code: string
    message: string | null
    created_at: string
  }[]
  meeting_metadata: {
    title: string | null
  } | null
  meeting_participants: {
    id: number
    name: string
    events: {
      code: string
      created_at: string
    }[]
  }[]
  video_url: string | null
  transcript: RecallTranscriptSegment[] | null
  created_at: string
}

export interface RecallTranscriptSegment {
  speaker: string
  speaker_id: number
  words: {
    text: string
    start_time: number
    end_time: number
  }[]
}

export interface RecallBotListResponse {
  next: string | null
  previous: string | null
  results: RecallBot[]
}

/**
 * Create a Recall.ai bot to join a meeting
 * If join_at is provided, the bot will be scheduled to join at that time
 */
export async function createRecallBot(options: RecallBotRequest): Promise<RecallBot> {
  const response = await fetch(`${RECALL_API_BASE}/bot`, {
    method: 'POST',
    headers: {
      'Authorization': `Token ${RECALL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      meeting_url: options.meeting_url,
      join_at: options.join_at,
      bot_name: options.bot_name || 'AI Surgeon Assistant',
      recording_config: {
        transcript: {
          provider: {
            meeting_captions: {}
          }
        }
      },
      automatic_leave: options.automatic_leave || {
        waiting_room_timeout: 600, // 10 minutes
        noone_joined_timeout: 600, // 10 minutes
        everyone_left_timeout: 60, // 1 minute after everyone leaves
      },
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to create Recall bot: ${error}`)
  }

  return response.json()
}

/**
 * Get bot details including transcript and recording
 */
export async function getRecallBot(botId: string): Promise<RecallBot> {
  const response = await fetch(`${RECALL_API_BASE}/bot/${botId}`, {
    headers: {
      'Authorization': `Token ${RECALL_API_KEY}`,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get Recall bot: ${error}`)
  }

  return response.json()
}

/**
 * Get bot transcript from the new API
 * Transcript is now in recordings[].media_shortcuts.transcript
 */
export async function getRecallBotTranscript(botId: string): Promise<RecallTranscriptSegment[]> {
  // First get the bot details to find the transcript URL
  const bot = await getRecallBot(botId)

  // Find the recording with transcript
  const recordings = (bot as any).recordings || []
  if (recordings.length === 0) {
    console.log('No recordings found for bot')
    return []
  }

  const recording = recordings[0]
  const transcript = recording?.media_shortcuts?.transcript

  if (!transcript) {
    console.log('Transcript not enabled for this recording')
    return []
  }

  if (transcript.status?.code !== 'done') {
    console.log('Transcript not ready yet, status:', transcript.status?.code)
    return []
  }

  const downloadUrl = transcript.data?.download_url
  if (!downloadUrl) {
    console.log('No transcript download URL available')
    return []
  }

  // Fetch the actual transcript
  const response = await fetch(downloadUrl)
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to download transcript: ${error}`)
  }

  return response.json()
}

/**
 * Delete/stop a scheduled bot
 */
export async function deleteRecallBot(botId: string): Promise<void> {
  const response = await fetch(`${RECALL_API_BASE}/bot/${botId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Token ${RECALL_API_KEY}`,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to delete Recall bot: ${error}`)
  }
}

/**
 * List all bots
 */
export async function listRecallBots(cursor?: string): Promise<RecallBotListResponse> {
  const url = cursor || `${RECALL_API_BASE}/bot`
  const response = await fetch(url, {
    headers: {
      'Authorization': `Token ${RECALL_API_KEY}`,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to list Recall bots: ${error}`)
  }

  return response.json()
}

/**
 * Convert Recall transcript to plain text
 */
export function recallTranscriptToText(transcript: RecallTranscriptSegment[]): string {
  const lines: string[] = []
  let currentSpeaker = ''

  for (const segment of transcript) {
    if (segment.speaker !== currentSpeaker) {
      currentSpeaker = segment.speaker
      lines.push(`\n${segment.speaker}:`)
    }
    const text = segment.words.map(w => w.text).join(' ')
    lines.push(text)
  }

  return lines.join(' ').replace(/\s+/g, ' ').trim()
}

/**
 * Get the current status of a bot
 */
export function getBotStatus(bot: RecallBot): string {
  if (bot.status_changes.length === 0) return 'unknown'
  return bot.status_changes[bot.status_changes.length - 1].code
}
