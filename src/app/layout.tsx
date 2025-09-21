// src/app/layout.tsx
// This is the root layout that wraps every page in our application
// It's like the HTML document structure that's shared across all pages

import type { Metadata } from "next"
import { Inter } from "next/font/google" // Google Fonts integration
import "./globals.css"                   // Global CSS styles (includes Tailwind)
import Providers from "./providers"       // Our providers component

// Load the Inter font from Google Fonts
// This creates a font object we can use in our CSS
const inter = Inter({ subsets: ["latin"] })

// Metadata that appears in the browser tab and search engines
export const metadata: Metadata = {
  title: "Cantonese Learner",                                       // Browser tab title
  description: "Learn Cantonese through flashcards and AI conversations", // SEO description
}

// This is the root layout component
// Every page in our app will be wrapped with this structure
export default function RootLayout({
  children, // This will be the actual page content (sign-in page, dashboard, etc.)
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      {/* This generates the <html> tag */}
      {/* 
        This generates the <body> tag
        className={inter.className} applies the Inter font to all text
      */}
      <body className={inter.className} style={{ backgroundColor: '#f9f2ec' }}>
        {/* 
          Providers component wraps all pages with:
          - NextAuth session management 
          - Toast notification system
        */}
        <Providers>
          {/* 
            This is where individual page content gets rendered
            For example, when user visits /auth/signin, the SignInPage component renders here
          */}
          {children}
        </Providers>
      </body>
    </html>
  )
}