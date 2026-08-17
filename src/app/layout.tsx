// src/app/layout.tsx
// This is the root layout that wraps every page in our application
// It's like the HTML document structure that's shared across all pages

import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google" // Google Fonts integration
import "./globals.css"                   // Global CSS styles (includes Tailwind)
import Providers from "./providers"
import { cn } from "@/lib/utils";

// Inter is the app font, exposed as a CSS variable consumed by
// --font-sans in globals.css
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })

// Metadata that appears in the browser tab and search engines
export const metadata: Metadata = {
  title: "Bun — Your Cantonese Buddy",                              // Browser tab title
  description: "Learn Cantonese through flashcards and AI conversations", // SEO description
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/app_icon.png", type: "image/png", sizes: "512x512" }
    ],
    apple: [
      { url: "/app_icon.png", type: "image/png", sizes: "180x180" }
    ]
  },
}

export const viewport: Viewport = {
  themeColor: "#f9f2ec",
};

// This is the root layout component
// Every page in our app will be wrapped with this structure
export default function RootLayout({
  children, // This will be the actual page content (sign-in page, dashboard, etc.)
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={cn("font-sans", inter.variable)}>
      {/* Theme (background, text color, font) comes from globals.css tokens */}
      <body className="bg-background text-foreground">
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