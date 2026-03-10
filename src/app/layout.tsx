import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = {
  title: "Yesterday Tomorrow — Business Tracker",
  description: "P&L and store readiness tracker",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <div className="min-h-screen flex flex-col">
          <Nav />
          <main className="flex-1 container mx-auto px-4 py-6 max-w-5xl">{children}</main>
        </div>
      </body>
    </html>
  );
}
