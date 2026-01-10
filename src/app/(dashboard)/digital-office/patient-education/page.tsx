'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/dashboard/header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Plus, FileText, Video, File, Edit, Trash2, Eye, Loader2, GraduationCap } from 'lucide-react'
import type { EducationContent } from '@/types/database'

const contentTypeIcons: Record<string, React.ElementType> = {
  article: FileText,
  video: Video,
  pdf: File,
}

export default function PatientEducationPage() {
  const { doctor, isLoading: authLoading } = useAuth()
  const [content, setContent] = useState<EducationContent[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newContent, setNewContent] = useState({
    title: '',
    content: '',
    content_type: 'article' as 'article' | 'video' | 'pdf',
    category: '',
    is_published: false,
  })

  useEffect(() => {
    const fetchContent = async () => {
      if (!doctor) return

      const supabase = createClient()

      const { data, error } = await supabase
        .from('doc_education_content')
        .select('*')
        .eq('doctor_id', doctor.id)
        .order('created_at', { ascending: false })

      if (error) {
        toast.error('Failed to load content')
        return
      }

      setContent(data || [])
      setLoading(false)
    }

    if (doctor) {
      fetchContent()
    }
  }, [doctor])

  const handleCreate = async () => {
    if (!doctor || !newContent.title) {
      toast.error('Title is required')
      return
    }

    setSaving(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from('doc_education_content')
      .insert({
        doctor_id: doctor.id,
        title: newContent.title,
        content: newContent.content,
        content_type: newContent.content_type,
        category: newContent.category || null,
        is_published: newContent.is_published,
      })
      .select()
      .single()

    setSaving(false)

    if (error) {
      toast.error('Failed to create content')
      return
    }

    setContent(prev => [data, ...prev])
    setShowDialog(false)
    setNewContent({
      title: '',
      content: '',
      content_type: 'article',
      category: '',
      is_published: false,
    })
    toast.success('Content created')
  }

  const togglePublish = async (id: string, currentStatus: boolean) => {
    const supabase = createClient()

    const { error } = await supabase
      .from('doc_education_content')
      .update({ is_published: !currentStatus })
      .eq('id', id)

    if (error) {
      toast.error('Failed to update status')
      return
    }

    setContent(prev =>
      prev.map(c => c.id === id ? { ...c, is_published: !currentStatus } : c)
    )
    toast.success(currentStatus ? 'Content unpublished' : 'Content published')
  }

  const deleteContent = async (id: string) => {
    const supabase = createClient()

    const { error } = await supabase
      .from('doc_education_content')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error('Failed to delete content')
      return
    }

    setContent(prev => prev.filter(c => c.id !== id))
    toast.success('Content deleted')
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
      <Header title="Patient Education" />

      <div className="p-6 space-y-6">
        {/* Info Banner */}
        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="p-4 flex items-start gap-4">
            <GraduationCap className="h-6 w-6 text-purple-600 mt-0.5" />
            <div>
              <p className="font-medium text-purple-800">Educate Your Patients</p>
              <p className="text-sm text-purple-600">
                Create and share educational content with your patients. Articles, videos, and PDFs can be shared to help patients understand their conditions better.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Content List */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Educational Content</CardTitle>
              <CardDescription>Manage your patient education materials</CardDescription>
            </div>
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
              <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Content
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Educational Content</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Title *</Label>
                      <Input
                        placeholder="e.g., Understanding Diabetes"
                        value={newContent.title}
                        onChange={(e) => setNewContent(p => ({ ...p, title: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Content Type</Label>
                      <Select
                        value={newContent.content_type}
                        onValueChange={(v: 'article' | 'video' | 'pdf') =>
                          setNewContent(p => ({ ...p, content_type: v }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="article">Article</SelectItem>
                          <SelectItem value="video">Video</SelectItem>
                          <SelectItem value="pdf">PDF</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Input
                      placeholder="e.g., Cardiology, General Health"
                      value={newContent.category}
                      onChange={(e) => setNewContent(p => ({ ...p, category: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Content</Label>
                    <Textarea
                      placeholder="Write your educational content here..."
                      value={newContent.content}
                      onChange={(e) => setNewContent(p => ({ ...p, content: e.target.value }))}
                      rows={8}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={newContent.is_published}
                      onCheckedChange={(checked) =>
                        setNewContent(p => ({ ...p, is_published: checked }))
                      }
                    />
                    <Label>Publish immediately</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowDialog(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreate}
                    disabled={saving}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {content.length === 0 ? (
              <div className="text-center py-12">
                <GraduationCap className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">No content created yet</p>
                <p className="text-sm text-gray-400">Create educational content for your patients</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {content.map((item) => {
                  const Icon = contentTypeIcons[item.content_type]
                  return (
                    <Card key={item.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="p-2 bg-gray-100 rounded-lg">
                            <Icon className="h-5 w-5 text-gray-600" />
                          </div>
                          <Badge variant={item.is_published ? 'default' : 'outline'}>
                            {item.is_published ? 'Published' : 'Draft'}
                          </Badge>
                        </div>
                        <h4 className="font-medium mb-1 line-clamp-1">{item.title}</h4>
                        {item.category && (
                          <p className="text-xs text-gray-500 mb-2">{item.category}</p>
                        )}
                        <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                          {item.content || 'No description'}
                        </p>
                        <div className="flex items-center justify-between text-xs text-gray-400">
                          <span>{format(new Date(item.created_at), 'MMM d, yyyy')}</span>
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => togglePublish(item.id, item.is_published)}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-red-500"
                              onClick={() => deleteContent(item.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
