// src/app/auth/signin/page.tsx
// This is the sign-in page that users visit at /auth/signin

import SignInForm from "@/components/auth/SignInForm"

// This is a Server Component (runs on the server by default in Next.js 13+)
// It renders the sign-in page layout
export default function SignInPage() {
  return (
    /* Full-screen container with gradient background */
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      {/* 
        min-h-screen: full viewport height
        bg-gradient-to-br: gradient from top-left to bottom-right  
        from-blue-50 to-indigo-100: light blue gradient
        flex items-center justify-center: center content horizontally and vertically
        p-4: padding on all sides for mobile spacing
      */}
      
      {/* Render the SignInForm component */}
      <SignInForm />
    </div>
  )
}