// src/components/auth/SignUpForm.tsx
// This component creates the sign-up form for new user registration

"use client" // Client-side component

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Card } from "@/components/ui/Card"
import Link from "next/link"
import { toast } from "react-hot-toast"

export default function SignUpForm() {
  // State for all form inputs
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("") // Optional name field
  const [isLoading, setIsLoading] = useState(false)
  
  const router = useRouter()

  // Handle form submission for user registration
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault() // Prevent page refresh
    setIsLoading(true)

    try {
      // Create the account in Supabase. The `name` is stored in user metadata
      // and copied into the public.users profile by the handle_new_user trigger.
      const supabase = createClient()
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      })

      if (error) {
        toast.error(error.message || "Registration failed")
        return
      }

      // With email confirmation disabled, signUp returns an active session.
      if (data.session) {
        toast.success("Account created successfully!")
        router.push("/dashboard")
        router.refresh()
      } else {
        // Email confirmation is enabled — prompt the user to confirm.
        toast.success("Check your email to confirm your account.")
        router.push("/auth/signin")
      }
    } catch {
      // Handle any unexpected errors
      toast.error("Something went wrong")
    } finally {
      // Reset loading state
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto p-6">
      {/* Bilingual header */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">開始學習</h1>
        <p className="text-gray-600 mt-1">Start lesson</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name field (optional) */}
        <div>
          <Input
            type="text"
            placeholder="Name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            // Note: no 'required' attribute since name is optional
          />
        </div>
        
        {/* Email field */}
        <div>
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        
        {/* Password field with minimum length */}
        <div>
          <Input
            type="password"
            placeholder="Password (min 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6} // HTML5 validation for minimum length
          />
        </div>

        {/* Submit button */}
        <Button 
          variant="Primary"
          text={isLoading ? "Creating Account..." : "Sign Up"}
          className="w-full"
          disabled={isLoading}
        />
      </form>

      {/* Link to sign in page for existing users */}
      <p className="text-center mt-4 text-sm text-gray-600">
        Already have an account?{" "}
        <Link href="/auth/signin" className="text-blue-600 hover:underline">
          Sign in
        </Link>
      </p>
    </Card>
  )
}