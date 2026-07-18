// src/components/auth/SignInForm.tsx
// Sign-in form backed by Supabase Auth (email/password)

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/legacy/Button"
import { Input } from "@/components/legacy/Input"
import { Card } from "@/components/legacy/Card"
import Link from "next/link"
import { toast } from "sonner"

export default function SignInForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        toast.error("Invalid credentials")
      } else {
        toast.success("Signed in successfully!")
        router.push("/dashboard")
        router.refresh()
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
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

      <form onSubmit={handleSubmit} className="space-y-4">
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
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <Button
          variant="Primary"
          text={isLoading ? "Signing In..." : "Sign In"}
          className="w-full"
          disabled={isLoading}
        />
      </form>

      <p className="text-center mt-4 text-sm text-black">
        Don&apos;t have an account?{" "}
        <Link href="/auth/signup" className="text-blue-600 hover:underline">
          Sign up
        </Link>
      </p>
    </Card>
  )
}
