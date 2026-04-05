"use client";

import { Nav } from "@/components/Nav";
import { AuthGate } from "@/components/AuthGate";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <div className="min-h-screen flex flex-col">
        <Nav />
        <main className="flex-1 container mx-auto px-4 py-6 max-w-5xl">{children}</main>
      </div>
    </AuthGate>
  );
}
