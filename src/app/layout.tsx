import type { Metadata } from 'next'
import './globals.css'
import AppWalletProvider from "../components/AppWalletProvider";
import {AuthProvider} from "../context/AuthContext";

export const metadata: Metadata = {
  title: 'Solana Token2022 Moderator',
  description: 'Solana Token2022 Moderator',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <AppWalletProvider>
            {children}
          </AppWalletProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
