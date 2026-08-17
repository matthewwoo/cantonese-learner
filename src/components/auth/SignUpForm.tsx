// src/components/auth/SignUpForm.tsx
// Sign-up form backed by Supabase Auth (email/password)

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
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
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="p-6">
        {/* Bilingual header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-foreground" lang="zh-HK">開始學習</h1>
          <p className="text-muted-foreground mt-1">Start lesson</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="signup-name">Name (optional)</Label>
            <Input
              id="signup-name"
              type="text"
              placeholder="Name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="signup-email">Email</Label>
            <Input
              id="signup-email"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="signup-password">Password</Label>
            <Input
              id="signup-password"
              type="password"
              placeholder="Password (min 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Creating Account..." : "Sign Up"}
          </Button>
        </form>

        <p className="text-center mt-4 text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/auth/signin"
            className="font-medium text-foreground underline underline-offset-4 hover:text-muted-foreground"
          >
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
