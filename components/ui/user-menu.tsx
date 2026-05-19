"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { LogOut, Star, ShieldCheck, ChevronDown } from "lucide-react";
import type { Role } from "@prisma/client";
import { signOutAction } from "@/actions/auth";

type Props = {
  name: string | null | undefined;
  image: string | null | undefined;
  role: Role;
};

export function UserMenu({ name, image, role }: Props) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const displayName = name ?? "مستخدم";
  const initial = displayName.trim().charAt(0) || "م";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full p-1 transition hover:bg-stone-100"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {image ? (
          <Image
            src={image}
            alt={displayName}
            width={32}
            height={32}
            className="h-8 w-8 rounded-full object-cover ring-2 ring-stone-200"
          />
        ) : (
          <span className="grid h-8 w-8 place-items-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">
            {initial}
          </span>
        )}
        <span className="hidden text-sm font-semibold text-stone-700 sm:block">{displayName}</span>
        <ChevronDown className={`hidden h-4 w-4 text-stone-400 transition-transform sm:block ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute left-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-lg"
        >
          <div className="border-b border-stone-100 px-4 py-3">
            <p className="text-sm font-bold text-stone-900 truncate">{displayName}</p>
          </div>

          <div className="py-1">
            <Link
              href="/my-reviews"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50"
            >
              <Star className="h-4 w-4 text-amber-600" />
              تقييماتي
            </Link>

            {role === "ADMIN" ? (
              <Link
                href="/admin"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-amber-700 hover:bg-amber-50"
              >
                <ShieldCheck className="h-4 w-4" />
                لوحة الإدارة
              </Link>
            ) : null}
          </div>

          <div className="border-t border-stone-100 py-1">
            <form action={signOutAction}>
              <button
                type="submit"
                role="menuitem"
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-semibold text-stone-500 hover:bg-stone-50 hover:text-stone-800"
              >
                <LogOut className="h-4 w-4" />
                تسجيل الخروج
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
