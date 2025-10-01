"use client";

import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import { ThemeSwitcher } from "@/components/theme-switcher";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen flex flex-col">
      <header className="w-full border-b border-b-foreground/10 fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
        <div className="w-full max-w-7xl mx-auto flex justify-between items-center px-6 py-4">
          <Link href="/protected" className="text-lg font-semibold hover:opacity-80 transition-opacity">
            Voltra Athletics
          </Link>
          <div className="flex items-center gap-3">
            <ThemeSwitcher />
            <LogoutButton />
          </div>
        </div>
      </header>
      <div className="flex-1 w-full max-w-7xl mx-auto px-6 pt-[73px]">
        {children}
      </div>
    </main>
  );
}
