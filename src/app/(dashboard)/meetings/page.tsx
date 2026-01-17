'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/dashboard/header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Video, FileText, Sparkles, Loader2, Eye, Mic, Link2, Download, CheckCircle } from 'lucide-react'
import type { Meeting, Appointment } from '@/types/database'

interface ZoomRecording {
  id: string
  uuid: string
  topic: string
  startTime: string
  duration: number
  hasTranscript: boolean
  recordingCount: number
}

export default function MeetingsPage() {
  const { doctor, isLoading: authLoading } = useAuth()
  const [meetings, setMeetings] = useState<(Meeting & { appointment?: Appointment })[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null)
  const [transcript, setTranscript] = useState('')
  const [generating, setGenerating] = useState(false)
  const [showTranscriptDialog, setShowTranscriptDialog] = useState(false)
  const [showSummaryDialog, setShowSummaryDialog] = useState(false)
  const [showZoomDialog, setShowZoomDialog] = useState(false)
  const [zoomConnected, setZoomConnected] = useState(false)
  const [zoomRecordings, setZoomRecordings] = useState<ZoomRecording[]>([])
  const [loadingRecordings, setLoadingRecordings] = useState(false)
  const [fetchingTranscript, setFetchingTranscript] = useState(false)
  const [selectedZoomRecording, setSelectedZoomRecording] = useState<string | null>(null)

  useEffect(() => {
    const fetchMeetings = async () => {
      if (!doctor) return

      const supabase = createClient()

      const { data, error } = await supabase
        .from('doc_meetings')
        .select(`
          *,
          appointment:doc_appointments(*)
        `)
        .eq('doctor_id', doctor.id)
        .order('created_at', { ascending: false })

      if (error) {
        toast.error('Failed to load meetings')
        return
      }

      setMeetings(data || [])
      setLoading(false)

      // Check if Zoom is connected
      setZoomConnected(!!doctor.zoom_connected_at)
    }

    if (doctor) {
      fetchMeetings()
    }
  }, [doctor])

  // Check for zoom_connected query param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('zoom_connected') === 'true') {
      toast.success('Zoom account connected successfully!')
      setZoomConnected(true)
      // Clean up URL
      window.history.replaceState({}, '', '/meetings')
    }
  }, [])

  const connectZoom = () => {
    window.location.href = '/api/zoom/authorize'
  }

  const fetchZoomRecordings = async () => {
    setLoadingRecordings(true)
    try {
      const response = await fetch('/api/zoom/recordings')
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to fetch recordings')
      }
      const data = await response.json()
      setZoomRecordings(data.recordings)
      setShowZoomDialog(true)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to fetch Zoom recordings')
    } finally {
      setLoadingRecordings(false)
    }
  }

  const fetchTranscriptFromZoom = async (zoomMeetingId: string) => {
    if (!selectedMeeting) return

    setFetchingTranscript(true)
    setSelectedZoomRecording(zoomMeetingId)

    try {
      const response = await fetch('/api/zoom/transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingId: selectedMeeting.id,
          zoomMeetingId,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to fetch transcript')
      }

      const data = await response.json()

      // Update local state
      setMeetings(prev =>
        prev.map(m =>
          m.id === selectedMeeting.id
            ? { ...m, transcript: data.transcript }
            : m
        )
      )
      setTranscript(data.transcript)
      setShowZoomDialog(false)
      toast.success('Transcript fetched successfully!')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to fetch transcript')
    } finally {
      setFetchingTranscript(false)
      setSelectedZoomRecording(null)
    }
  }

  const generateSummary = async () => {
    if (!selectedMeeting || !transcript) return

    setGenerating(true)

    try {
      const response = await fetch('/api/meetings/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingId: selectedMeeting.id,
          transcript,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate summary')
      }

      const data = await response.json()

      // Update local state
      setMeetings(prev =>
        prev.map(m =>
          m.id === selectedMeeting.id
            ? { ...m, transcript, summary: data.summary, diagnosis: data.diagnosis, prescription: data.prescription }
            : m
        )
      )

      setShowTranscriptDialog(false)
      toast.success('Summary generated successfully')
    } catch {
      toast.error('Failed to generate summary')
    } finally {
      setGenerating(false)
    }
  }

  const saveTranscript = async () => {
    if (!selectedMeeting || !transcript) return

    const supabase = createClient()

    const { error } = await supabase
      .from('doc_meetings')
      .update({ transcript })
      .eq('id', selectedMeeting.id)

    if (error) {
      toast.error('Failed to save transcript')
      return
    }

    setMeetings(prev =>
      prev.map(m =>
        m.id === selectedMeeting.id ? { ...m, transcript } : m
      )
    )

    toast.success('Transcript saved')
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
      <Header title="Meetings" />

      <div className="p-6 space-y-6">
        {/* Info Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4 flex items-start gap-4">
            <Sparkles className="h-6 w-6 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-blue-800">AI-Powered Meeting Summaries</p>
              <p className="text-sm text-blue-600">
                Connect your Zoom account to automatically fetch meeting transcripts, or paste them manually. AI will generate summaries, diagnosis notes, and prescriptions using Google Gemini.
              </p>
            </div>
            {!zoomConnected ? (
              <Button onClick={connectZoom} className="bg-blue-600 hover:bg-blue-700">
                <Link2 className="h-4 w-4 mr-2" />
                Connect Zoom
              </Button>
            ) : (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <CheckCircle className="h-3 w-3 mr-1" />
                Zoom Connected
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* Meetings List */}
        <Card>
          <CardHeader>
            <CardTitle>Meeting Records</CardTitle>
            <CardDescription>
              View and manage meeting transcripts and AI-generated summaries
            </CardDescription>
          </CardHeader>
          <CardContent>
            {meetings.length === 0 ? (
              <div className="text-center py-12">
                <Video className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">No meeting records yet</p>
                <p className="text-sm text-gray-400">
                  Meeting records are created when appointments are completed
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Transcript</TableHead>
                    <TableHead>Summary</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {meetings.map(meeting => (
                    <TableRow key={meeting.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {meeting.appointment?.patient_name || 'Unknown'}
                          </p>
                          <p className="text-sm text-gray-500">
                            {meeting.appointment?.patient_email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(meeting.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        <Badge variant={meeting.transcript ? 'default' : 'outline'}>
                          {meeting.transcript ? 'Available' : 'Not Added'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={meeting.summary ? 'default' : 'outline'}
                          className={meeting.summary ? 'bg-green-100 text-green-800' : ''}
                        >
                          {meeting.summary ? 'Generated' : 'Pending'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {zoomConnected && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedMeeting(meeting)
                                setTranscript(meeting.transcript || '')
                                fetchZoomRecordings()
                              }}
                              disabled={loadingRecordings}
                            >
                              {loadingRecordings ? (
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              ) : (
                                <Download className="h-4 w-4 mr-1" />
                              )}
                              Fetch from Zoom
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedMeeting(meeting)
                              setTranscript(meeting.transcript || '')
                              setShowTranscriptDialog(true)
                            }}
                          >
                            <Mic className="h-4 w-4 mr-1" />
                            {meeting.transcript ? 'Edit' : 'Add'} Transcript
                          </Button>
                          {meeting.summary && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedMeeting(meeting)
                                setShowSummaryDialog(true)
                              }}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View Summary
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Zoom Recordings Dialog */}
        <Dialog open={showZoomDialog} onOpenChange={setShowZoomDialog}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Select Zoom Recording</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {zoomRecordings.length === 0 ? (
                <div className="text-center py-8">
                  <Video className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500">No recordings found in the last 30 days</p>
                  <p className="text-sm text-gray-400">
                    Make sure Cloud Recording is enabled in your Zoom settings
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Meeting Topic</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Transcript</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {zoomRecordings.map(recording => (
                      <TableRow key={recording.id}>
                        <TableCell className="font-medium">{recording.topic}</TableCell>
                        <TableCell>
                          {format(new Date(recording.startTime), 'MMM d, yyyy h:mm a')}
                        </TableCell>
                        <TableCell>{recording.duration} min</TableCell>
                        <TableCell>
                          <Badge variant={recording.hasTranscript ? 'default' : 'outline'}>
                            {recording.hasTranscript ? 'Available' : 'Not Available'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            disabled={!recording.hasTranscript || fetchingTranscript}
                            onClick={() => fetchTranscriptFromZoom(recording.uuid)}
                          >
                            {fetchingTranscript && selectedZoomRecording === recording.uuid ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                Fetching...
                              </>
                            ) : (
                              <>
                                <Download className="h-4 w-4 mr-1" />
                                Fetch
                              </>
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Transcript Dialog */}
        <Dialog open={showTranscriptDialog} onOpenChange={setShowTranscriptDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Meeting Transcript</DialogTitle>
            </DialogHeader>
            <Tabs defaultValue="manual" className="space-y-4">
              <TabsList>
                <TabsTrigger value="manual">
                  <FileText className="h-4 w-4 mr-1" />
                  Manual Entry
                </TabsTrigger>
                {zoomConnected && (
                  <TabsTrigger value="zoom">
                    <Video className="h-4 w-4 mr-1" />
                    Fetch from Zoom
                  </TabsTrigger>
                )}
              </TabsList>
              <TabsContent value="manual" className="space-y-4">
                <div className="space-y-2">
                  <Label>Paste or type the meeting transcript</Label>
                  <Textarea
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    placeholder="Paste the meeting transcript here..."
                    rows={12}
                  />
                </div>
                <p className="text-sm text-gray-500">
                  The AI will analyze this transcript to generate a summary, diagnosis notes, and prescription recommendations.
                </p>
              </TabsContent>
              {zoomConnected && (
                <TabsContent value="zoom" className="space-y-4">
                  <div className="text-center py-4">
                    <Video className="h-12 w-12 mx-auto mb-4 text-blue-500" />
                    <p className="text-gray-600 mb-4">
                      Fetch transcript directly from your Zoom recordings
                    </p>
                    <Button onClick={fetchZoomRecordings} disabled={loadingRecordings}>
                      {loadingRecordings ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-2" />
                          Browse Zoom Recordings
                        </>
                      )}
                    </Button>
                  </div>
                </TabsContent>
              )}
            </Tabs>
            <DialogFooter>
              <Button variant="outline" onClick={saveTranscript} disabled={!transcript}>
                Save Only
              </Button>
              <Button
                onClick={generateSummary}
                disabled={generating || !transcript}
                className="bg-green-600 hover:bg-green-700"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Summary
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Summary Dialog */}
        <Dialog open={showSummaryDialog} onOpenChange={setShowSummaryDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Meeting Summary</DialogTitle>
            </DialogHeader>
            {selectedMeeting && (
              <Tabs defaultValue="summary" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="summary">Summary</TabsTrigger>
                  <TabsTrigger value="diagnosis">Diagnosis</TabsTrigger>
                  <TabsTrigger value="prescription">Prescription</TabsTrigger>
                  <TabsTrigger value="transcript">Transcript</TabsTrigger>
                </TabsList>
                <TabsContent value="summary">
                  <Card>
                    <CardContent className="p-4">
                      <p className="whitespace-pre-wrap">
                        {selectedMeeting.summary || 'No summary available'}
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="diagnosis">
                  <Card>
                    <CardContent className="p-4">
                      <p className="whitespace-pre-wrap">
                        {selectedMeeting.diagnosis || 'No diagnosis available'}
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="prescription">
                  <Card>
                    <CardContent className="p-4">
                      <p className="whitespace-pre-wrap">
                        {selectedMeeting.prescription || 'No prescription available'}
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="transcript">
                  <Card>
                    <CardContent className="p-4">
                      <p className="whitespace-pre-wrap text-sm">
                        {selectedMeeting.transcript || 'No transcript available'}
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
