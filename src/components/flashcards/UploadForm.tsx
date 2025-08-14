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

// Props for the UploadForm component
interface UploadFormProps {
  onUploadSuccess?: () => void // Callback when upload succeeds
}

export default function UploadForm({ onUploadSuccess }: UploadFormProps) {
  // State for form inputs
  const [setName, setSetName] = useState("") // Name of the flashcard set
  const [description, setDescription] = useState("") // Optional description
  const [theme, setTheme] = useState("") // Theme/topic of the cards
  const [csvFile, setCsvFile] = useState<File | null>(null) // The uploaded CSV file
  const [isLoading, setIsLoading] = useState(false) // Loading state during upload
  const [previewData, setPreviewData] = useState<Flashcard[]>([]) // Preview of parsed CSV

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

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate required fields
    if (!setName.trim()) {
      toast.error("Please enter a set name")
      return
    }
    if (!theme.trim()) {
      toast.error("Please enter a theme")
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
          description: description.trim() || undefined,
          theme: theme.trim(),
          flashcards,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed')
      }

      // Success! Reset form and notify parent
      toast.success(`Successfully uploaded ${flashcards.length} flashcards!`)
      setSetName("")
      setDescription("")
      setTheme("")
      setCsvFile(null)
      setPreviewData([])
      
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
    <Card className="p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">上傳閃卡 Upload Flashcards</h2>
        <p className="text-gray-600">
          Upload a CSV file with your Cantonese flashcards. Required columns: Chinese Word, English Translation
        </p>
      </div>

      {/* CSV Format Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="font-medium text-blue-900 mb-2">CSV Format Example:</h3>
        <pre className="text-sm text-blue-800 bg-white p-2 rounded border overflow-x-auto">
{`Chinese Word,English Translation,Pronunciation,Example Sentence (English),Example Sentence (Chinese)
你好,Hello,nei5 hou2,Hello! How are you today?,你好！今日點樣？
多謝,Thank you,do1 ze6,Thank you for your help,多謝你嘅幫助
再見,Goodbye,zoi3 gin3,Goodbye! See you tomorrow!,再見！聽日見！`}
        </pre>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Set Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Set Name *
            </label>
            <Input
              type="text"
              placeholder="e.g., Daily Conversations"
              value={setName}
              onChange={(e) => setSetName(e.target.value)}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Theme *
            </label>
            <Input
              type="text"
              placeholder="e.g., Greetings, Food, Travel"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description (Optional)
          </label>
          <Input
            type="text"
            placeholder="Brief description of this flashcard set"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            CSV File *
          </label>
          <Input
            id="csv-file"
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <p className="text-xs text-gray-500 mt-1">Maximum file size: 5MB</p>
        </div>

        {/* Preview */}
        {previewData.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-medium text-green-900 mb-3">Preview (first 3 cards):</h3>
            <div className="space-y-2">
              {previewData.map((card, index) => (
                <div key={index} className="bg-white p-3 rounded border text-sm">
                  <div><strong>Chinese:</strong> {card.chineseWord}</div>
                  <div><strong>English:</strong> {card.englishTranslation}</div>
                  {card.pronunciation && (
                    <div><strong>Pronunciation:</strong> {card.pronunciation}</div>
                  )}
                  {card.exampleSentenceEnglish && (
                    <div><strong>Example (English):</strong> {card.exampleSentenceEnglish}</div>
                  )}
                  {card.exampleSentenceChinese && (
                    <div><strong>Example (Chinese):</strong> {card.exampleSentenceChinese}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full"
          disabled={isLoading || !csvFile}
        >
          {isLoading ? "Uploading..." : "Upload Flashcards"}
        </Button>
      </form>
    </Card>
  )
}