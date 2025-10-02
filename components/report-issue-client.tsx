"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertCircle, CheckCircle2, Send } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export function ReportIssueClient() {
  const [formData, setFormData] = useState({
    issueType: "",
    description: "",
    contactInfo: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.issueType || !formData.description.trim()) {
      setSubmitStatus("error")
      setErrorMessage("Please fill in all required fields.")
      return
    }

    setIsSubmitting(true)
    setSubmitStatus("idle")

    try {
      const response = await fetch("/api/report-issue", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (response.ok) {
        setSubmitStatus("success")
        setFormData({ issueType: "", description: "", contactInfo: "" })
      } else {
        throw new Error(result.error || "Failed to submit report")
      }
    } catch (error) {
      setSubmitStatus("error")
      setErrorMessage(error instanceof Error ? error.message : "Failed to submit your report. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative z-10 container mx-auto px-4 py-8 max-w-2xl">
      <div className="text-center mb-8">
        <h1 className="everyone-heading text-3xl sm:text-4xl lg:text-5xl mb-4">Report an Issue</h1>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto">
          We appreciate your feedback! Please let us know how we can improve your experience.
        </p>
      </div>

      <Card className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10">
        <CardHeader>
          <CardTitle className="everyone-subheading text-xl">Share Your Feedback</CardTitle>
          <CardDescription>
            Help us make Everyone Journal better by reporting bugs, suggesting improvements, or sharing your thoughts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Issue Type */}
            <div className="space-y-2">
              <Label htmlFor="issueType" className="text-sm font-medium">
                Issue Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.issueType}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, issueType: value }))}
              >
                <SelectTrigger className="bg-white/5 border-white/20">
                  <SelectValue placeholder="Select the type of issue" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bug">Bug Report</SelectItem>
                  <SelectItem value="feedback">General Feedback</SelectItem>
                  <SelectItem value="suggestion">Feature Suggestion</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">
                Description <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="description"
                placeholder="Describe the issue or suggestion in detail..."
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                className="min-h-[120px] bg-white/5 border-white/20 resize-none"
                required
              />
            </div>

            {/* Contact Info */}
            <div className="space-y-2">
              <Label htmlFor="contactInfo" className="text-sm font-medium">
                Contact Information (Optional)
              </Label>
              <Input
                id="contactInfo"
                type="email"
                placeholder="Your email address (optional)"
                value={formData.contactInfo}
                onChange={(e) => setFormData((prev) => ({ ...prev, contactInfo: e.target.value }))}
                className="bg-white/5 border-white/20"
              />
              <p className="text-xs text-muted-foreground">
                Provide your email if you'd like us to follow up with you about this issue.
              </p>
            </div>

            {/* Status Messages */}
            {submitStatus === "success" && (
              <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  Thank you for your feedback! We appreciate your input and will review your submission.
                </AlertDescription>
              </Alert>
            )}

            {submitStatus === "error" && (
              <Alert className="border-red-200 bg-red-50 dark:bg-red-950/20">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800 dark:text-red-200">{errorMessage}</AlertDescription>
              </Alert>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Feedback
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Additional Info */}
      <div className="mt-8 text-center">
        <p className="text-sm text-muted-foreground">
          Your feedback helps us improve Everyone Journal for the entire community.
        </p>
      </div>
    </div>
  )
}
