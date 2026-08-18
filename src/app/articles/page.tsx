"use client"

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/supabase/use-user'
import { toast } from 'sonner'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ShimmeringText } from '@/components/ui/shimmering-text'
import { createClient } from '@/lib/supabase/client'
import { listArticles, deleteArticle } from '@/lib/data/articles'
import { displayStatus, type GenerationStatus } from '@/lib/generation'
import { usePollWhilePending } from '@/lib/hooks/use-poll-while-pending'

interface Article {
  id: string
  title: string
  sourceUrl?: string | null
  // An article row exists from the moment it is submitted; translation fills
  // in the content afterwards.
  status: GenerationStatus
  errorMessage: string | null
  createdAt: string
  updatedAt: string
}

export default function ArticlesPage() {
  const router = useRouter()
  const { user: session, status } = useUser()
  const [articles, setArticles] = useState<Article[]>([])
  // Only the first load takes the screen over — polling refetches stay silent
  // so the list doesn't flash away every few seconds.
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const fetchArticles = useCallback(async () => {
    try {
      const articleList = await listArticles(createClient())
      setArticles(articleList)
    } catch (error) {
      console.error('獲取文章失敗:', error)
      toast.error('Unable to load articles')
    } finally {
      setIsInitialLoad(false)
    }
  }, [])

  // Auth and data load
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }
    if (status === 'authenticated') {
      fetchArticles()
    }
  }, [status, router, fetchArticles])

  // Keep articles that are still translating up to date without the user acting
  usePollWhilePending(articles, fetchArticles)

  const handleDeleteArticle = async (articleId: string) => {
    try {
      await deleteArticle(createClient(), articleId)
      // The row disappearing from the list is the confirmation
      await fetchArticles()
    } catch (error) {
      console.error('刪除文章失敗:', error)
      toast.error('Unable to delete article')
    }
  }

  // Loading state (match flashcards vibe)
  if (status === 'loading' || isInitialLoad) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 bg-white/70 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-2xl">📖</span>
          </div>
          <p className="text-lg font-medium text-muted-foreground">Loading articles...</p>
        </div>
      </div>
    )
  }

  if (!session) return null

  return (
    <div className="min-h-screen bg-background">
      {/* Main content */}
      <div className="max-w-md mx-auto px-4 py-6 pb-24 sm:px-6">
        {/* Empty state or list */}
        {articles.length === 0 ? (
          <Card className="border-0 ring-0 shadow-lg rounded-xl overflow-hidden py-0">
            <div className="p-8 text-center">
              <div className="mb-6">
                <div className="w-32 h-32 bg-white/70 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <span className="text-6xl">📖</span>
                </div>
              </div>
              <h2 className="text-xl font-semibold mb-2 text-foreground">No articles yet</h2>
              <p className="mb-6 text-muted-foreground">Add your first article to start reading with Cantonese translations.</p>
              <Button
                onClick={() => router.push('/articles/new')}
                className="font-medium px-8"
              >
                Add article
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-6">
            {articles.map((article) => {
              // An article is listed as soon as it is submitted; translation
              // runs in the background and fills the content in.
              const state = displayStatus(article)
              const isReady = state === 'ready'
              return (
              <Card key={article.id} className="border-0 ring-0 shadow-[0_1px_3px_0_rgba(0,0,0,0.12)] hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 rounded-xl overflow-hidden relative py-0">
                {/* Menu/Delete button */}
                <div className="absolute top-4 right-4 z-20">
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation()
                      setPendingDeleteId(article.id)
                    }}
                    className="text-muted-foreground hover:bg-white"
                    aria-label="Delete article"
                    title="Delete article"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14zM10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </Button>
                </div>

                <div className="p-6">
                  <h3 lang="zh-HK" className="text-[16px] leading-[24px] font-medium mb-1 text-foreground">{article.title}</h3>
                  {article.sourceUrl && (
                    <p className="text-[14px] leading-[21px] mb-2 truncate text-muted-foreground">
                      📎 {(() => { try { return new URL(article.sourceUrl!).hostname } catch { return article.sourceUrl } })()}
                    </p>
                  )}
                  {state === 'pending' ? (
                    <ShimmeringText
                      text="Translating…"
                      className="text-[14px] leading-[21px] mb-6 block"
                    />
                  ) : state === 'failed' ? (
                    <p className="text-[14px] leading-[21px] mb-6 text-muted-foreground">
                      Couldn&apos;t translate this article. Delete it and try again.
                    </p>
                  ) : (
                    <p className="text-[14px] leading-[21px] mb-6 text-muted-foreground">
                      Created on {new Date(article.createdAt).toLocaleDateString('en-US')}
                    </p>
                  )}
                  <Button
                    onClick={() => router.push(`/articles/${article.id}`)}
                    disabled={!isReady}
                    className="w-fit"
                  >
                    Start reading
                  </Button>
                </div>
              </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!pendingDeleteId} onOpenChange={(open) => !open && setPendingDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete article</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this article?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDeleteId) handleDeleteArticle(pendingDeleteId)
                setPendingDeleteId(null)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
