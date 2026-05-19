import Link from "next/link";
import Image from "next/image";
import { Coffee, LogIn, LogOut, ShieldCheck } from "lucide-react";
import { auth, signOut } from "@/auth";
import { Button } from "@/components/ui/button";

export async function SiteHeader() {
  const session = await auth();
  const user = session?.user;

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-stone-50/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 text-stone-950" aria-label="BunnList">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-amber-700 text-white">
            <Coffee className="h-5 w-5" />
          </span>
          <span className="text-lg font-black" dir="ltr">
            BunnList
          </span>
        </Link>

        <nav className="flex items-center gap-2">
          <Link
            href="/coffees"
            className="rounded-md px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-100"
          >
            المحاصيل
          </Link>

          {user?.role === "ADMIN" && (
            <Link
              href="/admin"
              className="flex items-center gap-1 rounded-md px-3 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50"
            >
              <ShieldCheck className="h-4 w-4" />
              الإدارة
            </Link>
          )}

          {user ? (
            <div className="flex items-center gap-2">
              {user.image ? (
                <Image
                  src={user.image}
                  alt={user.name ?? "صورة المستخدم"}
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded-full object-cover ring-2 ring-stone-200"
                />
              ) : (
                <span className="grid h-8 w-8 place-items-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">
                  {(user.name ?? "م").charAt(0)}
                </span>
              )}
              <span className="hidden text-sm font-semibold text-stone-700 sm:block">
                {user.name}
              </span>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <Button type="submit" variant="ghost" size="sm" className="text-stone-500 hover:text-stone-800">
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">خروج</span>
                </Button>
              </form>
            </div>
          ) : (
            <Link
              href="/login"
              className="inline-flex h-9 items-center gap-2 rounded-md border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-800 transition hover:bg-stone-50"
            >
              <LogIn className="h-4 w-4" />
              دخول
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
