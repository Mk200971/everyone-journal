import type React from "react"
import type { Metadata } from "next"
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Suspense } from "react"
import { Toaster } from "@/components/ui/toaster"
import { Footer } from "@/components/footer"
import { ErrorBoundary } from "@/components/error-boundary"
import "./globals.css"

import "@/lib/env-validation"
import { Inter } from "next/font/google"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
  weight: ["400", "500", "600", "700", "800"],
})

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
}

export const metadata: Metadata = {
  title: "EVERYONE Journal - Customer Obsessed. Every Day",
  description:
    "A mission-based journaling application for personal growth and community engagement. Customer Obsessed. Every Day.",
  generator: "v0.app",
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${inter.variable} antialiased flex flex-col min-h-screen`}>
        <ErrorBoundary>
          <div className="flex justify-center pb-0">
            <Suspense fallback={null}>{children}</Suspense>
          </div>
          <Footer />
          <Toaster />
        </ErrorBoundary>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
