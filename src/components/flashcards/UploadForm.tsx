// src/components/flashcards/UploadForm.tsx
// Component for uploading CSV files and creating flashcard sets

"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardAction } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/shared/spinner"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { createSetWithCards } from "@/lib/data/flashcards"

// Define the structure of a single flashcard
interface Flashcard {
  chineseWord: string
  englishTranslation: string
  pronunciation?: string
  exampleSentenceEnglish?: string
  exampleSentenceChinese?: string
}

// Define the structure for generated image
interface GeneratedImage {
  url: string
  prompt: string
}

// Props for the UploadForm component
interface UploadFormProps {
  onUploadSuccess?: () => void // Callback when upload succeeds
  onClose?: () => void // Callback to close the form
}

export default function UploadForm({ onUploadSuccess, onClose }: UploadFormProps) {
  // State for form inputs
  const [setName, setSetName] = useState("") // Name of the flashcard set
  const [csvFile, setCsvFile] = useState<File | null>(null) // The uploaded CSV file
  const [isLoading, setIsLoading] = useState(false) // Loading state during upload
  const [previewData, setPreviewData] = useState<Flashcard[]>([]) // Preview of parsed CSV
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  // Mode: upload CSV vs generate with AI
  const [mode, setMode] = useState<'upload' | 'generate'>('upload')
  // Seed words for AI generation
  const [seedWords, setSeedWords] = useState<{ traditional: string; jyutping: string }[]>([])
  
  // State for image generation
  const [generatedImage, setGeneratedImage] = useState<GeneratedImage | null>(null)
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)
  const [showImageGeneration, setShowImageGeneration] = useState(false)


  // Function to parse CSV file content into flashcard objects
  const parseCSV = (csvContent: string): Flashcard[] => {
    // Split content into lines and remove empty lines
    const lines = csvContent.split('\n').filter(line => line.trim())
    
    if (lines.length < 2) {
      throw new Error("CSV must have at least a header row and one data row")
    }

    // Get header row and convert to lowercase for flexible matching
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
    
    // Find the column indices for our required fields
    const chineseIndex = headers.findIndex(h => 
      h.includes('chinese') || h.includes('中文') || h.includes('word')
    )
    const englishIndex = headers.findIndex(h => 
      h.includes('english') || h.includes('translation') || h.includes('英文')
    )
    const pronunciationIndex = headers.findIndex(h => 
      h.includes('pronunciation') || h.includes('拼音') || h.includes('jyutping')
    )
    const exampleEnglishIndex = headers.findIndex(h => 
      h.includes('example') && h.includes('english') || h.includes('sentence') && h.includes('english')
    )
    const exampleChineseIndex = headers.findIndex(h => 
      h.includes('example') && h.includes('chinese') || h.includes('sentence') && h.includes('chinese') || h.includes('例句')
    )

    // Validate that we found the required columns
    if (chineseIndex === -1) {
      throw new Error("Could not find Chinese word column. Please include 'Chinese Word' or similar header.")
    }
    if (englishIndex === -1) {
      throw new Error("Could not find English translation column. Please include 'English Translation' or similar header.")
    }

    // Parse each data row into a flashcard object
    const flashcards: Flashcard[] = []
    
    for (let i = 1; i < lines.length; i++) {
      const columns = lines[i].split(',').map(col => col.trim().replace(/"/g, ''))
      
      // Skip empty rows
      if (columns.length < 2 || !columns[chineseIndex] || !columns[englishIndex]) {
        continue
      }

      flashcards.push({
        chineseWord: columns[chineseIndex],
        englishTranslation: columns[englishIndex],
        pronunciation: pronunciationIndex !== -1 ? columns[pronunciationIndex] || undefined : undefined,
        exampleSentenceEnglish: exampleEnglishIndex !== -1 ? columns[exampleEnglishIndex] || undefined : undefined,
        exampleSentenceChinese: exampleChineseIndex !== -1 ? columns[exampleChineseIndex] || undefined : undefined
      })
    }

    if (flashcards.length === 0) {
      throw new Error("No valid flashcards found in CSV file")
    }

    return flashcards
  }

  // Handle CSV file selection and preview
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) {
      setCsvFile(null)
      setPreviewData([])
      return
    }

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      toast.error("Please select a CSV file")
      return
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB")
      return
    }

    setCsvFile(file)

    try {
      // Read and parse the CSV file for preview
      const content = await file.text()
      const parsed = parseCSV(content)
      setPreviewData(parsed.slice(0, 3)) // Show first 3 cards as preview
      toast.success(`Successfully parsed ${parsed.length} flashcards`)
    } catch (error) {
      console.error("CSV parsing error:", error)
      toast.error(error instanceof Error ? error.message : "Error parsing CSV file")
      setCsvFile(null)
      setPreviewData([])
    }
  }

  // Trigger native file input
  const openFilePicker = () => {
    fileInputRef.current?.click()
  }

  // Download a sample CSV constructed from the example in the design
  const downloadSampleCsv = () => {
    const sample = `Chinese Word,English Translation,Pronunciation,Example Sentence (English),Example Sentence (Chinese)\n你好,Hello,nei5 hou2,Hello! How are you today?,你好！今日點樣？\n多謝,Thank you,do1 ze6,Thank you for your help,多謝你嘅幫助\n再見,Goodbye,zoi3 gin3,Goodbye! See you tomorrow!,再見！聽日見！`
    const blob = new Blob([sample], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'sample_flashcards.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Function to generate image for the deck
  const generateImage = async () => {
    if (!setName.trim()) {
      toast.error("Please enter a set name first")
      return
    }

    // Show the image generation section
    setShowImageGeneration(true)
    setIsGeneratingImage(true)

    try {
      const response = await fetch('/api/images/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: setName.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate image')
      }

      setGeneratedImage({
        url: data.imageUrl,
        prompt: data.prompt
      })
      toast.success("Image generated successfully!")
    } catch (error) {
      console.error("Image generation error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to generate image")
    } finally {
      setIsGeneratingImage(false)
    }
  }

  // Function to regenerate image
  const regenerateImage = () => {
    setGeneratedImage(null)
    generateImage()
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate required fields
    if (!setName.trim()) {
      toast.error("Please enter a set name")
      return
    }

    // Upload mode
    if (mode === 'upload') {
      if (!csvFile) {
        toast.error("Please select a CSV file")
        return
      }

      setIsLoading(true)

      try {
        const content = await csvFile.text()
        const flashcards = parseCSV(content)

        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Authentication required')

        await createSetWithCards(supabase, user.id, {
          name: setName.trim(),
          imageUrl: generatedImage?.url || null,
          flashcards,
        })

        toast.success(`Successfully uploaded ${flashcards.length} flashcards!`)
        
        setSetName("")
        setCsvFile(null)
        setPreviewData([])
        setGeneratedImage(null)
        setShowImageGeneration(false)
        setSeedWords([])
        setMode('upload')
        const fileInput = document.getElementById('csv-file') as HTMLInputElement
        if (fileInput) fileInput.value = ''
        onUploadSuccess?.()
      } catch (error) {
        console.error("Upload error:", error)
        toast.error(error instanceof Error ? error.message : "Upload failed")
      } finally {
        setIsLoading(false)
      }
      return
    }

    // Generate mode
    setIsLoading(true)
    try {
      const cleanedSeeds = seedWords
        .map(w => ({ traditional: w.traditional.trim(), jyutping: w.jyutping.trim() }))
        .filter(w => w.traditional && w.jyutping)

      const response = await fetch('/api/flashcards/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: setName.trim(),
          count: 100,
          seedWords: cleanedSeeds.length > 0 ? cleanedSeeds : undefined,
          imageUrl: generatedImage?.url || null,
        })
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate deck')
      }
      toast.success(`Successfully generated ${data?.flashcardSet?.flashcardCount ?? 100} flashcards!`)
      setSetName("")
      setCsvFile(null)
      setPreviewData(data?.previewCards || [])
      setGeneratedImage(null)
      setShowImageGeneration(false)
      setSeedWords([])
      setMode('upload')
      const fileInput = document.getElementById('csv-file') as HTMLInputElement
      if (fileInput) fileInput.value = ''
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
          {/* Mode Toggle */}
          <div className="py-2">
            <div className="inline-flex rounded-md overflow-hidden border border-border">
              <Button
                type="button"
                size="compact"
                variant={mode === 'upload' ? 'default' : 'ghost'}
                onClick={() => setMode('upload')}
                className="rounded-none px-4"
              >
                Upload CSV
              </Button>
              <Button
                type="button"
                size="compact"
                variant={mode === 'generate' ? 'default' : 'ghost'}
                onClick={() => setMode('generate')}
                className="rounded-none px-4"
              >
                Generate with AI
              </Button>
            </div>
          </div>
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

          {/* CSV File - Custom control (Upload mode only) */}
          {mode === 'upload' && (
            <div className="py-5">
              <Label
                htmlFor="csv-file"
                className="text-[14px] leading-[21px] font-normal text-muted-foreground mb-2"
              >
                CSV File *
              </Label>
              <div className="bg-card relative flex items-center h-[62px] px-3 rounded-sm border border-border">
                <input
                  id="csv-file"
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  size="xs"
                  onClick={openFilePicker}
                  className="bg-muted-foreground text-background hover:bg-muted-foreground/90"
                >
                  Choose File
                </Button>
                <div className="px-3 text-[14px] leading-[21px] text-foreground truncate">
                  {csvFile ? csvFile.name : 'No file chosen'}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Maximum file size: 5MB</p>
            </div>
          )}

          {/* Sample CSV download / CSV format helper */}
          {mode === 'upload' ? (
            <div className="py-5">
              <Label className="text-[14px] leading-[21px] font-normal text-muted-foreground mb-2">
                Sample CSV
              </Label>
              <div className="bg-card relative flex items-center h-[62px] px-3 rounded-sm border border-border">
                <Button
                  type="button"
                  size="xs"
                  onClick={downloadSampleCsv}
                  className="bg-muted-foreground text-background hover:bg-muted-foreground/90"
                >
                  Download
                </Button>
                <div className="px-3 text-[14px] leading-[21px] text-foreground">
                  Get a template to format your cards
                </div>
              </div>
            </div>
          ) : (
            <div className="py-5">
              <Label className="text-[14px] leading-[21px] font-normal text-muted-foreground mb-2">
                CSV Format Needed
              </Label>
              <div className="rounded-md p-4 bg-background border border-border">
                <p className="text-[14px] leading-[21px] text-foreground">
                  Chinese Word, English Translation, Pronunciation, Example Sentence (English), Example Sentence (Chinese)
                </p>
                <p className="text-xs text-muted-foreground mt-1">AI will generate 100 rows in this format using Traditional characters and Jyutping.</p>
              </div>
            </div>
          )}

          {/* Seed Words (Generate mode only) */}
          {mode === 'generate' && (
            <div className="py-5">
              <Label className="text-[14px] leading-[21px] font-normal text-muted-foreground mb-2">
                Cantonese Words (Optional)
              </Label>
              <div className="rounded-md p-4 space-y-3 bg-background border border-border">
                <p className="text-xs text-muted-foreground">Add Traditional characters and Jyutping to guide generation. Leave empty to let AI choose.</p>
                {seedWords.length === 0 && (
                  <div className="text-xs text-muted-foreground">No seed words added.</div>
                )}
                {seedWords.map((w, idx) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input
                      type="text"
                      placeholder="Traditional (e.g., 你好)"
                      value={w.traditional}
                      onChange={(e) => {
                        const next = [...seedWords]
                        next[idx] = { ...next[idx], traditional: e.target.value }
                        setSeedWords(next)
                      }}
                      className="h-10 px-3 rounded-sm bg-card text-foreground placeholder:text-muted-foreground"
                    />
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        placeholder="Jyutping (e.g., nei5 hou2)"
                        value={w.jyutping}
                        onChange={(e) => {
                          const next = [...seedWords]
                          next[idx] = { ...next[idx], jyutping: e.target.value }
                          setSeedWords(next)
                        }}
                        className="h-10 px-3 rounded-sm bg-card text-foreground placeholder:text-muted-foreground"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setSeedWords(seedWords.filter((_, i) => i !== idx))}
                        className="h-10 rounded-sm text-muted-foreground hover:bg-secondary"
                        aria-label="Remove seed word"
                      >
                        ✕
                      </Button>
                    </div>
                  </div>
                ))}
                <div className="flex">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setSeedWords([...seedWords, { traditional: '', jyutping: '' }])}
                  >
                    Add word
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Image Generation (optional) */}
          <div className="py-2">
            <Label className="text-[14px] leading-[21px] font-normal text-muted-foreground mb-2">
              Deck Image (Optional)
            </Label>
            {!showImageGeneration ? (
              <Button
                type="button"
                variant="secondary"
                onClick={generateImage}
                disabled={isGeneratingImage || !setName.trim()}
                className="w-full"
              >
                {isGeneratingImage && <Spinner size="sm" />}
                {isGeneratingImage ? 'Generating...' : 'Generate Image for Deck'}
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setShowImageGeneration(false)
                      setGeneratedImage(null)
                    }}
                  >
                    ✕ Close
                  </Button>
                </div>

                {generatedImage ? (
                  <div className="rounded-md p-3 bg-background border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-foreground flex items-center">🖼️ Generated Image</h4>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={regenerateImage}
                        disabled={isGeneratingImage}
                        className="text-sm"
                      >
                        {isGeneratingImage && <Spinner size="sm" />}
                        {isGeneratingImage ? 'Generating...' : 'Regenerate'}
                      </Button>
                    </div>
                    <div className="relative">
                      <img
                        src={generatedImage.url}
                        alt="Generated deck image"
                        className="w-full h-48 object-cover rounded-sm"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                          const fallback = document.createElement('div')
                          fallback.className = 'w-full h-48 rounded-sm flex items-center justify-center text-muted-foreground'
                          fallback.innerHTML = '🖼️ Image failed to load'
                          e.currentTarget.parentNode?.appendChild(fallback)
                        }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 italic">"{generatedImage.prompt}"</p>
                  </div>
                ) : (
                  <div className="rounded-md p-4 text-center bg-background border border-border">
                    <p className="text-muted-foreground">No image generated yet</p>
                  </div>
                )}

                {isGeneratingImage && !generatedImage && (
                  <div className="rounded-md p-6 text-center bg-background border border-border">
                    <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-3 animate-pulse">
                      <span className="text-2xl">🎨</span>
                    </div>
                    <p className="text-foreground font-medium">Generating your custom image...</p>
                    <p className="text-sm text-muted-foreground mt-1">This may take a few moments</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Preview */}
          {previewData.length > 0 && (
            <div className="rounded-md p-4 bg-background border border-border">
              <h3 className="font-medium text-foreground mb-3">Preview (first 3 cards)</h3>
              <div className="space-y-3">
                {previewData.map((card, index) => (
                  <div key={index} className="bg-card p-3 rounded-sm border border-border">
                    <div className="grid grid-cols-1 gap-2 text-[14px] leading-[21px]">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="w-24 shrink-0 justify-start">Chinese:</Badge>
                        <span className="text-foreground">{card.chineseWord}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="w-24 shrink-0 justify-start">English:</Badge>
                        <span className="text-foreground">{card.englishTranslation}</span>
                      </div>
                      {card.pronunciation && (
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="w-24 shrink-0 justify-start">Pronunciation:</Badge>
                          <span className="text-foreground">{card.pronunciation}</span>
                        </div>
                      )}
                      {card.exampleSentenceEnglish && (
                        <div className="flex items-start gap-2">
                          <Badge variant="secondary" className="w-24 shrink-0 justify-start mt-0.5">Example (EN):</Badge>
                          <span className="text-foreground">{card.exampleSentenceEnglish}</span>
                        </div>
                      )}
                      {card.exampleSentenceChinese && (
                        <div className="flex items-start gap-2">
                          <Badge variant="secondary" className="w-24 shrink-0 justify-start mt-0.5">Example (CN):</Badge>
                          <span className="text-foreground">{card.exampleSentenceChinese}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Submit */}
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || (mode === 'upload' && !csvFile)}
          >
            {isLoading && <Spinner size="sm" tone="inverse" />}
            {isLoading ? (mode === 'upload' ? 'Saving...' : 'Generating...') : (mode === 'upload' ? 'Save' : 'Generate Deck')}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}