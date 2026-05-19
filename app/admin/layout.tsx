import { Menu } from "lucide-react";
import { requireAdmin } from "@/lib/auth-helpers";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { Sheet } from "@/components/ui/sheet";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 flex h-14 items-center border-b border-stone-200 bg-white px-4 lg:hidden">
        <Sheet
          trigger={
            <span className="flex items-center gap-2 text-sm font-semibold text-stone-700">
              <Menu className="h-5 w-5" />
              القائمة
            </span>
          }
          title="قائمة الإدارة"
        >
          <AdminSidebar />
        </Sheet>
        <span className="mr-4 font-black text-stone-950">لوحة الإدارة</span>
      </div>

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-screen w-56 shrink-0 border-l border-stone-200 bg-white lg:flex lg:flex-col">
          <AdminSidebar />
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
