"use client";

import Link from "next/link";
import { ArrowLeft, BookOpen, LogIn } from "lucide-react";

export function ResourceUnavailableState({ resourceId, unauthorized = false }: { resourceId: string; unauthorized?: boolean }) {
  return (
    <div className="grid min-h-[70vh] place-items-center bg-[#111210] px-6 text-white">
      <div className="w-full max-w-lg text-center">
        <Link href="/paths" className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white"><ArrowLeft size={16} /> Learning paths</Link>
        <div className="mx-auto mt-10 grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-white/5 text-[#8cd5af]"><BookOpen size={24} /></div>
        <h1 className="mt-5 text-2xl font-semibold">This learning resource is unavailable</h1>
        <p className="mt-3 text-sm leading-6 text-white/50">{unauthorized ? "Sign in with the account that owns this resource to continue learning." : "The resource may have been removed, or the link may be out of date."}</p>
        {unauthorized && <Link href="/sign-in" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black"><LogIn size={16} /> Sign in</Link>}
        <p className="mt-6 break-all text-xs text-white/25">Resource {resourceId}</p>
      </div>
    </div>
  );
}