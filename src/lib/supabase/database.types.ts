/**
 * Database types for the Supabase schema.
 *
 * Hand-written to match supabase/migrations/20260718000000_init.sql.
 * Regenerate any time with:
 *   npm run types:gen   (supabase gen types typescript --project-id <ref>)
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      flashcard_sets: {
        Row: {
          id: string
          user_id: string
          name: string
          image_url: string | null
          status: string
          error_message: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          image_url?: string | null
          status?: string
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          image_url?: string | null
          status?: string
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      flashcards: {
        Row: {
          id: string
          user_id: string
          flashcard_set_id: string
          chinese_word: string
          english_translation: string
          pronunciation: string | null
          example_sentence_english: string | null
          example_sentence_chinese: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          flashcard_set_id: string
          chinese_word: string
          english_translation: string
          pronunciation?: string | null
          example_sentence_english?: string | null
          example_sentence_chinese?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          flashcard_set_id?: string
          chinese_word?: string
          english_translation?: string
          pronunciation?: string | null
          example_sentence_english?: string | null
          example_sentence_chinese?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'flashcards_flashcard_set_id_fkey'
            columns: ['flashcard_set_id']
            isOneToOne: false
            referencedRelation: 'flashcard_sets'
            referencedColumns: ['id']
          },
        ]
      }
      study_sessions: {
        Row: {
          id: string
          user_id: string
          started_at: string
          completed_at: string | null
          total_cards: number
        }
        Insert: {
          id?: string
          user_id: string
          started_at?: string
          completed_at?: string | null
          total_cards?: number
        }
        Update: {
          id?: string
          user_id?: string
          started_at?: string
          completed_at?: string | null
          total_cards?: number
        }
        Relationships: []
      }
      study_cards: {
        Row: {
          id: string
          user_id: string
          flashcard_id: string
          study_session_id: string
          ease_factor: number
          interval_days: number
          repetitions: number
          next_review_date: string
          was_correct: boolean | null
          response_time: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          flashcard_id: string
          study_session_id: string
          ease_factor?: number
          interval_days?: number
          repetitions?: number
          next_review_date?: string
          was_correct?: boolean | null
          response_time?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          flashcard_id?: string
          study_session_id?: string
          ease_factor?: number
          interval_days?: number
          repetitions?: number
          next_review_date?: string
          was_correct?: boolean | null
          response_time?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'study_cards_flashcard_id_fkey'
            columns: ['flashcard_id']
            isOneToOne: false
            referencedRelation: 'flashcards'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'study_cards_study_session_id_fkey'
            columns: ['study_session_id']
            isOneToOne: false
            referencedRelation: 'study_sessions'
            referencedColumns: ['id']
          },
        ]
      }
      chat_sessions: {
        Row: {
          id: string
          user_id: string
          theme: string
          target_words: Json
          started_at: string
          ended_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          theme: string
          target_words?: Json
          started_at?: string
          ended_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          theme?: string
          target_words?: Json
          started_at?: string
          ended_at?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          id: string
          user_id: string
          chat_session_id: string
          role: string
          content: string
          translation: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          chat_session_id: string
          role: string
          content: string
          translation?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          chat_session_id?: string
          role?: string
          content?: string
          translation?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'chat_messages_chat_session_id_fkey'
            columns: ['chat_session_id']
            isOneToOne: false
            referencedRelation: 'chat_sessions'
            referencedColumns: ['id']
          },
        ]
      }
      articles: {
        Row: {
          id: string
          user_id: string
          title: string
          source_url: string | null
          original_content: Json
          translated_content: Json
          word_definitions: Json | null
          sentences: Json | null
          difficulty: string | null
          estimated_minutes: number | null
          sentence_count: number | null
          status: string
          error_message: string | null
          archived_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          source_url?: string | null
          original_content: Json
          translated_content: Json
          word_definitions?: Json | null
          sentences?: Json | null
          difficulty?: string | null
          estimated_minutes?: number | null
          sentence_count?: number | null
          status?: string
          error_message?: string | null
          archived_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          source_url?: string | null
          original_content?: Json
          translated_content?: Json
          word_definitions?: Json | null
          sentences?: Json | null
          difficulty?: string | null
          estimated_minutes?: number | null
          sentence_count?: number | null
          status?: string
          error_message?: string | null
          archived_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      reading_sessions: {
        Row: {
          id: string
          user_id: string
          article_id: string
          current_position: number
          reading_speed: number
          show_translation: boolean
          total_reading_time: number
          started_at: string
          last_read_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          article_id: string
          current_position?: number
          reading_speed?: number
          show_translation?: boolean
          total_reading_time?: number
          started_at?: string
          last_read_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          article_id?: string
          current_position?: number
          reading_speed?: number
          show_translation?: boolean
          total_reading_time?: number
          started_at?: string
          last_read_at?: string
          completed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'reading_sessions_article_id_fkey'
            columns: ['article_id']
            isOneToOne: false
            referencedRelation: 'articles'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
