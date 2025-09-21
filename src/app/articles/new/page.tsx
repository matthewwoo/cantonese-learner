"use client"

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

// Figma-derived colors (consistent with flashcards/articles index)
const FIGMA_COLORS = {
  surfaceBackground: '#f9f2ec',
  surfaceBorder: '#f2e2c4',
  textPrimary: '#171515',
  textSecondary: '#6e6c66',
  buttonBg: '#171515',
  buttonText: '#ffffff',
}

export default function NewArticlePage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [articleUrl, setArticleUrl] = useState('')
  const [articleTitle, setArticleTitle] = useState('')
  const [articleContent, setArticleContent] = useState('')
  const [isFetchingUrl, setIsFetchingUrl] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: FIGMA_COLORS.surfaceBackground }}>
        <div className="text-center">
          <div className="w-16 h-16 bg-white/70 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-2xl">📖</span>
          </div>
          <p className="text-lg font-medium" style={{ color: FIGMA_COLORS.textSecondary }}>Loading…</p>
        </div>
      </div>
    )
  }

  if (!session) return null

  const fetchFromUrl = async () => {
    if (!articleUrl) {
      toast.error('Please enter an article URL')
      return
    }
    setIsFetchingUrl(true)
    try {
      const response = await fetch('/api/articles/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: articleUrl }),
      })
      if (!response.ok) throw new Error('Unable to fetch article content')
      const data = await response.json()
      setArticleTitle(data.title)
      setArticleContent(data.content)
      toast.success('Fetched article content')
    } catch (e) {
      console.error(e)
      toast.error('Unable to fetch article from this URL')
    } finally {
      setIsFetchingUrl(false)
    }
  }

  const handleCreate = async () => {
    if (!articleTitle) {
      toast.error('Please fill in article title')
      return
    }
    if (!articleContent && !articleUrl) {
      toast.error('Please provide either article content or a URL')
      return
    }
    setIsSubmitting(true)
    let loadingToast: string | undefined
    try {
      // Auto-fetch if URL provided but content empty
      if (articleUrl && !articleContent.trim()) {
        loadingToast = toast.loading('Fetching article content from URL...')
        try {
          const fetchResponse = await fetch('/api/articles/fetch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: articleUrl }),
          })
          if (fetchResponse.ok) {
            const fetchData = await fetchResponse.json()
            setArticleTitle(fetchData.title)
            setArticleContent(fetchData.content)
            toast.dismiss(loadingToast)
            toast.success('Successfully fetched article content!')
          } else {
            toast.dismiss(loadingToast)
            toast.error('Unable to fetch content from URL. Please enter content manually.')
            setIsSubmitting(false)
            return
          }
        } catch {
          toast.dismiss(loadingToast)
          toast.error('Unable to fetch content from URL. Please enter content manually.')
          setIsSubmitting(false)
          return
        }
      }

      loadingToast = toast.loading('Creating article and translating to Traditional Chinese...')
      const response = await fetch('/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: articleTitle,
          content: articleContent,
          url: articleUrl || undefined,
        }),
      })
      if (!response.ok) throw new Error('Failed to create article')
      const data = await response.json()
      toast.dismiss(loadingToast)
      toast.success('Article created!')
      router.push(`/articles/${data.articleId}`)
    } catch (e) {
      console.error(e)
      if (loadingToast) toast.dismiss(loadingToast)
      toast.error('Unable to create article')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: FIGMA_COLORS.surfaceBackground }}>
      {/* Header */}
      <div className="sticky top-0 z-10 backdrop-blur-md" style={{ background: 'rgba(255,252,249,0.6)', borderBottom: `1px solid ${FIGMA_COLORS.surfaceBorder}` }}>
        <div className="max-w-md mx-auto px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <Link href="/articles" className="w-10 h-10 rounded-full flex items-center justify-center" style={{ border: `1px solid ${FIGMA_COLORS.surfaceBorder}`, color: FIGMA_COLORS.textPrimary }} aria-label="Back to articles">
              <span className="text-lg">←</span>
            </Link>
            <div className="text-center flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-[#FFEFD8]">
                <span>🆕</span>
                <span className="text-[14px] leading-[21px]" style={{ color: FIGMA_COLORS.textPrimary }}>Add Article</span>
              </div>
            </div>
            <div className="w-10 h-10" />
          </div>
        </div>
      </div>

      {/* Form Card */}
      <div className="max-w-md mx-auto px-4 py-6 pb-24 sm:px-6">
        <Card className="bg-white border-0 shadow-lg rounded-[20px] overflow-hidden">
          <div className="p-6">
            <h1 className="text-xl font-semibold mb-2" style={{ color: FIGMA_COLORS.textPrimary }}>Add new article</h1>
            <p className="mb-6" style={{ color: FIGMA_COLORS.textSecondary }}>Paste a URL or enter content below. We’ll translate to Traditional Chinese.</p>

            <div className="space-y-5">
              {/* URL */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: FIGMA_COLORS.textPrimary }}>Article URL</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={articleUrl}
                    onChange={(e) => setArticleUrl(e.target.value)}
                    placeholder="https://example.com/article"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-3 border rounded-[10px] focus:outline-none placeholder:text-[#757575] text-[#757575]"
                    style={{ borderColor: FIGMA_COLORS.surfaceBorder }}
                  />
                  <button
                    onClick={fetchFromUrl}
                    disabled={isFetchingUrl || !articleUrl || isSubmitting}
                    className="px-4 rounded-[10px]"
                    style={{ backgroundColor: FIGMA_COLORS.buttonBg, color: FIGMA_COLORS.buttonText }}
                  >
                    {isFetchingUrl ? 'Fetching…' : 'Fetch'}
                  </button>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: FIGMA_COLORS.textPrimary }}>Title *</label>
                <input
                  type="text"
                  value={articleTitle}
                  onChange={(e) => setArticleTitle(e.target.value)}
                  placeholder="Enter article title"
                  disabled={isSubmitting}
                  className="w-full px-4 py-3 border rounded-[10px] focus:outline-none placeholder:text-[#757575] text-[#757575]"
                  style={{ borderColor: FIGMA_COLORS.surfaceBorder }}
                />
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: FIGMA_COLORS.textPrimary }}>Content *</label>
                <textarea
                  value={articleContent}
                  onChange={(e) => setArticleContent(e.target.value)}
                  placeholder="Paste or type English article content..."
                  rows={10}
                  disabled={isSubmitting}
                  className="w-full px-4 py-3 border rounded-[10px] focus:outline-none placeholder:text-[#757575] text-[#757575]"
                  style={{ borderColor: FIGMA_COLORS.surfaceBorder }}
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3">
                <Link
                  href="/articles"
                  className="px-5 py-2 rounded-[8px] border"
                  style={{ borderColor: FIGMA_COLORS.surfaceBorder, color: FIGMA_COLORS.textSecondary }}
                >
                  Cancel
                </Link>
                <Button
                  variant="Primary"
                  text={isSubmitting ? 'Creating…' : 'Create Article'}
                  onClick={handleCreate}
                  disabled={isSubmitting || !articleTitle || (!articleContent && !articleUrl)}
                  className="px-5 py-2 rounded-[8px]"
                  style={{ backgroundColor: FIGMA_COLORS.buttonBg, color: FIGMA_COLORS.buttonText }}
                />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 backdrop-blur-md" style={{ background: 'rgba(249,242,236,0.6)' }}>
        <div className="max-w-md mx-auto px-4 py-3 sm:px-6">
          <div className="flex items-center justify-around">
            <Link href="/dashboard" className="flex flex-col items-center justify-center px-5 py-2 rounded-[8px] h-[61px] text-[#6e6c66] hover:bg-white/60">
              <div className="text-2xl mb-1">🏠</div>
              <span className="text-[14px] leading-[21px]">Home</span>
            </Link>
            <Link href="/flashcards" className="flex flex-col items-center justify-center px-5 py-2 rounded-[8px] h-[61px] text-[#6e6c66] hover:bg-white/60">
              <div className="text-2xl mb-1">📚</div>
              <span className="text-[14px] leading-[21px]">Cards</span>
            </Link>
            <Link href="/chat" className="flex flex-col items-center justify-center px-5 py-2 rounded-[8px] h-[61px] text-[#6e6c66] hover:bg-white/60">
              <div className="text-2xl mb-1">💬</div>
              <span className="text-[14px] leading-[21px]">Chat</span>
            </Link>
            <Link href="/articles" className="flex flex-col items-center justify-center px-5 py-2 rounded-[8px] h-[61px] bg-white text-[#6e6c66]">
              <div className="text-2xl mb-1">📖</div>
              <span className="text-[14px] leading-[21px]">Articles</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}


