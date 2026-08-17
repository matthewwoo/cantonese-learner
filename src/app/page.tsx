// src/app/page.tsx
// Marketing page — a single screen: logo, name, two calls to action.

import Image from "next/image"
import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Zh } from "@/components/shared/zh"

export default async function Home() {
  // Signed-in visitors skip the pitch and land in the app.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    redirect("/dashboard")
  }

  return (
    <main className="min-h-svh bg-background flex flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm flex flex-col items-center text-center animate-in fade-in duration-700">
        {/* Logo */}
        <div className="rounded-full bg-accent p-6 shadow-sm">
          <Image
            src="/app_icon.png"
            alt=""
            width={512}
            height={512}
            priority
            className="size-28 sm:size-32"
          />
        </div>

        {/* Name */}
        <h1 className="mt-8 text-5xl sm:text-6xl font-bold tracking-tight text-foreground">
          Bun
        </h1>

        {/* Tagline — Chinese leads, English supports */}
        <p className="mt-3 text-xl text-foreground">
          <Zh>你嘅粵語夥伴</Zh>
        </p>
        <p className="mt-1 text-base text-muted-foreground">
          Your Cantonese Buddy
        </p>

        {/* Calls to action */}
        <div className="mt-10 w-full flex flex-col gap-3">
          <Button asChild className="w-full">
            <Link href="/auth/signup">
              <Zh>開始</Zh> Get Started
            </Link>
          </Button>
          <Button variant="outline" asChild className="w-full">
            <Link href="/auth/signin">
              <Zh>登入</Zh> Log In
            </Link>
          </Button>
        </div>
      </div>
    </main>
  )
}
