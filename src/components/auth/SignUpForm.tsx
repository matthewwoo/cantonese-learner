// src/components/auth/SignUpForm.tsx
// Sign-up form backed by Supabase Auth (email/password)

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/legacy/Button"
import { Input } from "@/components/legacy/Input"
import { Card } from "@/components/legacy/Card"
import Link from "next/link"
import { toast } from "sonner"

export default function SignUpForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("") // Optional display name
  const [isLoading, setIsLoading] = useState(false)

  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        // Display name lives in auth user metadata (no separate profiles table)
        options: { data: name ? { name } : undefined },
      })

      if (error) {
        toast.error(error.message || "Registration failed")
        return
      }

      // If email confirmation is enabled in Supabase, no session is returned
      // until the user clicks the link in their inbox.
      if (!data.session) {
        toast.success("Check your email to confirm your account!")
        return
      }

      toast.success("Account created successfully!")
      router.push("/dashboard")
      router.refresh()
    } catch {
      toast.error("Something went wrong")
    } finally {
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
        <div>
          <Input
            type="text"
            placeholder="Name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div>
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <Input
            type="password"
            placeholder="Password (min 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>

        <Button
          variant="Primary"
          text={isLoading ? "Creating Account..." : "Sign Up"}
          className="w-full"
          disabled={isLoading}
        />
      </form>

      <p className="text-center mt-4 text-sm text-gray-600">
        Already have an account?{" "}
        <Link href="/auth/signin" className="text-blue-600 hover:underline">
          Sign in
        </Link>
      </p>
    </Card>
  )
}
