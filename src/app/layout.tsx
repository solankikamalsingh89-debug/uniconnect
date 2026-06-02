import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "UniConnect | IIITNR",
  description: "Tech-Noir college networking platform for IIIT Naya Raipur. Hierarchical chats, reels feed, event management, and automated notices.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen bg-background text-foreground antialiased`}>
        {children}
        <Toaster
          theme="dark"
          position="top-right"
          toastOptions={{
            style: {
              background: 'rgba(20, 20, 30, 0.9)',
              border: '1px solid rgba(0, 255, 255, 0.3)',
              backdropFilter: 'blur(12px)',
              color: '#f0f0f5',
            },
          }}
        />
      </body>
    </html>
  );
}
