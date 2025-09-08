// src/components/flashcards/UploadForm.tsx
// Component for uploading CSV files and creating flashcard sets

"use client"

import { useState } from "react"
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
    <Card className="bg-white border-0 shadow-lg rounded-2xl overflow-hidden">
      <div className="p-6">
        <div className="text-center mb-6 relative">
          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-0 right-0 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 hover:text-gray-800 transition-colors duration-200"
            >
              ✕
            </button>
          )}
          <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">📤</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">上傳閃卡 Upload Flashcards</h2>
          <p className="text-gray-600">
            Upload a CSV file with your Cantonese flashcards. Required columns: Chinese Word, English Translation
          </p>
        </div>

        {/* CSV Format Instructions */}
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-6">
          <h3 className="font-semibold text-purple-900 mb-3 flex items-center">
            <span className="text-lg mr-2">📋</span>
            CSV Format Example:
          </h3>
          <div className="bg-white rounded-lg p-3 border border-purple-100">
            <pre className="text-xs sm:text-sm text-purple-800 overflow-x-auto whitespace-pre-wrap">
{`Chinese Word,English Translation,Pronunciation,Example Sentence (English),Example Sentence (Chinese)
你好,Hello,nei5 hou2,Hello! How are you today?,你好！今日點樣？
多謝,Thank you,do1 ze6,Thank you for your help,多謝你嘅幫助
再見,Goodbye,zoi3 gin3,Goodbye! See you tomorrow!,再見！聽日見！`}
            </pre>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Set Information */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Set Name *
            </label>
            <Input
              type="text"
              placeholder="e.g., Daily Conversations"
              value={setName}
              onChange={(e) => setSetName(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors duration-200"
            />
          </div>

          {/* Image Generation */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Deck Image (Optional)
            </label>
            
            {!showImageGeneration ? (
              <Button
                type="button"
                variant="Secondary"
                text={isGeneratingImage ? "Generating..." : "Generate Image for Deck"}
                onClick={generateImage}
                disabled={isGeneratingImage || !setName.trim()}
                className="w-full bg-purple-100 hover:bg-purple-200 text-purple-700 font-medium py-3 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            ) : (
              <div className="space-y-4">
                {/* Close Button */}
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="Secondary"
                    text="✕ Close"
                    onClick={() => {
                      setShowImageGeneration(false)
                      setGeneratedImage(null)
                    }}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-3 rounded-lg transition-colors duration-200"
                  />
                </div>


                {/* Generated Image Preview */}
                {generatedImage ? (
                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-purple-900 flex items-center">
                        <span className="text-lg mr-2">🖼️</span>
                        Generated Image
                      </h4>
                      <Button
                        type="button"
                        variant="Secondary"
                        text={isGeneratingImage ? "Generating..." : "Regenerate"}
                        onClick={regenerateImage}
                        disabled={isGeneratingImage}
                        className="text-sm bg-purple-100 hover:bg-purple-200 text-purple-700 font-medium py-2 px-3 rounded-lg transition-colors duration-200 disabled:opacity-50"
                      />
                    </div>
                    
                    <div className="relative">
                      <img
                        src={generatedImage.url}
                        alt="Generated deck image"
                        className="w-full h-48 object-cover rounded-lg border border-purple-100"
                        onError={(e) => {
                          // Show a fallback message
                          e.currentTarget.style.display = 'none'
                          const fallback = document.createElement('div')
                          fallback.className = 'w-full h-48 bg-purple-100 rounded-lg border border-purple-200 flex items-center justify-center text-purple-600'
                          fallback.innerHTML = '🖼️ Image failed to load'
                          e.currentTarget.parentNode?.appendChild(fallback)
                        }}
                      />
                      <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-full p-1">
                        <span className="text-xs text-gray-600">✨</span>
                      </div>
                    </div>
                    
                    <p className="text-xs text-purple-700 mt-2 italic">
                      "{generatedImage.prompt}"
                    </p>
                  </div>
                ) : (
                  <div className="bg-gray-100 border border-gray-200 rounded-lg p-4 text-center">
                    <p className="text-gray-600">No image generated yet</p>
                  </div>
                )}

                {/* Loading State */}
                {isGeneratingImage && !generatedImage && (
                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-6 text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-200 to-purple-300 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                      <span className="text-2xl">🎨</span>
                    </div>
                    <p className="text-purple-700 font-medium">Generating your custom image...</p>
                    <p className="text-sm text-purple-600 mt-1">This may take a few moments</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              CSV File *
            </label>
            <div className="relative">
              <Input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors duration-200 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
              />
            </div>
            <p className="text-xs text-gray-500 mt-2 flex items-center">
              <span className="mr-1">📁</span>
              Maximum file size: 5MB
            </p>
          </div>

          {/* Preview */}
          {previewData.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <h3 className="font-semibold text-green-900 mb-4 flex items-center">
                <span className="text-lg mr-2">👀</span>
                Preview (first 3 cards):
              </h3>
              <div className="space-y-3">
                {previewData.map((card, index) => (
                  <div key={index} className="bg-white p-4 rounded-lg border border-green-100 shadow-sm">
                    <div className="grid grid-cols-1 gap-2 text-xs sm:text-sm">
                      <div className="flex items-center">
                        <span className="font-semibold text-gray-700 w-20">Chinese:</span>
                        <span className="text-gray-900">{card.chineseWord}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="font-semibold text-gray-700 w-20">English:</span>
                        <span className="text-gray-900">{card.englishTranslation}</span>
                      </div>
                      {card.pronunciation && (
                        <div className="flex items-center">
                          <span className="font-semibold text-gray-700 w-20">Pronunciation:</span>
                          <span className="text-gray-900">{card.pronunciation}</span>
                        </div>
                      )}
                      {card.exampleSentenceEnglish && (
                        <div className="flex items-start">
                          <span className="font-semibold text-gray-700 w-20 mt-1">Example (EN):</span>
                          <span className="text-gray-900">{card.exampleSentenceEnglish}</span>
                        </div>
                      )}
                      {card.exampleSentenceChinese && (
                        <div className="flex items-start">
                          <span className="font-semibold text-gray-700 w-20 mt-1">Example (CN):</span>
                          <span className="text-gray-900">{card.exampleSentenceChinese}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <Button
            variant="Primary"
            text={isLoading ? "Uploading..." : "Upload Flashcards"}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading || !csvFile}
          />
        </form>
      </div>
    </Card>
  )
}