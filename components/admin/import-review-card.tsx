// components/admin/import-review-card.tsx
// ============================================================
//  بطاقة مراجعة: تعرض الحقول المستخرَجة قابلة للتعديل،
//  مع درجة ثقة لكل حقل، وأزرار حفظ / رفض.
// ============================================================

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CoffeeImageSource, CoffeeImageType, ImagePermissionStatus } from "@prisma/client";
import {
  updateImportedCoffee,
  saveImportedCoffee,
  rejectImportedCoffee,
} from "@/actions/import";

// شكل السجل المستورَد (مبسّط لواجهة العرض)
interface ImportedCoffee {
  id: string;
  status: string;
  coffeeName: string | null;
  roasteryName: string | null;
  originCountry: string | null;
  region: string | null;
  farmName: string | null;
  producerName: string | null;
  process: string | null;
  variety: string | null;
  tastingNotes: string[];
  roastLevel: string | null;
  brewMethods: string[];
  price: string | number | null;
  currency: string | null;
  weightGrams: number | null;
  productUrl: string | null;
  imageUrl: string | null;
  availability: string | null;
  descriptionSummary: string | null;
  confidence: Record<string, number> | null;
  importJob?: { sourceUrl: string; errorMessage: string | null };
}

// مؤشّر لون الثقة
function ConfidenceBadge({ score }: { score: number | undefined }) {
  if (score == null) return null;
  const pct = Math.round(score * 100);
  const color =
    score >= 0.8 ? "bg-green-100 text-green-700"
    : score >= 0.5 ? "bg-amber-100 text-amber-700"
    : "bg-red-100 text-red-700";
  return (
    <span className={`mr-2 rounded px-1.5 py-0.5 text-[10px] ${color}`}>
      ثقة {pct}%
    </span>
  );
}

// حقل نصي قابل للتعديل
function Field({
  label, value, confidence, onChange, ltr = false, textarea = false,
}: {
  label: string;
  value: string;
  confidence: number | undefined;
  onChange: (v: string) => void;
  ltr?: boolean;
  textarea?: boolean;
}) {
  return (
    <div>
      <label className="flex items-center text-xs font-medium text-stone-600">
        {label}
        <ConfidenceBadge score={confidence} />
      </label>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm
                     focus:border-amber-600 focus:outline-none"
        />
      ) : (
        <input
          type="text"
          dir={ltr ? "ltr" : "rtl"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm
                     focus:border-amber-600 focus:outline-none"
        />
      )}
    </div>
  );
}

const IMAGE_TYPE_LABELS: Record<CoffeeImageType, string> = {
  OFFICIAL: "رسمية",
  PLACEHOLDER: "صورة بديلة",
  USER_UPLOADED: "مرفوعة من مستخدم",
  NONE: "بدون صورة",
};

const IMAGE_PERMISSION_LABELS: Record<ImagePermissionStatus, string> = {
  APPROVED: "موافق عليها",
  PENDING: "بانتظار الموافقة",
  REJECTED: "مرفوضة",
  PLACEHOLDER_ONLY: "يحتاج صورة",
};

const IMAGE_SOURCE_LABELS: Record<CoffeeImageSource, string> = {
  ROASTERY_WEBSITE: "موقع المحمصة",
  ROASTERY_PROVIDED: "مرسلة من المحمصة",
  INSTAGRAM: "إنستغرام",
  USER_UPLOAD: "رفع مستخدم",
  PLACEHOLDER: "صورة بديلة",
};

export function ImportReviewCard({ imported }: { imported: ImportedCoffee }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ type: "error" | "info"; text: string } | null>(null);
  const [needsDupConfirm, setNeedsDupConfirm] = useState(false);

  // الحالة المحلية لكل الحقول القابلة للتعديل
  const [f, setF] = useState({
    coffeeName: imported.coffeeName ?? "",
    roasteryName: imported.roasteryName ?? "",
    originCountry: imported.originCountry ?? "",
    region: imported.region ?? "",
    farmName: imported.farmName ?? "",
    producerName: imported.producerName ?? "",
    process: imported.process ?? "",
    variety: imported.variety ?? "",
    tastingNotes: (imported.tastingNotes ?? []).join("، "),
    roastLevel: imported.roastLevel ?? "",
    brewMethods: (imported.brewMethods ?? []).join("، "),
    price: imported.price != null ? String(imported.price) : "",
    currency: imported.currency ?? "SAR",
    weightGrams: imported.weightGrams != null ? String(imported.weightGrams) : "",
    imageUrl: imported.imageUrl ?? "",
    availability: imported.availability ?? "",
    descriptionSummary: imported.descriptionSummary ?? "",
    imageType: imported.imageUrl ? CoffeeImageType.OFFICIAL : CoffeeImageType.NONE,
    imagePermissionStatus: imported.imageUrl
      ? ImagePermissionStatus.PENDING
      : ImagePermissionStatus.PLACEHOLDER_ONLY,
    imageSource: imported.imageUrl ? CoffeeImageSource.ROASTERY_WEBSITE : CoffeeImageSource.PLACEHOLDER,
    imageCredit: imported.roasteryName ?? "",
    imageSourceUrl: imported.productUrl ?? imported.importJob?.sourceUrl ?? "",
    imagePermissionNote: "",
  });

  const conf = imported.confidence ?? {};
  const hasImage = Boolean(f.imageUrl.trim());
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  // تحويل الحقول إلى الشكل المناسب لقاعدة البيانات
  function buildPayload() {
    return {
      coffeeName: f.coffeeName.trim() || null,
      roasteryName: f.roasteryName.trim() || null,
      originCountry: f.originCountry.trim() || null,
      region: f.region.trim() || null,
      farmName: f.farmName.trim() || null,
      producerName: f.producerName.trim() || null,
      process: f.process.trim() || null,
      variety: f.variety.trim() || null,
      tastingNotes: f.tastingNotes.split("،").map((s) => s.trim()).filter(Boolean),
      roastLevel: f.roastLevel.trim() || null,
      brewMethods: f.brewMethods.split("،").map((s) => s.trim()).filter(Boolean),
      price: f.price.trim() ? Number(f.price) : null,
      currency: f.currency.trim() || "SAR",
      weightGrams: f.weightGrams.trim() ? Number(f.weightGrams) : null,
      imageUrl: hasImage ? f.imageUrl.trim() : null,
      availability: f.availability.trim() || null,
      descriptionSummary: f.descriptionSummary.trim() || null,
    };
  }

  function handleSave(ignoreDuplicate = false) {
    setMsg(null);
    startTransition(async () => {
      // 1) احفظ التعديلات أولاً (حالة REVIEWED)
      const upd = await updateImportedCoffee(imported.id, buildPayload());
      if (!upd.ok) {
        setMsg({ type: "error", text: upd.error });
        return;
      }
      // 2) ثم احفظ في الجدول الرئيسي
      const res = await saveImportedCoffee(imported.id, {
        ignoreDuplicate,
        imageType: hasImage ? f.imageType : CoffeeImageType.NONE,
        imagePermissionStatus: hasImage
          ? f.imagePermissionStatus
          : ImagePermissionStatus.PLACEHOLDER_ONLY,
        imageSource: hasImage ? f.imageSource : CoffeeImageSource.PLACEHOLDER,
        imageCredit: hasImage ? f.imageCredit.trim() || null : null,
        imageSourceUrl: f.imageSourceUrl.trim() || null,
        imagePermissionNote: f.imagePermissionNote.trim() || null,
      });
      if (res.ok) {
        setMsg({ type: "info", text: "تم الحفظ في قاعدة البيانات بنجاح." });
        router.refresh();
      } else {
        // إذا كان السبب تكراراً، نعرض زر تأكيد
        if (res.error.includes("تكرار")) {
          setNeedsDupConfirm(true);
        }
        setMsg({ type: "error", text: res.error });
      }
    });
  }

  function handleReject() {
    setMsg(null);
    startTransition(async () => {
      const res = await rejectImportedCoffee(imported.id);
      if (res.ok) {
        router.refresh();
      } else {
        setMsg({ type: "error", text: res.error });
      }
    });
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      {/* رأس البطاقة */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-stone-800">
            {f.coffeeName || "محصول بدون اسم"}
          </h3>
          {imported.importJob?.sourceUrl && (
            <a
              href={imported.importJob.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              dir="ltr"
              className="mt-0.5 block text-xs text-amber-700 underline"
            >
              {imported.importJob.sourceUrl}
            </a>
          )}
        </div>
        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500">
          {imported.status === "PENDING" ? "معلّق" : "قيد المراجعة"}
        </span>
      </div>

      {/* شبكة الحقول */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="اسم القهوة" value={f.coffeeName} confidence={conf.coffeeName} onChange={set("coffeeName")} />
        <Field label="المحمصة" value={f.roasteryName} confidence={conf.roasteryName} onChange={set("roasteryName")} />
        <Field label="دولة المنشأ" value={f.originCountry} confidence={conf.originCountry} onChange={set("originCountry")} />
        <Field label="المنطقة" value={f.region} confidence={conf.region} onChange={set("region")} />
        <Field label="المزرعة" value={f.farmName} confidence={conf.farmName} onChange={set("farmName")} />
        <Field label="المنتِج" value={f.producerName} confidence={conf.producerName} onChange={set("producerName")} />
        <Field label="المعالجة" value={f.process} confidence={conf.process} onChange={set("process")} />
        <Field label="الصنف (Variety)" value={f.variety} confidence={conf.variety} onChange={set("variety")} />
        <Field label="درجة التحميص" value={f.roastLevel} confidence={conf.roastLevel} onChange={set("roastLevel")} />
        <Field label="التوفّر" value={f.availability} confidence={conf.availability} onChange={set("availability")} />
        <Field label="السعر" value={f.price} confidence={conf.price} onChange={set("price")} ltr />
        <Field label="الوزن (جرام)" value={f.weightGrams} confidence={conf.weightGrams} onChange={set("weightGrams")} ltr />
        <div className="sm:col-span-2">
          <Field label="ملاحظات النكهة (افصل بفاصلة ،)" value={f.tastingNotes} confidence={conf.tastingNotes} onChange={set("tastingNotes")} />
        </div>
        <div className="sm:col-span-2">
          <Field label="طرق التحضير الموصى بها (افصل بفاصلة ،)" value={f.brewMethods} confidence={conf.brewMethods} onChange={set("brewMethods")} />
        </div>
        <div className="sm:col-span-2">
          <Field label="رابط الصورة" value={f.imageUrl} confidence={conf.imageUrl} onChange={set("imageUrl")} ltr />
          {!hasImage ? (
            <p className="mt-1 text-xs font-semibold text-amber-700">
              Needs Image — سيتم إنشاء المحصول بدون صورة، وسيظهر في صفحة الصور الناقصة.
            </p>
          ) : null}
        </div>
        <div>
          <label className="flex items-center text-xs font-medium text-stone-600">
            نوع الصورة
          </label>
          <select
            value={f.imageType}
            onChange={(e) => set("imageType")(e.target.value)}
            className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm focus:border-amber-600 focus:outline-none"
          >
            {Object.values(CoffeeImageType).map((value) => (
              <option key={value} value={value}>
                {IMAGE_TYPE_LABELS[value]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="flex items-center text-xs font-medium text-stone-600">
            حالة إذن الصورة
          </label>
          <select
            value={f.imagePermissionStatus}
            onChange={(e) => set("imagePermissionStatus")(e.target.value)}
            className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm focus:border-amber-600 focus:outline-none"
          >
            {Object.values(ImagePermissionStatus).map((value) => (
              <option key={value} value={value}>
                {IMAGE_PERMISSION_LABELS[value]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="flex items-center text-xs font-medium text-stone-600">
            مصدر الصورة
          </label>
          <select
            value={f.imageSource}
            onChange={(e) => set("imageSource")(e.target.value)}
            className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm focus:border-amber-600 focus:outline-none"
          >
            {Object.values(CoffeeImageSource).map((value) => (
              <option key={value} value={value}>
                {IMAGE_SOURCE_LABELS[value]}
              </option>
            ))}
          </select>
        </div>
        <Field label="كريديت الصورة" value={f.imageCredit} confidence={undefined} onChange={set("imageCredit")} />
        <div className="sm:col-span-2">
          <Field label="رابط مصدر الصورة" value={f.imageSourceUrl} confidence={undefined} onChange={set("imageSourceUrl")} ltr />
        </div>
        <div className="sm:col-span-2">
          <Field label="ملاحظة إذن الصورة" value={f.imagePermissionNote} confidence={undefined} onChange={set("imagePermissionNote")} textarea />
        </div>
        <div className="sm:col-span-2">
          <Field label="ملخص الوصف" value={f.descriptionSummary} confidence={conf.descriptionSummary} onChange={set("descriptionSummary")} textarea />
        </div>
      </div>

      {/* رسالة الحالة */}
      {msg && (
        <p className={`mt-3 text-sm ${msg.type === "error" ? "text-red-600" : "text-green-700"}`}>
          {msg.text}
        </p>
      )}

      {/* الأزرار */}
      <div className="mt-4 flex flex-wrap gap-2">
        {needsDupConfirm ? (
          <button
            onClick={() => handleSave(true)}
            disabled={isPending}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white
                       hover:bg-red-700 disabled:opacity-50"
          >
            تأكيد الحفظ رغم التكرار
          </button>
        ) : (
          <button
            onClick={() => handleSave(false)}
            disabled={isPending}
            className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white
                       hover:bg-amber-800 disabled:opacity-50"
          >
            {isPending ? "جارٍ الحفظ..." : "حفظ في قاعدة البيانات"}
          </button>
        )}
        <button
          onClick={handleReject}
          disabled={isPending}
          className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium
                     text-stone-600 hover:bg-stone-50 disabled:opacity-50"
        >
          رفض
        </button>
      </div>
    </div>
  );
}
