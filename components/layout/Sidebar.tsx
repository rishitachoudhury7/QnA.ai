"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";
import {
  BookOpen,
  BrainCircuit,
  Command,
  Compass,
  House,
  Plus,
  Route,
  Settings,
  Sparkles,
  X,
} from "lucide-react";
import { useState } from "react";
const items = [
  ["/dashboard", "Home", House],
  ["/paths", "Learning Paths", Route],
  ["/knowledge-map", "Knowledge Map", BrainCircuit],
  ["/quick-learn", "Quick Learn", Sparkles],
] as const;
export function Sidebar() {
  const path = usePathname();
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        aria-label="Open menu"
        className="lg:hidden fixed top-4 left-4 z-50 rounded-xl bg-black p-2 text-white"
        onClick={() => setOpen(true)}
      >
        <Command size={18} />
      </button>
      <aside
        className={`${open ? "translate-x-0" : "-translate-x-full"} fixed z-40 flex h-screen w-[260px] flex-col border-r border-[var(--line)] bg-[var(--panel)] px-5 py-6 transition-transform lg:translate-x-0`}
      >
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 font-semibold">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-black text-white">
              <BrainCircuit size={17} />
            </div>
            <span>learnwise</span>
          </Link>
          <button className="lg:hidden" onClick={() => setOpen(false)}>
            <X size={18} />
          </button>
        </div>
        <div className="mt-10">
          <div className="eyebrow text-neutral-400">Workspace</div>
          <nav className="mt-3 space-y-1">
            {items.map(([href, label, Icon]) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${path.startsWith(href) ? "bg-neutral-100 font-medium" : "text-neutral-600 hover:bg-neutral-50"}`}
              >
                <Icon size={17} />
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="mt-7">
          <div className="eyebrow text-neutral-400">Actions</div>
          <div className="mt-3 space-y-1">
            <Link
              href="/add-resource"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-neutral-600 hover:bg-neutral-50"
            >
              <Plus size={17} />
              Add Resource
            </Link>
            <Link
              href="/goals"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-neutral-600 hover:bg-neutral-50"
            >
              <Compass size={17} />
              Goals
            </Link>
            <Link
              href="/Settings"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-neutral-600 hover:bg-neutral-50"
            >
              <Settings size={17} />
              Settings
            </Link>
          </div>
        </div>
        <div className="mt-auto rounded-2xl bg-[var(--soft)] p-4">
          <div className="flex items-center gap-3">
            <UserButton appearance={{ elements: { avatarBox: "h-9 w-9" } }} />
            <div>
              <div className="text-sm font-semibold">
                {user?.fullName ?? user?.firstName ?? "Your profile"}
              </div>
              <div className="text-xs text-neutral-500">
                7 day learning streak
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
