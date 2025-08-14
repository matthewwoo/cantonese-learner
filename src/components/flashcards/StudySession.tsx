// src/components/flashcards/StudySession.tsx
// Interactive flashcard study component with spaced repetition

"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { ResponseQuality } from "@/utils/spaced-repetition"
import { speakCantonese, stopSpeech, isTTSSupported } from "@/utils/textToSpeech"
import { toast } from "react-hot-toast"

// Types for study session data
interface Flashcard {
  id: string
  chineseWord: string
  englishTranslation: string
  pronunciation?: string
  exampleSentenceEnglish?: string | null
  exampleSentenceChinese?: string | null
}

interface StudyCard {
  id: string
  position: number
  flashcard: Flashcard
  wasCorrect: boolean | null
}

interface StudySessionData {
  id: string
  totalCards: number
  flashcardSetName: string
  theme: string
  studyCards: StudyCard[]
}

interface StudySessionProps {
  studySessionData: StudySessionData
  onSessionComplete: () => void
}

export default function StudySession({ studySessionData, onSessionComplete }: StudySessionProps) {
  // State for current card and session progress
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [answeredCards, setAnsweredCards] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [ttsSupported, setTtsSupported] = useState(false)

  // Get current card
  const currentCard = studySessionData.studyCards[currentCardIndex]
  const isLastCard = currentCardIndex === studySessionData.studyCards.length - 1

  // Start timing when component mounts or new card is shown
  useEffect(() => {
    setStartTime(new Date())
  }, [currentCardIndex])

  // Check TTS support on mount
  useEffect(() => {
    setTtsSupported(isTTSSupported())
  }, [])

  // Handle showing the answer
  const handleShowAnswer = () => {
    setShowAnswer(true)
  }

  // Handle text-to-speech for Chinese word
  const handleSpeak = async () => {
    if (!currentCard || isSpeaking) return

    setIsSpeaking(true)
    try {
      await speakCantonese(currentCard.flashcard.chineseWord)
    } catch (error) {
      console.error('TTS error:', error)
      toast.error('Unable to pronounce this word')
    } finally {
      setIsSpeaking(false)
    }
  }

  // Handle stopping speech
  const handleStopSpeech = () => {
    stopSpeech()
    setIsSpeaking(false)
  }

  // Handle user response to flashcard
  const handleResponse = async (quality: ResponseQuality) => {
    if (!currentCard || !startTime) return

    setIsSubmitting(true)

    try {
      // Calculate response time
      const responseTime = Date.now() - startTime.getTime()

      // Send response to API
      const response = await fetch('/api/study/respond', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studyCardId: currentCard.id,
          responseQuality: quality,
          responseTime,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to record response')
      }

      const data = await response.json()

      // Update local state
      setAnsweredCards(data.sessionProgress.answered)

      // Move to next card or complete session
      if (isLastCard || data.sessionProgress.isCompleted) {
        // Session completed
        toast.success(`Study session completed! You studied ${answeredCards + 1} cards.`)
        onSessionComplete()
      } else {
        // Move to next card
        setCurrentCardIndex(prev => prev + 1)
        setShowAnswer(false)
        toast.success(getResponseFeedback(quality))
      }

    } catch (error) {
      console.error('Error recording response:', error)
      toast.error('Failed to record response')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Get encouraging feedback based on response quality
  const getResponseFeedback = (quality: ResponseQuality): string => {
    switch (quality) {
      case ResponseQuality.EASY:
        return "Perfect! 完美! That was easy!"
      case ResponseQuality.GOOD:
        return "Good job! 好! You got it right!"
      case ResponseQuality.HARD:
        return "Correct but difficult. Keep practicing!"
      case ResponseQuality.INCORRECT:
        return "Not quite right. You'll get it next time!"
      case ResponseQuality.BLACKOUT:
        return "No worries! Learning takes time."
      default:
        return "Response recorded!"
    }
  }

  // Get button styling for response quality
  const getResponseButtonStyle = (quality: ResponseQuality): string => {
    switch (quality) {
      case ResponseQuality.EASY:
        return "bg-green-600 hover:bg-green-700 text-white"
      case ResponseQuality.GOOD:
        return "bg-blue-600 hover:bg-blue-700 text-white"
      case ResponseQuality.HARD:
        return "bg-yellow-600 hover:bg-yellow-700 text-white"
      case ResponseQuality.INCORRECT:
        return "bg-orange-600 hover:bg-orange-700 text-white"
      case ResponseQuality.BLACKOUT:
        return "bg-red-600 hover:bg-red-700 text-white"
      default:
        return "bg-gray-600 hover:bg-gray-700 text-white"
    }
  }

  if (!currentCard) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading next card...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Progress Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                學習中 Studying: {studySessionData.flashcardSetName}
              </h1>
              <p className="text-gray-600">Theme: {studySessionData.theme}</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">Progress</div>
              <div className="text-lg font-semibold">
                {currentCardIndex + 1} / {studySessionData.totalCards}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentCardIndex + 1) / studySessionData.totalCards) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Flashcard */}
        <Card className="p-8 mb-8">
          <div className="text-center">
            {/* Question Side */}
            <div className="mb-8">
              <div className="text-6xl font-bold text-gray-900 mb-4">
                {currentCard.flashcard.chineseWord}
              </div>
              
              {/* Pronunciation Button */}
              {ttsSupported && (
                <div className="mb-4">
                  <Button
                    onClick={isSpeaking ? handleStopSpeech : handleSpeak}
                    disabled={!currentCard}
                    className="bg-green-600 hover:bg-green-700 text-white mr-2"
                  >
                    {isSpeaking ? "🔇 Stop" : "🔊 Pronounce"}
                  </Button>
                </div>
              )}
              
              <div className="text-lg text-gray-600 mb-6">
                Do you know what this means?
              </div>
              
              {!showAnswer && (
                <Button 
                  onClick={handleShowAnswer}
                  className="bg-indigo-600 hover:bg-indigo-700 text-lg px-8 py-3"
                >
                  顯示答案 Show Answer
                </Button>
              )}
            </div>

            {/* Answer Side */}
            {showAnswer && (
              <div className="border-t pt-8">
                <div className="text-3xl font-semibold text-indigo-600 mb-4">
                  {currentCard.flashcard.englishTranslation}
                </div>
                
                {currentCard.flashcard.pronunciation && (
                  <div className="text-xl text-gray-500 mb-4 font-mono">
                    {currentCard.flashcard.pronunciation}
                  </div>
                )}

                {/* Pronunciation Button for Answer Side */}
                {ttsSupported && (
                  <div className="mb-4">
                    <Button
                      onClick={isSpeaking ? handleStopSpeech : handleSpeak}
                      disabled={!currentCard}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {isSpeaking ? "🔇 Stop Pronunciation" : "🔊 Listen Again"}
                    </Button>
                  </div>
                )}
                
                {currentCard.flashcard.exampleSentenceEnglish && (
                  <div className="text-gray-700 text-lg mb-2 italic">
                    Example: {currentCard.flashcard.exampleSentenceEnglish}
                  </div>
                )}
                
                {currentCard.flashcard.exampleSentenceChinese && (
                  <div className="flex flex-col items-center mb-6">
                    <div className="text-gray-700 text-lg mb-2 italic">
                      中文例句: {currentCard.flashcard.exampleSentenceChinese}
                    </div>
                    {ttsSupported && (
                      <Button
                        onClick={async () => {
                          if (isSpeaking) {
                            handleStopSpeech()
                          } else {
                            setIsSpeaking(true)
                            try {
                              await speakCantonese(currentCard.flashcard.exampleSentenceChinese!)
                            } catch (error) {
                              console.error('TTS error:', error)
                              toast.error('Unable to pronounce example sentence')
                            } finally {
                              setIsSpeaking(false)
                            }
                          }
                        }}
                        className="bg-blue-500 hover:bg-blue-600 text-white text-sm px-4 py-2"
                      >
                        {isSpeaking ? "🔇" : "🔊"} Example
                      </Button>
                    )}
                  </div>
                )}

                {/* Response Buttons */}
                <div className="mt-8">
                  <p className="text-gray-600 mb-4">How well did you know this?</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    <Button
                      onClick={() => handleResponse(ResponseQuality.BLACKOUT)}
                      disabled={isSubmitting}
                      className={getResponseButtonStyle(ResponseQuality.BLACKOUT)}
                    >
                      😵 Blackout<br/>
                      <span className="text-xs">No idea</span>
                    </Button>
                    
                    <Button
                      onClick={() => handleResponse(ResponseQuality.INCORRECT)}
                      disabled={isSubmitting}
                      className={getResponseButtonStyle(ResponseQuality.INCORRECT)}
                    >
                      😕 Incorrect<br/>
                      <span className="text-xs">Wrong guess</span>
                    </Button>
                    
                    <Button
                      onClick={() => handleResponse(ResponseQuality.HARD)}
                      disabled={isSubmitting}
                      className={getResponseButtonStyle(ResponseQuality.HARD)}
                    >
                      😅 Hard<br/>
                      <span className="text-xs">Barely got it</span>
                    </Button>
                    
                    <Button
                      onClick={() => handleResponse(ResponseQuality.GOOD)}
                      disabled={isSubmitting}
                      className={getResponseButtonStyle(ResponseQuality.GOOD)}
                    >
                      😊 Good<br/>
                      <span className="text-xs">Got it right</span>
                    </Button>
                    
                    <Button
                      onClick={() => handleResponse(ResponseQuality.EASY)}
                      disabled={isSubmitting}
                      className={getResponseButtonStyle(ResponseQuality.EASY)}
                    >
                      😄 Easy<br/>
                      <span className="text-xs">Too easy!</span>
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Study Tips */}
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-3">💡 Study Tips</h3>
          <ul className="text-sm text-gray-600 space-y-2">
            <li>• Try to recall the meaning before showing the answer</li>
            <li>• Be honest about your response quality - it helps the algorithm</li>
            <li>• Cards you find hard will appear more frequently</li>
            <li>• Easy cards will have longer intervals between reviews</li>
          </ul>
        </Card>
      </div>
    </div>
  )
}