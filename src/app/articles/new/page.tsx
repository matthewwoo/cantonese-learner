"use client"

import { useEffect, useState } from 'react'
import { useUser } from '@/lib/supabase/use-user'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

export default function NewArticlePage() {
  const { user: session, status } = useUser()
  const router = useRouter()

  const [articleUrl, setArticleUrl] = useState('')
  const [articleTitle, setArticleTitle] = useState('')
  const [articleContent, setArticleContent] = useState('')
  const [isFetchingUrl, setIsFetchingUrl] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const wordCount = articleContent.trim()
    ? articleContent.trim().split(/\s+/).length
    : 0

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 bg-white/70 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-2xl">📖</span>
          </div>
          <p className="text-lg font-medium text-muted-foreground">Loading…</p>
        </div>
      </div>
    )
  }

  if (!session) return null

  const notifyTruncated = (maxChars?: number) => {
    const limit = maxChars ? `${Math.round(maxChars / 1000)}k characters` : 'the length limit'
    toast.warning(`This article is long — only the first ${limit} were imported.`)
  }

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
      if (data.truncated) notifyTruncated(data.maxChars)
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
    try {
      // Track the payload in locals. setState is async, so the auto-fetch below
      // cannot read the fetched content back out of `articleContent` in this
      // same closure — doing so posted an empty body and always 400'd.
      let title = articleTitle
      let content = articleContent

      // Auto-fetch if URL provided but content empty
      if (articleUrl && !content.trim()) {
        try {
          const fetchResponse = await fetch('/api/articles/fetch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: articleUrl }),
          })
          if (!fetchResponse.ok) throw new Error('Fetch failed')
          const fetchData = await fetchResponse.json()
          title = fetchData.title || title
          content = fetchData.content
          setArticleTitle(title)
          setArticleContent(content)
          if (fetchData.truncated) notifyTruncated(fetchData.maxChars)
        } catch {
          toast.error('Unable to fetch content from URL. Please enter content manually.')
          setIsSubmitting(false)
          return
        }
      }

      const response = await fetch('/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content,
          url: articleUrl || undefined,
        }),
      })
      if (!response.ok) throw new Error('Failed to create article')
      await response.json()

      // The article exists but is still being translated. Send the user to the
      // list, where its placeholder card is waiting — the reader would only
      // show them an empty page until the background job lands.
      router.push('/articles')
    } catch (e) {
      console.error(e)
      toast.error('Unable to create article')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Back lives in the global TopHeader */}

      {/* Form Card */}
      <div className="max-w-md mx-auto px-4 py-6 pb-24 sm:px-6">
        <Card className="border-0 ring-0 shadow-lg rounded-xl overflow-hidden py-0">
          <div className="p-6">
            <h1 className="text-xl font-semibold mb-2 text-foreground">Add new article</h1>
            <p className="mb-6 text-muted-foreground">Paste a URL or enter content below. We’ll translate it to Cantonese in the background — your article appears in the list right away.</p>

            <div className="space-y-5">
              {/* URL */}
              <div>
                <Label htmlFor="article-url" className="mb-2 text-foreground">Article URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="article-url"
                    type="url"
                    value={articleUrl}
                    onChange={(e) => setArticleUrl(e.target.value)}
                    placeholder="https://example.com/article"
                    disabled={isSubmitting}
                    className="flex-1"
                  />
                  <Button
                    onClick={fetchFromUrl}
                    disabled={isFetchingUrl || !articleUrl || isSubmitting}
                    className="px-4"
                  >
                    {isFetchingUrl ? 'Fetching…' : 'Fetch'}
                  </Button>
                </div>
              </div>

              {/* Title */}
              <div>
                <Label htmlFor="article-title" className="mb-2 text-foreground">Title *</Label>
                <Input
                  id="article-title"
                  type="text"
                  value={articleTitle}
                  onChange={(e) => setArticleTitle(e.target.value)}
                  placeholder="Enter article title"
                  disabled={isSubmitting}
                  className="w-full"
                />
              </div>

              {/* Content */}
              <div>
                <Label htmlFor="article-content" className="mb-2 text-foreground">Content *</Label>
                {/* The Textarea sets `field-sizing-content`, so it grows to fit
                    its value and ignores `rows`. A fetched article would stretch
                    it to thousands of pixels and push the form off screen, so
                    cap it and let the rest scroll inside the field. */}
                <Textarea
                  id="article-content"
                  value={articleContent}
                  onChange={(e) => setArticleContent(e.target.value)}
                  placeholder="Paste or type English article content..."
                  disabled={isSubmitting}
                  className="w-full min-h-48 max-h-96 overflow-y-auto"
                />
                {wordCount > 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {wordCount.toLocaleString()} words — scroll inside the box to read the rest.
                    Trim anything you don&apos;t want translated.
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3">
                <Button asChild variant="outline" className="text-muted-foreground">
                  <Link href="/articles">Cancel</Link>
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={isSubmitting || !articleTitle || (!articleContent && !articleUrl)}
                >
                  {isSubmitting ? 'Creating…' : 'Create Article'}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/60 backdrop-blur-md">
        <div className="max-w-md mx-auto px-4 py-3 sm:px-6">
          <div className="flex items-center justify-around">
            <Link href="/dashboard" className="flex flex-col items-center justify-center px-5 py-2 rounded-sm h-[61px] text-muted-foreground hover:bg-white/60">
              <div className="text-2xl mb-1">🏠</div>
              <span className="text-[14px] leading-[21px]">Home</span>
            </Link>
            <Link href="/flashcards" className="flex flex-col items-center justify-center px-5 py-2 rounded-sm h-[61px] text-muted-foreground hover:bg-white/60">
              <div className="text-2xl mb-1">📚</div>
              <span className="text-[14px] leading-[21px]">Cards</span>
            </Link>
            <Link href="/chat" className="flex flex-col items-center justify-center px-5 py-2 rounded-sm h-[61px] text-muted-foreground hover:bg-white/60">
              <div className="text-2xl mb-1">💬</div>
              <span className="text-[14px] leading-[21px]">Chat</span>
            </Link>
            <Link href="/articles" className="flex flex-col items-center justify-center px-5 py-2 rounded-sm h-[61px] bg-white text-muted-foreground">
              <div className="text-2xl mb-1">📖</div>
              <span className="text-[14px] leading-[21px]">Articles</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
