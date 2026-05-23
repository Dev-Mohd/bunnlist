"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, X, Plus, CheckCircle } from "lucide-react";
import {
  CoffeeImageSource,
  CoffeeImageType,
  ImagePermissionStatus,
  type BrewMethod,
  type CoffeeProcess,
  type OriginCountry,
  type Roaster,
} from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/ui/image-upload";
import { brewMethodLabels, processLabels } from "@/lib/coffee-labels";
import { createCoffeeLot, updateCoffeeLot, type CoffeeLotFull } from "@/actions/admin";
import type { CoffeeFormValues } from "@/lib/validations/coffee";

type Props = {
  initialData?: CoffeeLotFull;
  roasters: Pick<Roaster, "id" | "nameAr">[];
  countries: Pick<OriginCountry, "id" | "nameAr">[];
  mode: "create" | "edit";
  initialImageUrl?: string;
};

const BREW_METHODS = Object.keys(brewMethodLabels) as BrewMethod[];
const PROCESS_OPTIONS = Object.keys(processLabels) as CoffeeProcess[];
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
  PLACEHOLDER_ONLY: "استخدم الصورة البديلة فقط",
};
const IMAGE_SOURCE_LABELS: Record<CoffeeImageSource, string> = {
  ROASTERY_WEBSITE: "موقع المحمصة",
  ROASTERY_PROVIDED: "مرسلة من المحمصة",
  INSTAGRAM: "إنستغرام",
  USER_UPLOAD: "رفع مستخدم",
  PLACEHOLDER: "صورة بديلة",
};

type FormErrors = Partial<Record<keyof CoffeeFormValues | "root", string>>;

export function CoffeeForm({ initialData, roasters, countries, mode, initialImageUrl }: Props) {
  const router = useRouter();

  const [name, setName] = React.useState(initialData?.name ?? "");
  const [nameAr, setNameAr] = React.useState(initialData?.nameAr ?? "");
  const [roasterId, setRoasterId] = React.useState(initialData?.roasterId ?? "");
  const [originCountryId, setOriginCountryId] = React.useState(
    initialData?.originCountryId ?? "",
  );
  const [region, setRegion] = React.useState(initialData?.region ?? "");
  const [regionAr, setRegionAr] = React.useState(initialData?.regionAr ?? "");
  const [process, setProcess] = React.useState<CoffeeProcess | "">(
    initialData?.process ?? "",
  );
  const [variety, setVariety] = React.useState(initialData?.variety ?? "");
  const [altitudeMeters, setAltitudeMeters] = React.useState(
    initialData?.altitudeMeters?.toString() ?? "",
  );
  const [flavorNotes, setFlavorNotes] = React.useState<string[]>(
    initialData?.flavorNotes ?? [],
  );
  const [flavorInput, setFlavorInput] = React.useState("");
  const [brewMethods, setBrewMethods] = React.useState<BrewMethod[]>(
    initialData?.recommendedBrewMethods ?? [],
  );
  const [description, setDescription] = React.useState(initialData?.description ?? "");
  const [descriptionAr, setDescriptionAr] = React.useState(
    initialData?.descriptionAr ?? "",
  );
  const [imagePath, setImagePath] = React.useState(initialData?.imagePath ?? "");
  const [imageUrl, setImageUrl] = React.useState(initialData?.imageUrl ?? "");
  const [imageType, setImageType] = React.useState<CoffeeImageType>(
    initialData?.imageType ?? CoffeeImageType.NONE,
  );
  const [imagePermissionStatus, setImagePermissionStatus] =
    React.useState<ImagePermissionStatus>(
      initialData?.imagePermissionStatus ?? ImagePermissionStatus.PLACEHOLDER_ONLY,
    );
  const [imageSource, setImageSource] = React.useState<CoffeeImageSource>(
    initialData?.imageSource ?? CoffeeImageSource.PLACEHOLDER,
  );
  const [imageCredit, setImageCredit] = React.useState(initialData?.imageCredit ?? "");
  const [imageSourceUrl, setImageSourceUrl] = React.useState(
    initialData?.imageSourceUrl ?? "",
  );
  const [imagePermissionNote, setImagePermissionNote] = React.useState(
    initialData?.imagePermissionNote ?? "",
  );
  const [published, setPublished] = React.useState(
    initialData ? initialData.publishedAt !== null : true,
  );

  const [errors, setErrors] = React.useState<FormErrors>({});
  const [pending, setPending] = React.useState(false);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  function addFlavorNote() {
    const note = flavorInput.trim();
    if (!note || flavorNotes.includes(note)) return;
    setFlavorNotes((prev) => [...prev, note]);
    setFlavorInput("");
  }

  function removeFlavorNote(note: string) {
    setFlavorNotes((prev) => prev.filter((n) => n !== note));
  }

  function toggleBrewMethod(method: BrewMethod) {
    setBrewMethods((prev) =>
      prev.includes(method) ? prev.filter((m) => m !== method) : [...prev, method],
    );
  }

  function validate(): FormErrors {
    const errs: FormErrors = {};
    if (name.trim().length < 2) errs.name = "الاسم الإنجليزي يجب أن يكون حرفين على الأقل";
    if (nameAr.trim().length < 2) errs.nameAr = "الاسم العربي مطلوب";
    if (!roasterId) errs.roasterId = "اختر محمصة";
    if (!originCountryId) errs.originCountryId = "اختر بلد المنشأ";
    if (!process) errs.process = "اختر طريقة المعالجة";
    if (flavorNotes.length === 0) errs.flavorNotes = "أضف نكهة واحدة على الأقل";
    if (brewMethods.length === 0)
      errs.recommendedBrewMethods = "اختر طريقة تحضير واحدة على الأقل";
    const alt = altitudeMeters === "" ? null : Number(altitudeMeters);
    if (alt !== null && (isNaN(alt) || alt < 0 || alt > 8000))
      errs.altitudeMeters = "الارتفاع يجب أن يكون بين 0 و 8000";
    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setPending(true);

    const formValues: CoffeeFormValues = {
      name: name.trim(),
      nameAr: nameAr.trim(),
      roasterId,
      originCountryId,
      region: region.trim() || undefined,
      regionAr: regionAr.trim() || undefined,
      process: process as CoffeeProcess,
      variety: variety.trim() || undefined,
      altitudeMeters: altitudeMeters === "" ? null : Number(altitudeMeters),
      flavorNotes,
      recommendedBrewMethods: brewMethods,
      description: description.trim() || undefined,
      descriptionAr: descriptionAr.trim() || undefined,
      imagePath: imagePath || undefined,
      imageUrl: imageUrl.trim() || undefined,
      imageType,
      imagePermissionStatus,
      imageSource,
      imageCredit: imageCredit.trim() || undefined,
      imageSourceUrl: imageSourceUrl.trim() || undefined,
      imagePermissionNote: imagePermissionNote.trim() || undefined,
      imageApprovedAt: initialData?.imageApprovedAt ?? null,
      published,
    };

    const result =
      mode === "create"
        ? await createCoffeeLot(formValues)
        : await updateCoffeeLot(initialData!.id, formValues);

    setPending(false);

    if (!result.success) {
      setErrors({ root: result.error });
      return;
    }

    setSuccessMsg(
      mode === "create" ? "تم إنشاء المحصول بنجاح!" : "تم حفظ التغييرات بنجاح!",
    );
    setTimeout(() => router.push(`/coffees/${result.slug}`), 1200);
  }

  const isValid =
    name.trim().length >= 2 &&
    nameAr.trim().length >= 2 &&
    !!roasterId &&
    !!originCountryId &&
    !!process &&
    flavorNotes.length > 0 &&
    brewMethods.length > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {successMsg ? (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <CheckCircle className="h-5 w-5 shrink-0 text-emerald-600" />
          <p className="text-sm font-semibold text-emerald-800">{successMsg}</p>
        </div>
      ) : null}

      {errors.root ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {errors.root}
        </p>
      ) : null}

      {/* ── المعلومات الأساسية ── */}
      <section className="rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="mb-5 text-base font-black text-stone-950">المعلومات الأساسية</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="الاسم الإنجليزي (للـ slug)" error={errors.name} required>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: Yirgacheffe Natural"
              dir="ltr"
            />
          </Field>
          <Field label="الاسم العربي" error={errors.nameAr} required>
            <Input
              value={nameAr}
              onChange={(e) => setNameAr(e.target.value)}
              placeholder="مثال: يرغاشيف طبيعي"
            />
          </Field>
          <Field label="المحمصة" error={errors.roasterId} required>
            <Select value={roasterId} onChange={(e) => setRoasterId(e.target.value)} className="w-full">
              <option value="">اختر محمصة...</option>
              {roasters.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nameAr}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="بلد المنشأ" error={errors.originCountryId} required>
            <Select
              value={originCountryId}
              onChange={(e) => setOriginCountryId(e.target.value)}
              className="w-full"
            >
              <option value="">اختر بلد...</option>
              {countries.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nameAr}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {/* ── حالة النشر ── */}
        <div className="mt-5 border-t border-stone-100 pt-4">
          <label className="flex cursor-pointer items-center gap-3">
            <Checkbox
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
            />
            <div>
              <span className="text-sm font-bold text-stone-950">منشور</span>
              <p className="text-xs text-stone-400">
                {published
                  ? "يظهر للزوار في صفحة المحاصيل"
                  : "مسودة — لا يظهر للزوار"}
              </p>
            </div>
            {published ? (
              <span className="mr-auto rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                منشور
              </span>
            ) : (
              <span className="mr-auto rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-500">
                مسودة
              </span>
            )}
          </label>
        </div>
      </section>

      {/* ── التفاصيل ── */}
      <section className="rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="mb-5 text-base font-black text-stone-950">التفاصيل</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="المنطقة (إنجليزي)">
            <Input
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="مثال: Gedeo Zone"
              dir="ltr"
            />
          </Field>
          <Field label="المنطقة (عربي)">
            <Input
              value={regionAr}
              onChange={(e) => setRegionAr(e.target.value)}
              placeholder="مثال: منطقة جيدو"
            />
          </Field>
          <Field label="طريقة المعالجة" error={errors.process} required>
            <Select
              value={process}
              onChange={(e) => setProcess(e.target.value as CoffeeProcess)}
              className="w-full"
            >
              <option value="">اختر طريقة...</option>
              {PROCESS_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {processLabels[p]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="السلالة">
            <Input
              value={variety}
              onChange={(e) => setVariety(e.target.value)}
              placeholder="مثال: Geisha"
            />
          </Field>
          <Field label="الارتفاع (متر)" error={errors.altitudeMeters}>
            <Input
              type="number"
              value={altitudeMeters}
              onChange={(e) => setAltitudeMeters(e.target.value)}
              placeholder="مثال: 1800"
              min={0}
              max={8000}
            />
          </Field>
        </div>
      </section>

      {/* ── النكهات والتحضير ── */}
      <section className="rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="mb-5 text-base font-black text-stone-950">النكهات والتحضير</h2>

        <Field label="النكهات" error={errors.flavorNotes} required>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={flavorInput}
                onChange={(e) => setFlavorInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addFlavorNote();
                  }
                }}
                placeholder="مثال: توت أحمر، شوكولاتة..."
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={addFlavorNote}
                className="shrink-0"
              >
                <Plus className="h-4 w-4" />
                أضف
              </Button>
            </div>
            {flavorNotes.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {flavorNotes.map((note) => (
                  <span
                    key={note}
                    className="flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800"
                  >
                    {note}
                    <button
                      type="button"
                      onClick={() => removeFlavorNote(note)}
                      className="text-amber-600 hover:text-amber-900"
                      aria-label={`حذف ${note}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </Field>

        <div className="mt-5">
          <p className="mb-3 text-sm font-bold text-stone-950">
            طرق التحضير المقترحة <span className="text-red-500">*</span>
          </p>
          {errors.recommendedBrewMethods ? (
            <p className="mb-2 text-xs font-semibold text-red-600">
              {errors.recommendedBrewMethods}
            </p>
          ) : null}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {BREW_METHODS.map((method) => (
              <label
                key={method}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-stone-200 px-3 py-2.5 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
              >
                <Checkbox
                  checked={brewMethods.includes(method)}
                  onChange={() => toggleBrewMethod(method)}
                />
                {brewMethodLabels[method]}
              </label>
            ))}
          </div>
        </div>
      </section>

      {/* ── الوصف ── */}
      <section className="rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="mb-5 text-base font-black text-stone-950">الوصف</h2>
        <div className="grid gap-5">
          <Field label="الوصف الإنجليزي">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="Brief description of this coffee lot..."
              dir="ltr"
              className="w-full rounded-md border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 shadow-sm outline-none transition placeholder:text-stone-400 focus:border-amber-700 focus:ring-2 focus:ring-amber-700/20"
            />
          </Field>
          <Field label="الوصف العربي">
            <textarea
              value={descriptionAr}
              onChange={(e) => setDescriptionAr(e.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="وصف تفصيلي لهذا المحصول..."
              className="w-full rounded-md border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 shadow-sm outline-none transition placeholder:text-stone-400 focus:border-amber-700 focus:ring-2 focus:ring-amber-700/20"
            />
          </Field>
        </div>
      </section>

      {/* ── الصورة ── */}
      <section className="rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="mb-5 text-base font-black text-stone-950">الصورة</h2>

        <div className="mb-6 grid gap-5 sm:grid-cols-2">
          <Field label="رابط الصورة الرسمي" error={errors.imageUrl}>
            <Input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/coffee.jpg"
              dir="ltr"
            />
          </Field>
          <Field label="نوع الصورة">
            <Select
              value={imageType}
              onChange={(e) => setImageType(e.target.value as CoffeeImageType)}
              className="w-full"
            >
              {Object.values(CoffeeImageType).map((value) => (
                <option key={value} value={value}>
                  {IMAGE_TYPE_LABELS[value]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="حالة الإذن">
            <Select
              value={imagePermissionStatus}
              onChange={(e) =>
                setImagePermissionStatus(e.target.value as ImagePermissionStatus)
              }
              className="w-full"
            >
              {Object.values(ImagePermissionStatus).map((value) => (
                <option key={value} value={value}>
                  {IMAGE_PERMISSION_LABELS[value]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="مصدر الصورة">
            <Select
              value={imageSource}
              onChange={(e) => setImageSource(e.target.value as CoffeeImageSource)}
              className="w-full"
            >
              {Object.values(CoffeeImageSource).map((value) => (
                <option key={value} value={value}>
                  {IMAGE_SOURCE_LABELS[value]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="نسبة الصورة / الكريديت">
            <Input
              value={imageCredit}
              onChange={(e) => setImageCredit(e.target.value)}
              placeholder="مثال: محمصة كامل ستيب"
            />
          </Field>
          <Field label="رابط مصدر الصورة" error={errors.imageSourceUrl}>
            <Input
              value={imageSourceUrl}
              onChange={(e) => setImageSourceUrl(e.target.value)}
              placeholder="https://..."
              dir="ltr"
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="ملاحظة الإذن">
              <textarea
                value={imagePermissionNote}
                onChange={(e) => setImagePermissionNote(e.target.value)}
                rows={3}
                maxLength={1000}
                placeholder="مثال: تم الحصول على موافقة استخدام صور المنتجات عبر البريد."
                className="w-full rounded-md border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 shadow-sm outline-none transition placeholder:text-stone-400 focus:border-amber-700 focus:ring-2 focus:ring-amber-700/20"
              />
            </Field>
          </div>
        </div>

        {imageUrl && imageType === "OFFICIAL" && imagePermissionStatus === "APPROVED" ? (
          <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
            هذه الصورة ستظهر للزوار لأنها رسمية وموافق عليها.
          </p>
        ) : (
          <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
            لن تظهر الصورة للزوار حتى يكون النوع “رسمية” وحالة الإذن “موافق عليها”.
          </p>
        )}

        {initialImageUrl && !imagePath.startsWith("lots/") && (
          <div className="mb-4 rounded-lg border border-stone-200 bg-stone-50 p-3">
            <p className="mb-2 text-xs font-semibold text-stone-500">الصورة الحالية:</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={initialImageUrl}
              alt="الصورة الحالية"
              className="h-32 w-32 rounded-lg object-cover"
            />
          </div>
        )}

        <ImageUpload
          onUploaded={(path) => setImagePath(path)}
          label={initialData?.imagePath ? "تغيير الصورة" : "صورة المحصول"}
        />
      </section>

      {/* ── زر الحفظ ── */}
      <div className="flex items-center justify-end gap-4 pb-8">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
          disabled={pending}
        >
          إلغاء
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={pending || !isValid || !!successMsg}
          className="min-w-[160px]"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {mode === "create" ? "حفظ المحصول" : "حفظ التغييرات"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  required,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-bold text-stone-950">
        {label}
        {required ? <span className="mr-1 text-red-500">*</span> : null}
      </label>
      {children}
      {error ? <p className="text-xs font-semibold text-red-600">{error}</p> : null}
    </div>
  );
}
