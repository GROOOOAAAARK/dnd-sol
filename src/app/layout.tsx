import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"

import "./globals.css"
import MainLayout from "@/components/main_layout"
const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "DnD Sol - Onchain Fantasy Adventure",
  description: "An onchain game inspired by 'You Are the Hero' books",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-background min-h-screen`}>
        <MainLayout>
          {children}
        </MainLayout>
      </body>
    </html>
  )
}
