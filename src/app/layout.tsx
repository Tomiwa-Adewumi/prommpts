import type { Metadata } from "next";
import { ClerkProvider } from '@clerk/nextjs';
import { inter, orbitron, museoModerno } from '@/lib/fonts';
import { Toaster } from "@/components/ui/sonner";
import { CreditProvider } from '@/contexts/CreditContext';
import { AnalyticsProvider } from '@/components/providers/analytics-provider';
import "./globals.css";

export const metadata: Metadata = {
  title: "Prommmt - AI Image Prompt Community",
  description: "Share and discover AI-generated images with their prompts",
  icons: {
    icon: [
      { url: '/favicon/favicon.ico', type: 'image/x-icon', sizes: '16x16' },
      { url: '/favicon/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
    ],
    apple: '/favicon/apple-touch-icon.png',
    other: [
      { rel: 'icon', type: 'image/svg+xml', url: '/favicon/favicon.svg' },
    ],
  },
  manifest: '/favicon/site.webmanifest',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${inter.className} ${orbitron.variable} ${museoModerno.variable}`}>
          <CreditProvider>
            <AnalyticsProvider>
              {children}
              <Toaster position="top-center" closeButton />
            </AnalyticsProvider>
          </CreditProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
