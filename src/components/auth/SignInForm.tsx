// src/components/auth/SignInForm.tsx
// This component creates the sign-in form UI and handles user authentication

"use client" // This tells Next.js this component runs on the client (browser)

import { useState } from "react"
import { signIn } from "next-auth/react" // NextAuth function to handle sign in
import { useRouter } from "next/navigation" // Next.js hook for navigation
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input" 
import { Card } from "@/components/ui/Card"
import Link from "next/link"
import { toast } from "react-hot-toast" // Library for showing notifications

export default function SignInForm() {
  // React state to store form input values
  const [email, setEmail] = useState("") // Stores email input
  const [password, setPassword] = useState("") // Stores password input
  const [isLoading, setIsLoading] = useState(false) // Tracks if form is submitting
  
  // Hook to programmatically navigate to other pages
  const router = useRouter()

  // Function that runs when user submits the form
  const handleSubmit = async (e: React.FormEvent) => {
    // Prevent the form from refreshing the page (default browser behavior)
    e.preventDefault()
    
    // Set loading state to true (disables button, shows loading text)
    setIsLoading(true)

    try {
      // Call NextAuth's signIn function with credentials
      const result = await signIn("credentials", {
        email,              // User's email
        password,           // User's password  
        redirect: false,    // Don't auto-redirect, we'll handle it manually
      })

      // Check if sign in failed
      if (result?.error) {
        // Show error notification to user
        toast.error("Invalid credentials")
      } else {
        // Sign in successful! Show success message and redirect
        toast.success("Signed in successfully!")
        router.push("/dashboard") // Navigate to dashboard page
      }
    } catch {
      // Handle any unexpected errors
      toast.error("Something went wrong")
    } finally {
      // Always reset loading state when done (success or error)
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto p-6">
      {/* Header section with bilingual title */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-black">歡迎回來</h1>
        <p className="text-black mt-1">Welcome back</p>
      </div>

      {/* Form element - handleSubmit runs when form is submitted */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email input field */}
        <div>
          <Input
            type="email"                    // HTML5 email validation
            placeholder="Email"
            value={email}                   // Controlled input - value from state
            onChange={(e) => setEmail(e.target.value)} // Update state when user types
            required                        // HTML5 required validation
          />
        </div>
        
        {/* Password input field */}
        <div>
          <Input
            type="password"                 // Hides password text
            placeholder="Password"
            value={password}                // Controlled input - value from state  
            onChange={(e) => setPassword(e.target.value)} // Update state when user types
            required                        // HTML5 required validation
          />
        </div>

        {/* Submit button */}
        <Button 
          variant="Primary"
          text={isLoading ? "Signing In..." : "Sign In"}
          className="w-full"                // Full width styling
          disabled={isLoading}              // Disable button while loading
        />
      </form>

      {/* Link to sign up page for new users */}
      <p className="text-center mt-4 text-sm text-black">
        Don&apos;t have an account?{" "}
        <Link href="/auth/signup" className="text-blue-600 hover:underline">
          Sign up
        </Link>
      </p>
    </Card>
  )
}