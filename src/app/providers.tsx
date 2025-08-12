// src/app/providers.tsx
// This component wraps our entire app with necessary providers
// Providers give React components access to shared data and functionality

"use client" // Must be client component since providers use React Context

import { SessionProvider } from "next-auth/react" // Provides authentication state to all components
import { Toaster } from "react-hot-toast" // Provides toast notification system

// This component wraps the entire application
export default function Providers({
  children, // All the pages and components of our app
}: {
  children: React.ReactNode
}) {
  return (
    /* SessionProvider gives all child components access to user session data */
    <SessionProvider>
      {/* Render all our app's pages and components */}
      {children}
      
      {/* 
        Toaster component renders toast notifications anywhere in the app
        When you call toast.success() or toast.error(), this component displays them
      */}
      <Toaster 
        position="top-right"          // Show toasts in top-right corner
        toastOptions={{
          duration: 4000,             // Show each toast for 4 seconds
          style: {
            background: "#fff",       // White background
            color: "#363636",         // Dark text color
          },
        }}
      />
    </SessionProvider>
  )
}