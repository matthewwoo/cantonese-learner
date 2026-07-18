// src/app/auth/signin/page.tsx
// This is the sign-in page that users visit at /auth/signin

import SignInForm from "@/components/auth/SignInForm"

// This is a Server Component (runs on the server by default in Next.js 13+)
// It renders the sign-in page layout
export default function SignInPage() {
  return (
    /* Full-screen container on the app background */
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Render the SignInForm component */}
      <SignInForm />
    </div>
  )
}