import type React from "react"
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { ThemeProvider } from "@/components/theme-provider"
import { StoreProvider } from "@/lib/store"
import { AppHeader } from "@/components/app-header"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"

const geist = Geist({ subsets: ["latin", "cyrillic"], variable: "--font-geist" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" })

export const metadata: Metadata = {
  title: {
    default: "QuizMaster — карточки, учить, тесты",
    template: "%s · QuizMaster",
  },
  description:
    "Бесплатные флеш-карточки без лимитов: режимы «Карточки», «Заучивание», «Письмо», «Диктант», «Тест» и игра «Подбор». Всё работает прямо в браузере.",
  applicationName: "QuizMaster",
  keywords: ["флеш-карточки", "quizlet", "учить слова", "тесты", "подготовка к экзамену"],
  icons: { icon: "/icon.svg" },
  manifest: "/manifest.webmanifest",
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7fb" },
    { media: "(prefers-color-scheme: dark)", color: "#0a092d" },
  ],
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className={`${geist.variable} ${geistMono.variable} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <StoreProvider>
            <div className="flex min-h-dvh flex-col">
              <AppHeader />
              <main className="flex-1">{children}</main>
            </div>
            <Toaster position="top-center" />
          </StoreProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
