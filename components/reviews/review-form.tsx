"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BrewMethod } from "@prisma/client";
import { Star } from "lucide-react";
import { createOrUpdateReview, type UserReviewForCoffeeLot } from "@/actions/reviews";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { formatBrewMethod } from "@/lib/coffee-labels";
import { cn } from "@/lib/utils";

const BODY_MAX_LENGTH = 1000;

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
  const isValid = rating >= 1 && rating <= 5 && Boolean(brewMethod) && wouldBuyAgain !== null && !isBodyTooLong;
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
        message: isEditing ? "تم تعديل تقييمك بنجاح." : "تمت إضافة تقييمك بنجاح.",
      });

      window.setTimeout(() => {
        router.push(`/coffees/${coffeeSlug}`);
        router.refresh();
      }, 2000);
    });
  }

  return (
    <form
      className="space-y-7 rounded-lg border border-stone-200 bg-white p-5 shadow-sm"
      onSubmit={(event) => {
        event.preventDefault();
        handleSubmit();
      }}
    >
      <div className="space-y-3">
        <label className="block text-sm font-bold text-stone-950">تقييمك للمحصول</label>
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
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="brewMethod" className="block text-sm font-bold text-stone-950">
          طريقة التحضير
        </label>
        <Select
          id="brewMethod"
          value={brewMethod}
          onChange={(event) => setBrewMethod(event.target.value as BrewMethod)}
          required
          className="w-full"
        >
          <option value="">اختر طريقة التحضير</option>
          {methodOptions.map((method) => (
            <option key={method} value={method}>
              {formatBrewMethod(method)}
            </option>
          ))}
        </Select>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-bold text-stone-950">هل تشتريه مرة ثانية؟</legend>
        <div className="flex flex-wrap gap-3">
          {[
            { label: "نعم", value: true },
            { label: "لا", value: false },
          ].map((option) => (
            <label
              key={option.label}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-md border px-4 py-3 text-sm font-semibold transition",
                wouldBuyAgain === option.value
                  ? "border-amber-700 bg-amber-50 text-amber-950"
                  : "border-stone-200 bg-white text-stone-700 hover:bg-stone-50",
              )}
            >
              <input
                type="radio"
                name="wouldBuyAgain"
                checked={wouldBuyAgain === option.value}
                onChange={() => setWouldBuyAgain(option.value)}
                className="h-4 w-4 accent-amber-700"
                required
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-2">
        <label htmlFor="body" className="block text-sm font-bold text-stone-950">
          نص التجربة
        </label>
        <textarea
          id="body"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={6}
          placeholder="اكتب ملاحظاتك عن النكهة، الوصفة، أو هل يناسب الشراء مرة أخرى..."
          className={cn(
            "w-full rounded-md border bg-white px-4 py-3 text-sm leading-7 text-stone-900 shadow-sm outline-none transition placeholder:text-stone-400 focus:ring-2",
            isBodyTooLong
              ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
              : "border-stone-300 focus:border-amber-700 focus:ring-amber-700/20",
          )}
        />
        <p className={cn("text-left text-xs font-semibold", isBodyTooLong ? "text-red-600" : "text-stone-400")}>
          {body.length} / {BODY_MAX_LENGTH} حرف
        </p>
      </div>

      {submitState.type !== "idle" ? (
        <div
          role={submitState.type === "error" ? "alert" : "status"}
          className={cn(
            "rounded-md px-4 py-3 text-sm font-semibold",
            submitState.type === "success"
              ? "bg-emerald-50 text-emerald-800"
              : "bg-red-50 text-red-700",
          )}
        >
          {submitState.message}
        </div>
      ) : null}

      <Button type="submit" disabled={!isValid || isPending} className="w-full">
        {isPending ? "جاري الحفظ..." : isEditing ? "تعديل تقييم" : "إضافة تقييم"}
      </Button>
    </form>
  );
}
