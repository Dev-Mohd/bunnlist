"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteCoffeeLot } from "@/actions/admin";

type Props = {
  coffeeId: string;
  nameAr: string;
  reviewCount: number;
  onSuccess: () => void;
  onCancel: () => void;
};

export function DeleteConfirmDialog({ coffeeId, nameAr, reviewCount, onSuccess, onCancel }: Props) {
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const hasReviews = reviewCount > 0;

  async function handleDelete() {
    setPending(true);
    setError(null);
    const result = await deleteCoffeeLot(coffeeId);
    setPending(false);
    if (result.success) {
      onSuccess();
    } else {
      setError(result.error);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="إغلاق"
        className="absolute inset-0 bg-stone-950/50"
        onClick={onCancel}
      />
      <div className="relative w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-6 shadow-xl">
        <h2 className="text-lg font-black text-stone-950">تأكيد الحذف</h2>
        <p className="mt-2 text-sm text-stone-600">
          هل أنت متأكد من حذف{" "}
          <span className="font-bold text-stone-900">«{nameAr}»</span>؟
        </p>

        {/* حجب الحذف إذا للمحصول تقييمات */}
        {hasReviews ? (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm font-semibold text-amber-900">
              لا يمكن الحذف — هذا المحصول لديه {reviewCount}{" "}
              {reviewCount === 1 ? "تقييم" : "تقييمات"}
            </p>
            <p className="mt-1 text-xs text-amber-700">
              احذف التقييمات أولاً من قاعدة البيانات ثم أعد المحاولة.
            </p>
          </div>
        ) : (
          <p className="mt-1 text-sm text-red-600">لا يمكن التراجع عن هذا الإجراء.</p>
        )}

        {error ? (
          <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
            {error}
          </p>
        ) : null}

        <div className="mt-5 flex justify-end gap-3">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={pending}>
            {hasReviews ? "إغلاق" : "إلغاء"}
          </Button>
          {!hasReviews && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={pending}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              نعم، احذف
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
