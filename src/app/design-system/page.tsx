// src/app/design-system/page.tsx
// Dev-only gallery of every design-system token and component.
// See DESIGN.md for the written reference. Returns 404 in production.

"use client"

import { notFound } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Spinner } from "@/components/shared/spinner"

const COLOR_TOKENS = [
  "background",
  "foreground",
  "card",
  "primary",
  "secondary",
  "muted",
  "muted-foreground",
  "accent",
  "destructive",
  "border",
  "deck-sky",
  "deck-mint",
  "deck-blush",
  "bubble-assistant",
  "bubble-user",
] as const

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  )
}

export default function DesignSystemPage() {
  const [progress, setProgress] = useState(40)

  if (process.env.NODE_ENV !== "development") {
    notFound()
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-10">
        <header>
          <h1 className="text-3xl font-bold text-foreground">Design System</h1>
          <p className="text-muted-foreground mt-1">
            Tokens and components. Edit tokens in{" "}
            <code className="text-sm bg-muted px-1 py-0.5 rounded-sm">
              src/app/globals.css
            </code>
            ; reference in <code className="text-sm bg-muted px-1 py-0.5 rounded-sm">DESIGN.md</code>.
          </p>
        </header>

        <Section title="Color tokens">
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {COLOR_TOKENS.map((token) => (
              <div key={token} className="space-y-1">
                <div
                  className="h-14 rounded-md border border-border"
                  style={{ backgroundColor: `var(--${token})` }}
                />
                <p className="text-xs text-muted-foreground break-all">{token}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Radius scale">
          <div className="flex items-end gap-4">
            {(
              [
                ["sm", "rounded-sm"],
                ["md", "rounded-md"],
                ["lg", "rounded-lg"],
                ["xl", "rounded-xl"],
              ] as const
            ).map(([name, cls]) => (
              <div key={name} className="text-center space-y-1">
                <div className={`size-16 bg-primary ${cls}`} />
                <p className="text-xs text-muted-foreground">rounded-{name}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Buttons">
          <div className="flex flex-wrap gap-3">
            <Button>Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="link">Link</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="compact">Compact</Button>
            <Button size="sm">Small</Button>
            <Button size="lg">Large</Button>
            <Button size="icon" aria-label="Icon button">
              ✚
            </Button>
            <Button disabled>Disabled</Button>
          </div>
        </Section>

        <Section title="Card">
          <Card>
            <CardHeader>
              <CardTitle>Card title 卡片</CardTitle>
              <CardDescription>Card description in muted text.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-foreground">
                Body content uses <code>text-foreground</code>.
              </p>
            </CardContent>
            <CardFooter className="gap-2">
              <Button size="compact">Action</Button>
              <Button size="compact" variant="secondary">
                Cancel
              </Button>
            </CardFooter>
          </Card>
          <div className="grid grid-cols-3 gap-3">
            <Card className="bg-deck-sky p-4 rounded-xl">deck-sky</Card>
            <Card className="bg-deck-mint p-4 rounded-xl">deck-mint</Card>
            <Card className="bg-deck-blush p-4 rounded-xl">deck-blush</Card>
          </div>
        </Section>

        <Section title="Form controls">
          <div className="space-y-3 max-w-sm">
            <div className="space-y-1.5">
              <Label htmlFor="ds-input">Label 標籤</Label>
              <Input id="ds-input" placeholder="Input placeholder" />
            </div>
            <Textarea placeholder="Textarea placeholder" />
          </div>
        </Section>

        <Section title="Badges">
          <div className="flex flex-wrap gap-2">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="destructive">Destructive</Badge>
          </div>
        </Section>

        <Section title="Chat bubbles">
          <div className="space-y-2 max-w-sm">
            <div className="bg-bubble-assistant text-foreground rounded-xl rounded-bl-sm px-4 py-2 w-fit">
              你好！我哋今日講吓咩好呢？
            </div>
            <div className="bg-bubble-user text-foreground rounded-xl rounded-br-sm px-4 py-2 w-fit ml-auto">
              我想學煮嘢食嘅詞語。
            </div>
          </div>
        </Section>

        <Section title="Feedback">
          <div className="flex flex-wrap items-center gap-4">
            <Spinner size="sm" />
            <Spinner size="md" />
            <Spinner size="lg" tone="muted" />
            <Skeleton className="h-6 w-40" />
            <Button
              variant="outline"
              size="compact"
              onClick={() => toast.success("Toast! 成功")}
            >
              Show toast
            </Button>
          </div>
          <div className="flex items-center gap-3 max-w-sm">
            <Progress value={progress} />
            <Button
              size="compact"
              variant="secondary"
              onClick={() => setProgress((p) => (p >= 100 ? 0 : p + 20))}
            >
              +20
            </Button>
          </div>
        </Section>

        <Section title="Overlays">
          <div className="flex flex-wrap gap-3">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">Open Dialog</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>詞語 Definition</DialogTitle>
                  <DialogDescription>
                    Used for the vocabulary popup in the article reader.
                  </DialogDescription>
                </DialogHeader>
                <p className="text-foreground">Dialog body content.</p>
              </DialogContent>
            </Dialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">Delete…</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Used for destructive confirmations (deck/article delete).
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => toast("Deleted (not really)")}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">Menu ▾</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>View</DropdownMenuItem>
                <DropdownMenuItem>Rename</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </Section>

        <Separator />
        <p className="text-sm text-muted-foreground">
          This page is dev-only (404 in production).
        </p>
      </div>
    </div>
  )
}
