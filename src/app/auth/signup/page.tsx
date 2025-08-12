// src/app/auth/signup/page.tsx
// This is the sign-up page that users visit at /auth/signup

import SignUpForm from "@/components/auth/SignUpForm"

// Server Component that renders the sign-up page
export default function SignUpPage() {
  return (
    /* Same layout as sign-in page for consistency */
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      {/* Render the SignUpForm component */}
      <SignUpForm />
    </div>
  )
}