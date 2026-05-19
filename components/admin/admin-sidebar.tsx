import Link from "next/link";
import { Coffee, LayoutDashboard, ArrowRight } from "lucide-react";

const navLinks = [
  { href: "/admin", label: "لوحة الإدارة", icon: LayoutDashboard },
  { href: "/admin/coffees", label: "المحاصيل", icon: Coffee },
];

export function AdminSidebar() {
  return (
    <aside className="flex h-full flex-col gap-1 p-4">
      <div className="mb-4 px-2 py-3 border-b border-stone-200">
        <p className="text-xs font-bold uppercase tracking-wider text-stone-400">الإدارة</p>
      </div>

      <nav className="flex flex-col gap-1">
        {navLinks.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-stone-700 transition hover:bg-amber-50 hover:text-amber-800"
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="mt-auto border-t border-stone-200 pt-4">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-stone-500 transition hover:bg-stone-100 hover:text-stone-800"
        >
          <ArrowRight className="h-4 w-4 shrink-0" />
          خروج للموقع العام
        </Link>
      </div>
    </aside>
  );
}
