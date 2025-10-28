"use client"

import type React from "react"

import { signUp } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { logger } from "@/lib/logger"

export default function Page() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [repeatPassword, setRepeatPassword] = useState("")
  const [name, setName] = useState("")
  const [jobTitle, setJobTitle] = useState("")
  const [department, setDepartment] = useState("")
  const [bio, setBio] = useState("")
  const [country, setCountry] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (password !== repeatPassword) {
      setError("Passwords do not match")
      setIsLoading(false)
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      setIsLoading(false)
      return
    }

    logger.info("Starting sign-up process", { email })

    try {
      const formData = new FormData()
      formData.append("email", email)
      formData.append("password", password)
      formData.append("name", name)
      formData.append("job_title", jobTitle)
      formData.append("department", department)
      formData.append("bio", bio)
      formData.append("country", country)

      await signUp(formData)

      logger.info("Sign-up successful, redirecting", { email })
      router.push("/auth/sign-up-success")
    } catch (error: unknown) {
      logger.error("Sign-up error", { email, error: error instanceof Error ? error.message : String(error) })
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute top-40 right-20 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "2s" }}
        ></div>
        <div
          className="absolute bottom-20 left-1/3 w-80 h-80 bg-accent/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "4s" }}
        ></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="flex flex-col gap-6">
          <Card className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10">
            <CardHeader>
              <CardTitle className="text-2xl text-foreground">Sign up</CardTitle>
              <CardDescription>Create a new account and complete your profile</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignUp}>
                <div className="flex flex-col gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name" className="text-foreground">
                      Full Name
                    </Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="John Doe"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email" className="text-foreground">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="m@example.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                  <div className="grid gap-2">
                    <div className="flex items-center">
                      <Label htmlFor="password" className="text-foreground">
                        Password
                      </Label>
                    </div>
                    <Input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                  <div className="grid gap-2">
                    <div className="flex items-center">
                      <Label htmlFor="repeat-password" className="text-foreground">
                        Repeat Password
                      </Label>
                    </div>
                    <Input
                      id="repeat-password"
                      type="password"
                      required
                      value={repeatPassword}
                      onChange={(e) => setRepeatPassword(e.target.value)}
                      className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground placeholder:text-muted-foreground"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="job-title" className="text-foreground">
                      Job Title
                    </Label>
                    <Input
                      id="job-title"
                      type="text"
                      placeholder="Software Engineer"
                      required
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground placeholder:text-muted-foreground"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="department" className="text-foreground">
                      Department
                    </Label>
                    <Input
                      id="department"
                      type="text"
                      placeholder="Engineering"
                      required
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground placeholder:text-muted-foreground"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="bio" className="text-foreground">
                      Bio
                    </Label>
                    <Textarea
                      id="bio"
                      placeholder="Tell us a bit about yourself..."
                      required
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground placeholder:text-muted-foreground min-h-[80px]"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="country" className="text-foreground">
                      Where are you from?
                    </Label>
                    <Input
                      id="country"
                      type="text"
                      placeholder="United States"
                      required
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground placeholder:text-muted-foreground"
                    />
                  </div>

                  {error && <p className="text-sm text-red-500">{error}</p>}
                  <Button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                    disabled={isLoading}
                  >
                    {isLoading ? "Creating account..." : "Sign up"}
                  </Button>
                </div>
                <div className="mt-4 text-center text-sm">
                  Already have an account?{" "}
                  <Link href="/auth/login" className="underline underline-offset-4 text-primary hover:text-primary/80">
                    Login
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
