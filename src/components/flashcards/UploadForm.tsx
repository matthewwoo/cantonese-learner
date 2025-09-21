// src/components/flashcards/UploadForm.tsx
// Component for uploading CSV files and creating flashcard sets

"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Card } from "@/components/ui/Card"
import { toast } from "react-hot-toast"

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
    if (!csvFile) {
      toast.error("Please select a CSV file")
      return
    }

    setIsLoading(true)

    try {
      // Parse the full CSV file
      const content = await csvFile.text()
      const flashcards = parseCSV(content)

      // Send data to API
      const response = await fetch('/api/flashcards/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: setName.trim(),
          flashcards,
          imageUrl: generatedImage?.url || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed')
      }

      // Success! Reset form and notify parent
      toast.success(`Successfully uploaded ${flashcards.length} flashcards!`)
      
      // Reset form state
      setSetName("")
      setCsvFile(null)
      setPreviewData([])
      setGeneratedImage(null)
      setShowImageGeneration(false)
      
      // Reset file input
      const fileInput = document.getElementById('csv-file') as HTMLInputElement
      if (fileInput) fileInput.value = ''

      // Call success callback if provided
      onUploadSuccess?.()

    } catch (error) {
      console.error("Upload error:", error)
      toast.error(error instanceof Error ? error.message : "Upload failed")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="bg-white border-0 shadow-lg rounded-[20px] overflow-hidden">
      <div className="p-6">
        {/* Header */}
        <div className="relative mb-4">
          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-0 right-0 w-8 h-8 rounded-full flex items-center justify-center text-[#6e6c66] hover:bg-[#f9f2ec] transition-colors"
              aria-label="Close"
            >
              ✕
            </button>
          )}
          <h2 className="text-[24px] leading-[1.2] font-semibold text-[#1e1e1e] font-['Inter']">Create new deck</h2>
          <div className="mt-3 border-t" style={{ borderColor: '#f2e2c4' }} />
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Set Name */}
          <div className="py-5">
            <label className="block text-[14px] leading-[21px] text-[#7d7a74] mb-2">Set Name *</label>
            <div className="relative">
              <Input
                type="text"
                placeholder="e.g., Daily Conversations"
                value={setName}
                onChange={(e) => setSetName(e.target.value)}
                required
                className="h-12 px-3 rounded-[8px] border bg-white text-[#171515] placeholder:text-[#7d7a74] focus:ring-[#171515] focus:border-[#171515]"
                style={{ borderColor: '#f9f2ec' }}
              />
            </div>
          </div>

          {/* CSV File - Custom control */}
          <div className="py-5">
            <label className="block text-[14px] leading-[21px] text-[#7d7a74] mb-2">CSV File *</label>
            <div className="bg-white relative flex items-center h-[62px] px-3 rounded-[8px]" style={{ border: '1px solid #f9f2ec' }}>
              <input
                id="csv-file"
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={openFilePicker}
                className="bg-[#5a5a5a] text-white text-[10px] leading-[14px] font-['Söhne'] font-medium px-2 py-1 rounded-[8px]"
              >
                Choose File
              </button>
              <div className="px-3 text-[14px] leading-[21px] text-[#171515] truncate">
                {csvFile ? csvFile.name : 'No file chosen'}
              </div>
            </div>
            <p className="text-xs text-[#7d7a74] mt-2">Maximum file size: 5MB</p>
          </div>

          {/* Sample CSV download */}
          <div className="py-5">
            <label className="block text-[14px] leading-[21px] text-[#7d7a74] mb-2">Sample CSV</label>
            <div className="bg-white relative flex items-center h-[62px] px-3 rounded-[8px]" style={{ border: '1px solid #f9f2ec' }}>
              <button
                type="button"
                onClick={downloadSampleCsv}
                className="bg-[#5a5a5a] text-white text-[10px] leading-[14px] font-['Söhne'] font-medium px-2 py-1 rounded-[8px]"
              >
                Download
              </button>
              <div className="px-3 text-[14px] leading-[21px] text-[#171515]">
                Get a template to format your cards
              </div>
            </div>
          </div>

          {/* Image Generation (optional) */}
          <div className="py-2">
            <label className="block text-[14px] leading-[21px] text-[#7d7a74] mb-2">Deck Image (Optional)</label>
            {!showImageGeneration ? (
              <Button
                type="button"
                variant="Secondary"
                text={isGeneratingImage ? 'Generating...' : 'Generate Image for Deck'}
                onClick={generateImage}
                disabled={isGeneratingImage || !setName.trim()}
                className="w-full bg-[#f5f5f5] hover:bg-[#e5e5e5] text-[#1e1e1e]"
              />
            ) : (
              <div className="space-y-3">
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="Secondary"
                    text="✕ Close"
                    onClick={() => {
                      setShowImageGeneration(false)
                      setGeneratedImage(null)
                    }}
                    className="bg-[#f5f5f5] hover:bg-[#e5e5e5] text-[#1e1e1e]"
                  />
                </div>

                {generatedImage ? (
                  <div className="rounded-[12px] p-3" style={{ backgroundColor: '#f9f2ec', border: '1px solid #f2e2c4' }}>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-[#171515] flex items-center">🖼️ Generated Image</h4>
                      <Button
                        type="button"
                        variant="Secondary"
                        text={isGeneratingImage ? 'Generating...' : 'Regenerate'}
                        onClick={regenerateImage}
                        disabled={isGeneratingImage}
                        className="text-sm bg-[#f5f5f5] hover:bg-[#e5e5e5] text-[#1e1e1e]"
                      />
                    </div>
                    <div className="relative">
                      <img
                        src={generatedImage.url}
                        alt="Generated deck image"
                        className="w-full h-48 object-cover rounded-[8px]"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                          const fallback = document.createElement('div')
                          fallback.className = 'w-full h-48 rounded-[8px] flex items-center justify-center text-[#7d7a74]'
                          fallback.innerHTML = '🖼️ Image failed to load'
                          e.currentTarget.parentNode?.appendChild(fallback)
                        }}
                      />
                    </div>
                    <p className="text-xs text-[#6e6c66] mt-2 italic">"{generatedImage.prompt}"</p>
                  </div>
                ) : (
                  <div className="rounded-[12px] p-4 text-center" style={{ backgroundColor: '#f9f2ec', border: '1px solid #f2e2c4' }}>
                    <p className="text-[#6e6c66]">No image generated yet</p>
                  </div>
                )}

                {isGeneratingImage && !generatedImage && (
                  <div className="rounded-[12px] p-6 text-center" style={{ backgroundColor: '#f9f2ec', border: '1px solid #f2e2c4' }}>
                    <div className="w-16 h-16 bg-[#FFEFD8] rounded-full flex items-center justify-center mx-auto mb-3 animate-pulse">
                      <span className="text-2xl">🎨</span>
                    </div>
                    <p className="text-[#171515] font-medium">Generating your custom image...</p>
                    <p className="text-sm text-[#6e6c66] mt-1">This may take a few moments</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Preview */}
          {previewData.length > 0 && (
            <div className="rounded-[12px] p-4" style={{ backgroundColor: '#f9f2ec', border: '1px solid #f2e2c4' }}>
              <h3 className="font-medium text-[#171515] mb-3">Preview (first 3 cards)</h3>
              <div className="space-y-3">
                {previewData.map((card, index) => (
                  <div key={index} className="bg-white p-3 rounded-[8px]" style={{ border: '1px solid #f2e2c4' }}>
                    <div className="grid grid-cols-1 gap-2 text-[14px] leading-[21px]">
                      <div className="flex items-center">
                        <span className="text-[#7d7a74] w-24">Chinese:</span>
                        <span className="text-[#171515]">{card.chineseWord}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-[#7d7a74] w-24">English:</span>
                        <span className="text-[#171515]">{card.englishTranslation}</span>
                      </div>
                      {card.pronunciation && (
                        <div className="flex items-center">
                          <span className="text-[#7d7a74] w-24">Pronunciation:</span>
                          <span className="text-[#171515]">{card.pronunciation}</span>
                        </div>
                      )}
                      {card.exampleSentenceEnglish && (
                        <div className="flex items-start">
                          <span className="text-[#7d7a74] w-24 mt-1">Example (EN):</span>
                          <span className="text-[#171515]">{card.exampleSentenceEnglish}</span>
                        </div>
                      )}
                      {card.exampleSentenceChinese && (
                        <div className="flex items-start">
                          <span className="text-[#7d7a74] w-24 mt-1">Example (CN):</span>
                          <span className="text-[#171515]">{card.exampleSentenceChinese}</span>
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
            variant="Primary"
            text={isLoading ? 'Saving...' : 'Save'}
            className="w-full"
            disabled={isLoading || !csvFile}
          />
        </form>
      </div>
    </Card>
  )
}