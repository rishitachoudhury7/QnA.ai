"use client";

import { usePathname } from "next/navigation";
import { CommandCenter } from "@/components/layout/CommandCenter";
import { Sidebar } from "@/components/layout/Sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicRoute = pathname === "/" || pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up");

  if (isPublicRoute) return <>{children}</>;

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="min-h-screen lg:pl-[260px]">{children}</main>
      <CommandCenter />
    </div>
  );
}
