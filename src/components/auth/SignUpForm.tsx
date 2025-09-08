// src/components/auth/SignUpForm.tsx
// This component creates the sign-up form for new user registration

"use client" // Client-side component

import { useState } from "react"
import { signIn } from "next-auth/react"
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
      // First, register the user by calling our API endpoint
      const registerRes = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" }, // Tell server we're sending JSON
        body: JSON.stringify({ email, password, name }), // Convert form data to JSON
      })

      // Parse the response from our registration API
      const registerData = await registerRes.json()

      // Check if registration failed
      if (!registerRes.ok) {
        toast.error(registerData.error || "Registration failed")
        return // Exit early if registration failed
      }

      // Registration successful! Now automatically sign them in
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false, // Handle redirect manually
      })

      // Check if automatic sign-in failed
      if (result?.error) {
        toast.error("Registration successful but sign-in failed")
      } else {
        // Everything worked! Show success and redirect
        toast.success("Account created successfully!")
        router.push("/dashboard")
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