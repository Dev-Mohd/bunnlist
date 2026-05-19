"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SheetProps = {
  trigger: React.ReactNode;
  title: string;
  children: React.ReactNode;
  className?: string;
};

export function Sheet({ trigger, title, children, className }: SheetProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="contents">
        {trigger}
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="إغلاق الفلاتر"
            className="absolute inset-0 bg-stone-950/45"
            onClick={() => setOpen(false)}
          />
          <aside
            className={cn(
              "absolute inset-y-0 right-0 flex w-[min(92vw,390px)] flex-col overflow-y-auto bg-stone-50 p-5 shadow-2xl",
              className,
            )}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-stone-950">{title}</h2>
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)} aria-label="إغلاق">
                <X className="h-5 w-5" />
              </Button>
            </div>
            {children}
          </aside>
        </div>
      ) : null}
    </>
  );
}
