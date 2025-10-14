import type React from "react"
import type { Metadata } from "next"
import { Space_Grotesk, Geist_Mono } from "next/font/google"
import { Toaster } from "@/components/ui/toaster"
import { Suspense } from "react"
import "./globals.css"
import { AppKitProvider } from "@/components/wallet/appkit-provider"

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
})

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Trojan | Trade Continuous Outcomes",
  description: "Buy and sell probability mass. One pool, infinite states.",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`font-sans ${spaceGrotesk.variable} ${geistMono.variable}`}>
        <AppKitProvider>
          <Suspense fallback={null}>{children}</Suspense>
          <Toaster />
        </AppKitProvider>
      </body>
    </html>
  )
}
