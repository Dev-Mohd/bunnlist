"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { DeleteConfirmDialog } from "@/components/admin/delete-confirm-dialog";

type Props = { coffeeId: string; nameAr: string; reviewCount: number };

export function CoffeeListActions({ coffeeId, nameAr, reviewCount }: Props) {
  const router = useRouter();
  const [showDialog, setShowDialog] = React.useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setShowDialog(true)}
        className="flex items-center gap-1.5 rounded-lg border border-red-100 px-2.5 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
      >
        <Trash2 className="h-3.5 w-3.5" />
        حذف
      </button>

      {showDialog ? (
        <DeleteConfirmDialog
          coffeeId={coffeeId}
          nameAr={nameAr}
          reviewCount={reviewCount}
          onSuccess={() => {
            setShowDialog(false);
            router.refresh();
          }}
          onCancel={() => setShowDialog(false)}
        />
      ) : null}
    </>
  );
}
