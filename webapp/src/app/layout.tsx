import type { Metadata, Viewport } from "next";
import { LogOut } from "lucide-react";
import "./globals.css";
import { NavBar } from "@/components/NavBar";
import { SyncBadge } from "@/components/SyncBadge";
import { authEnabled } from "@/lib/auth";

export const metadata: Metadata = {
  title: "October Rally 2026",
  description:
    "Registration and attendance management for October Rally 2026 — schools, members, workers, visitors, uploads, and a live dashboard.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen font-sans antialiased">
        <NavBar />
        <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-5">{children}</main>
        <footer className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 pb-8 pt-2 text-xs text-slate-400">
          <span>October Rally System · Offline-ready</span>
          <div className="flex items-center gap-4">
            <SyncBadge />
            {authEnabled() && (
              <form action="/api/logout" method="post">
                <button type="submit" className="inline-flex items-center gap-1 font-medium text-slate-400 hover:text-slate-600">
                  <LogOut size={13} /> Lock
                </button>
              </form>
            )}
          </div>
        </footer>
      </body>
    </html>
  );
}
