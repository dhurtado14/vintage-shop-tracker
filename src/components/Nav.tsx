"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, TrendingUp, Package, Store } from "lucide-react";

const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pl", label: "P&L", icon: TrendingUp },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/store-plan", label: "Store Plan", icon: Store },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <header className="border-b bg-card shadow-sm">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold tracking-tight text-primary">
              Yesterday Tomorrow
            </span>
            <span className="text-xs text-muted-foreground hidden sm:block">Business Tracker</span>
          </div>
          <nav className="flex items-center gap-1">
            {links.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
