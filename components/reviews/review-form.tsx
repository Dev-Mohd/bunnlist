"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BrewMethod } from "@prisma/client";
import { Star } from "lucide-react";
import { createOrUpdateReview, type UserReviewForCoffeeLot } from "@/actions/reviews";
import { Button } from "@/components/ui/button";
import { formatBrewMethod } from "@/lib/coffee-labels";
import { cn } from "@/lib/utils";

/** يطابق الحد في actions/reviews.ts */
const BODY_MAX_LENGTH = 500;

type ReviewFormProps = {
  coffeeLotId: string;
  coffeeSlug: string;
  initialReview: UserReviewForCoffeeLot | null;
  brewMethods: BrewMethod[];
};

type SubmitState =
  | { type: "idle"; message: "" }
  | { type: "success"; message: string }
  | { type: "error"; message: string };

export function ReviewForm({ coffeeLotId, coffeeSlug, initialReview, brewMethods }: ReviewFormProps) {
  const router = useRouter();
  const [rating, setRating] = useState<number>(initialReview?.rating ?? 0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [brewMethod, setBrewMethod] = useState<BrewMethod | "">(initialReview?.brewMethod ?? "");
  const [wouldBuyAgain, setWouldBuyAgain] = useState<boolean | null>(initialReview?.wouldBuyAgain ?? null);
  const [body, setBody] = useState(initialReview?.body ?? "");
  const [submitState, setSubmitState] = useState<SubmitState>({ type: "idle", message: "" });
  const [isPending, startTransition] = useTransition();

  const displayRating = hoverRating || rating;
  const isBodyTooLong = body.length > BODY_MAX_LENGTH;
  const isValid =
    rating >= 1 && rating <= 5 && Boolean(brewMethod) && wouldBuyAgain !== null && !isBodyTooLong;
  const isEditing = Boolean(initialReview);

  const methodOptions = useMemo(() => {
    const uniqueMethods = new Set<BrewMethod>(brewMethods.length ? brewMethods : Object.values(BrewMethod));
    return Array.from(uniqueMethods);
  }, [brewMethods]);

  function handleSubmit() {
    if (!isValid || !brewMethod || wouldBuyAgain === null) return;

    setSubmitState({ type: "idle", message: "" });
    startTransition(async () => {
      const result = await createOrUpdateReview({
        coffeeLotId,
        rating: rating as 1 | 2 | 3 | 4 | 5,
        brewMethod,
        wouldBuyAgain,
        body,
      });

      if (!result.success) {
        setSubmitState({ type: "error", message: result.error });
        return;
      }

      setSubmitState({
        type: "success",
        message: isEditing ? "تم تعديل تقييمك بنجاح ✓" : "تمت إضافة تقييمك بنجاح ✓",
      });

      window.setTimeout(() => {
        router.push(`/coffees/${coffeeSlug}`);
      }, 1800);
    });
  }

  // رسالة توضيحية لما ينقص — تظهر بجانب زر الإرسال
  const missingHint = !isValid
    ? [
        !rating && "التقييم",
        !brewMethod && "طريقة التحضير",
        wouldBuyAgain === null && "قرار الشراء",
      ]
        .filter(Boolean)
        .join(" و ")
    : null;

  return (
    <form
      className="space-y-7 rounded-xl border border-stone-200 bg-white p-5 shadow-sm"
      onSubmit={(event) => {
        event.preventDefault();
        handleSubmit();
      }}
    >
      {/* ── 1. التقييم بالنجوم (إلزامي) ── */}
      <div className="space-y-3">
        <label className="block text-sm font-bold text-stone-950">
          تقييمك للمحصول{" "}
          <span className="text-red-500">*</span>
        </label>
        <div className="flex items-center gap-1" role="radiogroup" aria-label="تقييمك من خمس نجوم">
          {Array.from({ length: 5 }).map((_, index) => {
            const value = index + 1;
            const isActive = value <= displayRating;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={rating === value}
                aria-label={`${value} من 5 نجوم`}
                className="rounded-md p-1 text-amber-500 transition hover:scale-110 focus:outline-none focus:ring-2 focus:ring-amber-700 focus:ring-offset-2"
                onClick={() => setRating(value)}
                onMouseEnter={() => setHoverRating(value)}
                onMouseLeave={() => setHoverRating(0)}
                onFocus={() => setHoverRating(value)}
                onBlur={() => setHoverRating(0)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
                    event.preventDefault();
                    setRating((current) => Math.max(1, current - 1));
                  }
                  if (event.key === "ArrowRight" || event.key === "ArrowUp") {
                    event.preventDefault();
                    setRating((current) => Math.min(5, current + 1 || 1));
                  }
                }}
              >
                <Star className={cn("h-8 w-8", isActive ? "fill-current" : "fill-transparent")} />
              </button>
            );
          })}
          {rating > 0 && (
            <span className="mr-1 text-sm font-semibold text-stone-500">{rating}/5</span>
          )}
        </div>
      </div>

      {/* ── 2. طريقة التحضير — Chips (إلزامي) ── */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-bold text-stone-950">
          طريقة التحضير{" "}
          <span className="text-red-500">*</span>
        </legend>
        <div className="flex flex-wrap gap-2" role="group">
          {methodOptions.map((method) => (
            <button
              key={method}
              type="button"
              aria-pressed={brewMethod === method}
              onClick={() => setBrewMethod(method)}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-amber-700 focus:ring-offset-1",
                brewMethod === method
                  ? "border-amber-700 bg-amber-700 text-white"
                  : "border-stone-200 bg-white text-stone-700 hover:border-amber-300 hover:bg-amber-50",
              )}
            >
              {formatBrewMethod(method)}
            </button>
          ))}
        </div>
      </fieldset>

      {/* ── 3. هل تشتريه مرة ثانية؟ (إلزامي) ── */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-bold text-stone-950">
          هل تشتريه مرة ثانية؟{" "}
          <span className="text-red-500">*</span>
        </legend>
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              { label: "نعم", value: true, active: "border-emerald-600 bg-emerald-50 text-emerald-800" },
              { label: "لا",  value: false, active: "border-red-300 bg-red-50 text-red-800" },
            ] as const
          ).map((option) => (
            <button
              key={option.label}
              type="button"
              aria-pressed={wouldBuyAgain === option.value}
              onClick={() => setWouldBuyAgain(option.value)}
              className={cn(
                "rounded-xl border py-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-amber-700 focus:ring-offset-1",
                wouldBuyAgain === option.value
                  ? option.active
                  : "border-stone-200 bg-white text-stone-700 hover:bg-stone-50",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      {/* ── 4. ملاحظاتك (اختياري) ── */}
      <div className="space-y-2">
        <label htmlFor="body" className="block text-sm font-bold text-stone-950">
          ملاحظاتك{" "}
          <span className="text-xs font-normal text-stone-400">(اختياري)</span>
        </label>
        <textarea
          id="body"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={4}
          placeholder="النكهات التي لاحظتها، طريقة التحضير، هل تنصح به؟..."
          className={cn(
            "w-full rounded-lg border bg-white px-4 py-3 text-sm leading-7 text-stone-900 shadow-sm outline-none transition placeholder:text-stone-400 focus:ring-2",
            isBodyTooLong
              ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
              : "border-stone-300 focus:border-amber-700 focus:ring-amber-700/20",
          )}
        />
        <p
          className={cn(
            "text-end text-xs font-semibold",
            isBodyTooLong ? "text-red-600" : "text-stone-400",
          )}
        >
          {body.length} / {BODY_MAX_LENGTH}
        </p>
      </div>

      {/* ── رسالة الحالة (نجاح أو خطأ) ── */}
      {submitState.type !== "idle" ? (
        <div
          role={submitState.type === "error" ? "alert" : "status"}
          className={cn(
            "rounded-lg px-4 py-3 text-sm font-semibold",
            submitState.type === "success"
              ? "bg-emerald-50 text-emerald-800"
              : "bg-red-50 text-red-700",
          )}
        >
          {submitState.message}
        </div>
      ) : null}

      {/* ── الإرسال + hint ── */}
      <div className="space-y-2">
        <Button type="submit" disabled={!isValid || isPending} className="w-full">
          {isPending ? "جاري الحفظ..." : isEditing ? "تعديل تقييم" : "إضافة تقييم"}
        </Button>
        {missingHint && !isPending ? (
          <p className="text-center text-xs text-stone-400">
            مطلوب قبل الإرسال: {missingHint}
          </p>
        ) : null}
      </div>
    </form>
  );
}
