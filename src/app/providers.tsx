// src/app/providers.tsx
// This component wraps our entire app with necessary providers
// Providers give React components access to shared data and functionality

"use client" // Must be client component since providers use React Context

import { SessionProvider, useSession } from "next-auth/react" // Provides authentication state to all components
import { Toaster } from "react-hot-toast" // Provides toast notification system
import BottomNav from "@/components/ui/BottomNav"
import TopHeader from "@/components/ui/TopHeader"
import { usePathname } from "next/navigation"

// Renders BottomNav only when authenticated and adds spacer to prevent overlap
function AuthenticatedNavWrapper({ children }: { children: React.ReactNode }) {
  const { status, data: session } = useSession()
  const pathname = usePathname()

  const isAuthed = status === "authenticated" && !!session?.user
  const isAuthRoute = pathname?.startsWith("/auth")
  const allowedNavRoots = ["/dashboard", "/flashcards", "/chat", "/articles"]
  const isOnAllowedPage = !!pathname && allowedNavRoots.some(root => pathname === root || pathname.startsWith(`${root}/`))

  const showChrome = isAuthed && !isAuthRoute
  const showBottomNav = showChrome && isOnAllowedPage
  return (
    <>
      {showChrome && <TopHeader />}
      {showChrome && <div style={{ height: "72px" }} />}
      {children}
      {showBottomNav && <div style={{ height: "84px" }} />}
      {showBottomNav && <BottomNav />}
    </>
  )
}

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
      <AuthenticatedNavWrapper>
        {children}
      </AuthenticatedNavWrapper>
      
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