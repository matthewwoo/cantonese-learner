// src/components/flashcards/UploadForm.tsx
// Component for creating a flashcard set with AI-generated cards

"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardAction } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/shared/spinner"
import { toast } from "sonner"

// Props for the UploadForm component
interface UploadFormProps {
  onUploadSuccess?: () => void // Callback when generation succeeds
  onClose?: () => void // Callback to close the form
}

export default function UploadForm({ onUploadSuccess, onClose }: UploadFormProps) {
  const [setName, setSetName] = useState("") // Name of the flashcard set
  const [isLoading, setIsLoading] = useState(false) // Only until the deck row exists
  // English words to seed the deck with — the AI supplies the Cantonese
  const [words, setWords] = useState<string[]>([])

  const updateWord = (index: number, value: string) => {
    setWords(words.map((w, i) => (i === index ? value : w)))
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!setName.trim()) {
      toast.error("Please enter a set name")
      return
    }

    setIsLoading(true)
    try {
      const cleanedWords = words.map(w => w.trim()).filter(Boolean)

      const response = await fetch('/api/flashcards/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: setName.trim(),
          count: 100,
          words: cleanedWords.length > 0 ? cleanedWords : undefined,
        })
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate deck')
      }

      // The deck row now exists as a placeholder; the cards themselves are
      // still being generated server-side. Hand the user back to the list,
      // where that placeholder is waiting, instead of holding them here.
      setSetName("")
      setWords([])
      onUploadSuccess?.()
    } catch (error) {
      console.error("Generate error:", error)
      toast.error(error instanceof Error ? error.message : "Generation failed")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="border-0 shadow-lg overflow-hidden [--card-spacing:--spacing(6)]">
      {/* Header */}
      <CardHeader>
        <CardTitle className="text-[24px] leading-[1.2] font-semibold text-foreground">
          Create new deck
        </CardTitle>
        {onClose && (
          <CardAction>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-full text-muted-foreground hover:bg-background"
              aria-label="Close"
            >
              ✕
            </Button>
          </CardAction>
        )}
        <Separator className="mt-3 col-span-full" />
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Set Name */}
          <div className="py-5">
            <Label
              htmlFor="set-name"
              className="text-[14px] leading-[21px] font-normal text-muted-foreground mb-2"
            >
              Set Name *
            </Label>
            <div className="relative">
              <Input
                id="set-name"
                type="text"
                placeholder="e.g., Daily Conversations"
                value={setName}
                onChange={(e) => setSetName(e.target.value)}
                required
                className="h-12 px-3 rounded-sm bg-card text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>

          {/* Seed words — English in, Cantonese out */}
          <div className="py-5">
            <Label className="text-[14px] leading-[21px] font-normal text-muted-foreground mb-2">
              Words to Include (Optional)
            </Label>
            <div className="rounded-md p-4 space-y-3 bg-background border border-border">
              <p className="text-xs text-muted-foreground">
                Add English words and we&apos;ll translate them into Cantonese for the deck. Leave empty to let AI choose.
              </p>
              {words.length === 0 && (
                <div className="text-xs text-muted-foreground">No words added.</div>
              )}
              {words.map((word, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="English word (e.g., thank you)"
                    value={word}
                    onChange={(e) => updateWord(idx, e.target.value)}
                    className="h-10 px-3 rounded-sm bg-card text-foreground placeholder:text-muted-foreground"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setWords(words.filter((_, i) => i !== idx))}
                    className="h-10 rounded-sm text-muted-foreground hover:bg-secondary"
                    aria-label={`Remove word ${idx + 1}`}
                  >
                    ✕
                  </Button>
                </div>
              ))}
              <div className="flex">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setWords([...words, ''])}
                >
                  Add word
                </Button>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="space-y-2">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Spinner size="sm" tone="inverse" />}
              {isLoading ? 'Creating…' : 'Generate Deck'}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              100 cards and a deck image are generated in the background. Your deck
              appears right away and fills in as it finishes — you can keep using the app.
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
