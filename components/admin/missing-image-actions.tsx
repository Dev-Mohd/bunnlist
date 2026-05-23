"use client";

import * as React from "react";
import { CoffeeImageSource, ImagePermissionStatus } from "@prisma/client";
import { Loader2, Save, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  approveMissingImagesByRoastery,
  updateMissingImage,
  validateMissingImageUrl,
  type MissingImageLot,
  type MissingImageRoaster,
} from "@/actions/missing-images";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

const PERMISSION_LABELS: Record<ImagePermissionStatus, string> = {
  APPROVED: "موافق عليها",
  PENDING: "بانتظار الموافقة",
  REJECTED: "مرفوضة",
  PLACEHOLDER_ONLY: "Needs Image",
};
const SOURCE_LABELS: Record<CoffeeImageSource, string> = {
  ROASTERY_WEBSITE: "موقع المحمصة",
  ROASTERY_PROVIDED: "مرسلة من المحمصة",
  INSTAGRAM: "إنستغرام",
  USER_UPLOAD: "رفع مستخدم",
  PLACEHOLDER: "صورة بديلة",
};
const BLACK_KNIGHT_NOTE = "Official product image usage approved by Black Knight on 2026-05-16.";
type ValidationState = "IDLE" | "LOADING" | "VALID" | "INVALID";

function looksLikeDirectImageUrl(value: string | null | undefined) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      /\.(avif|jpe?g|png|webp)$/i.test(url.pathname)
    );
  } catch {
    return false;
  }
}

export function MissingImageRowForm({ lot }: { lot: MissingImageLot }) {
  const router = useRouter();
  const sourceImageUrl = looksLikeDirectImageUrl(lot.productSourceUrl)
    ? lot.productSourceUrl ?? ""
    : "";
  const initialImageUrl =
    lot.imageUrl ?? sourceImageUrl;
  const [imageUrl, setImageUrl] = React.useState(initialImageUrl);
  const [imagePermissionStatus, setImagePermissionStatus] =
    React.useState<ImagePermissionStatus>(
      lot.isBlackKnight ? ImagePermissionStatus.APPROVED : lot.imagePermissionStatus,
    );
  const [imageSource, setImageSource] = React.useState<CoffeeImageSource>(
    lot.imageSource === CoffeeImageSource.PLACEHOLDER
      ? CoffeeImageSource.ROASTERY_WEBSITE
      : lot.imageSource,
  );
  const [imageCredit, setImageCredit] = React.useState(
    lot.imageCredit ?? (lot.isBlackKnight ? "Black Knight" : lot.roaster.nameAr),
  );
  const [imageSourceUrl, setImageSourceUrl] = React.useState(
    lot.imageSourceUrl ?? lot.productSourceUrl ?? "",
  );
  const [imagePermissionNote, setImagePermissionNote] = React.useState(
    lot.imagePermissionNote ?? (lot.isBlackKnight ? BLACK_KNIGHT_NOTE : ""),
  );
  const [pending, startTransition] = React.useTransition();
  const [validating, startValidation] = React.useTransition();
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [validationState, setValidationState] = React.useState<ValidationState>(
    lot.imageUrl && lot.imagePermissionStatus === ImagePermissionStatus.APPROVED
      ? "VALID"
      : "IDLE",
  );
  const [validatedUrl, setValidatedUrl] = React.useState<string | null>(
    lot.imageUrl && lot.imagePermissionStatus === ImagePermissionStatus.APPROVED ? lot.imageUrl : null,
  );
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(validatedUrl);
  const approvalNeedsValidation =
    imagePermissionStatus === ImagePermissionStatus.APPROVED &&
    (!imageUrl.trim() || validationState !== "VALID" || validatedUrl !== imageUrl.trim());
  const saveDisabled = pending || approvalNeedsValidation;
  const disabledReason = approvalNeedsValidation
    ? "لا يمكن حفظ صورة معتمدة قبل نجاح التحقق والمعاينة. غيّر الحالة إلى بانتظار الموافقة إذا رغبت بحفظ الرابط الآن."
    : null;

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    if (saveDisabled) {
      setError(disabledReason);
      return;
    }

    startTransition(async () => {
      const result = await updateMissingImage({
        coffeeLotId: lot.id,
        imageUrl,
        imagePermissionStatus,
        imageSource,
        imageSourceUrl,
        imageCredit,
        imagePermissionNote,
      });

      if (result.success) {
        setMessage(result.message);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  function validateImage() {
    setMessage(null);
    setError(null);
    setPreviewUrl(null);
    setValidationState("LOADING");

    startValidation(async () => {
      const result = await validateMissingImageUrl(imageUrl);
      if (!result.success) {
        setError(result.error);
        setValidationState("INVALID");
        return;
      }

      setImageUrl(result.cleanedUrl);
      if (result.valid) {
        setValidatedUrl(result.cleanedUrl);
        setPreviewUrl(result.cleanedUrl);
        setValidationState("VALID");
        setMessage("تم التحقق من الرابط. تأكد من ظهور المعاينة قبل الحفظ.");
      } else {
        setValidatedUrl(null);
        setValidationState("INVALID");
        setError(result.reason ?? "رابط الصورة غير صالح.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
        <Input
          value={imageUrl}
          onChange={(event) => {
            setImageUrl(event.target.value);
            setValidatedUrl(null);
            setPreviewUrl(null);
            setValidationState("IDLE");
          }}
          placeholder="رابط الصورة الرسمي"
          dir="ltr"
          className="break-all [overflow-wrap:anywhere]"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={validateImage}
          disabled={validating || validationState === "LOADING" || !imageUrl.trim()}
        >
          {validationState === "LOADING" || validating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : null}
          Validate image
        </Button>
      </div>

      {previewUrl ? (
        <div className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-stone-50 p-3 sm:flex-row sm:items-start">
          {/* معاينة تعكس طريقة العرض العامة بدقة */}
          <div className="aspect-square w-full max-w-36 overflow-hidden rounded-lg border border-stone-200 bg-[#F7F5F1] flex items-center justify-center sm:w-28 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="معاينة الصورة"
              className="max-h-[80%] max-w-[84%] w-auto h-auto object-contain"
              onLoad={() => {
                setValidationState("VALID");
                setError(null);
              }}
              onError={() => {
                setValidationState("INVALID");
                setValidatedUrl(null);
                setError("فشلت معاينة الصورة. يمكن حفظها كـ بانتظار الموافقة فقط.");
              }}
            />
          </div>
          <p className="min-w-0 break-all text-xs font-semibold text-stone-500 [overflow-wrap:anywhere]" dir="ltr">
            {previewUrl}
          </p>
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Select
          value={imagePermissionStatus}
          onChange={(event) =>
            setImagePermissionStatus(event.target.value as ImagePermissionStatus)
          }
        >
          {Object.values(ImagePermissionStatus).map((status) => (
            <option key={status} value={status}>
              {PERMISSION_LABELS[status]}
            </option>
          ))}
        </Select>
        <Select
          value={imageSource}
          onChange={(event) => setImageSource(event.target.value as CoffeeImageSource)}
        >
          {[CoffeeImageSource.ROASTERY_WEBSITE, CoffeeImageSource.ROASTERY_PROVIDED].map(
            (source) => (
              <option key={source} value={source}>
                {SOURCE_LABELS[source]}
              </option>
            ),
          )}
        </Select>
        <Input
          value={imageCredit}
          onChange={(event) => setImageCredit(event.target.value)}
          placeholder="كريديت الصورة"
        />
        <Button type="submit" size="sm" disabled={saveDisabled}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          حفظ
        </Button>
      </div>

      {disabledReason ? <p className="text-xs font-semibold text-amber-700">{disabledReason}</p> : null}

      <div className="grid gap-3 md:grid-cols-2">
        <Input
          value={imageSourceUrl}
          onChange={(event) => setImageSourceUrl(event.target.value)}
          placeholder="رابط مصدر الصورة"
          dir="ltr"
          className="break-all [overflow-wrap:anywhere]"
        />
        <Input
          value={imagePermissionNote}
          onChange={(event) => setImagePermissionNote(event.target.value)}
          placeholder="ملاحظة الإذن"
        />
      </div>

      {lot.isBlackKnight ? (
        <p className="text-xs font-semibold text-emerald-700">
          اختبار Black Knight: بعد نجاح التحقق والمعاينة، سيتم اعتماد الصورة بتاريخ
          2026-05-16 وتثبيت الكريديت والملاحظة الرسمية.
        </p>
      ) : null}
      {(message || error) && (
        <p
          className={`text-xs font-semibold lg:col-span-5 ${
            error ? "text-red-600" : "text-emerald-700"
          }`}
        >
          {error ?? message}
        </p>
      )}
    </form>
  );
}

export function BulkApproveByRoastery({ roasters }: { roasters: MissingImageRoaster[] }) {
  const router = useRouter();
  const [roasterId, setRoasterId] = React.useState("");
  const [pending, startTransition] = React.useTransition();
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    startTransition(async () => {
      const result = await approveMissingImagesByRoastery({ roasterId });
      if (result.success) {
        setMessage(result.message);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-amber-200 bg-amber-50 p-4"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <div className="flex-1">
          <label className="mb-1.5 block text-sm font-bold text-stone-900">
            اعتماد جماعي حسب المحمصة
          </label>
          <Select
            value={roasterId}
            onChange={(event) => setRoasterId(event.target.value)}
            className="w-full"
          >
            <option value="">اختر محمصة...</option>
            {roasters.map((roaster) => (
              <option key={roaster.id} value={roaster.id}>
                {roaster.nameAr}
              </option>
            ))}
          </Select>
        </div>
        <Button type="submit" disabled={pending || !roasterId}>
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ShieldCheck className="h-4 w-4" />
          )}
          اعتماد الإذن
        </Button>
      </div>
      <p className="mt-2 text-xs font-semibold text-amber-900">
        هذا الإجراء يعتمد الإذن فقط ولا يضيف روابط صور تلقائياً.
      </p>
      {(message || error) && (
        <p className={`mt-2 text-sm font-semibold ${error ? "text-red-600" : "text-emerald-700"}`}>
          {error ?? message}
        </p>
      )}
    </form>
  );
}
