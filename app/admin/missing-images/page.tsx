import Link from "next/link";
import { ImageOff } from "lucide-react";
import { ImagePermissionStatus, type CoffeeProcess } from "@prisma/client";
import {
  getMissingImageAdminData,
  type MissingImageFilters,
} from "@/actions/missing-images";
import {
  BulkApproveByRoastery,
  MissingImageRowForm,
} from "@/components/admin/missing-image-actions";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { formatProcess } from "@/lib/coffee-labels";

export const metadata = { title: "الصور الناقصة — BunnList" };

type PageProps = {
  searchParams?: Promise<{
    roasterId?: string;
    permissionStatus?: string;
    hasSourceUrl?: string;
    blackKnight?: string;
  }>;
};

const PERMISSION_LABELS: Record<ImagePermissionStatus, string> = {
  APPROVED: "موافق عليها",
  PENDING: "بانتظار الموافقة",
  REJECTED: "مرفوضة",
  PLACEHOLDER_ONLY: "Needs Image",
};

function shortenUrl(url: string) {
  if (url.length <= 52) return url;
  return `${url.slice(0, 28)}...${url.slice(-18)}`;
}

function parseFilters(params: Awaited<NonNullable<PageProps["searchParams"]>>): MissingImageFilters {
  const permissionStatus = Object.values(ImagePermissionStatus).includes(
    params.permissionStatus as ImagePermissionStatus,
  )
    ? (params.permissionStatus as ImagePermissionStatus)
    : "";

  return {
    roasterId: params.roasterId ?? "",
    permissionStatus,
    hasSourceUrl:
      params.hasSourceUrl === "yes" || params.hasSourceUrl === "no"
        ? params.hasSourceUrl
        : "",
    blackKnightOnly: params.blackKnight === "1",
  };
}

function Filters({
  filters,
  roasters,
}: {
  filters: MissingImageFilters;
  roasters: { id: string; nameAr: string }[];
}) {
  return (
    <form className="grid gap-3 rounded-2xl border border-stone-200 bg-white p-4 md:grid-cols-4">
      <div>
        <label className="mb-1.5 block text-xs font-bold text-stone-500">المحمصة</label>
        <Select name="roasterId" defaultValue={filters.roasterId ?? ""} className="w-full">
          <option value="">كل المحامص</option>
          {roasters.map((roaster) => (
            <option key={roaster.id} value={roaster.id}>
              {roaster.nameAr}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-bold text-stone-500">حالة الإذن</label>
        <Select
          name="permissionStatus"
          defaultValue={filters.permissionStatus ?? ""}
          className="w-full"
        >
          <option value="">كل الحالات</option>
          {Object.values(ImagePermissionStatus).map((status) => (
            <option key={status} value={status}>
              {PERMISSION_LABELS[status]}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-bold text-stone-500">رابط مصدر المنتج</label>
        <Select name="hasSourceUrl" defaultValue={filters.hasSourceUrl ?? ""} className="w-full">
          <option value="">الكل</option>
          <option value="yes">يوجد رابط</option>
          <option value="no">لا يوجد رابط</option>
        </Select>
      </div>
      {filters.blackKnightOnly ? <input type="hidden" name="blackKnight" value="1" /> : null}
      <div className="flex items-end gap-2">
        <button className="h-11 rounded-md bg-amber-700 px-4 text-sm font-semibold text-white hover:bg-amber-800">
          تطبيق
        </button>
        <Link
          href="/admin/missing-images"
          className="inline-flex h-11 items-center rounded-md border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-700 hover:bg-stone-50"
        >
          مسح
        </Link>
      </div>
    </form>
  );
}

export default async function MissingImagesPage({ searchParams }: PageProps) {
  const resolved = searchParams ? await searchParams : {};
  const filters = parseFilters(resolved);
  const { lots, roasters } = await getMissingImageAdminData(filters);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-stone-950">الصور الناقصة</h1>
          <p className="mt-1 text-sm text-stone-500">
            {lots.length} محصول يحتاج صورة رسمية أو اعتماد إذن الصورة
          </p>
        </div>
        <Link
          href="/admin/coffees"
          className="text-sm font-semibold text-amber-700 hover:text-amber-800"
        >
          العودة للمحاصيل
        </Link>
      </div>

      <Filters filters={filters} roasters={roasters} />
      <div className="flex flex-wrap gap-2">
        <Link
          href="/admin/missing-images?blackKnight=1"
          className={`inline-flex h-10 items-center rounded-full border px-4 text-sm font-semibold transition ${
            filters.blackKnightOnly
              ? "border-stone-900 bg-stone-900 text-white"
              : "border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
          }`}
        >
          Black Knight only
        </Link>
        {filters.blackKnightOnly ? (
          <Link
            href="/admin/missing-images"
            className="inline-flex h-10 items-center rounded-full border border-stone-200 bg-white px-4 text-sm font-semibold text-stone-700 hover:bg-stone-50"
          >
            عرض كل المحامص
          </Link>
        ) : null}
      </div>
      <BulkApproveByRoastery roasters={roasters} />

      {lots.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-white py-20 text-center">
          <ImageOff className="h-10 w-10 text-stone-300" />
          <p className="mt-3 text-lg font-bold text-stone-600">
            لا توجد منتجات ناقصة حسب الفلاتر الحالية
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {lots.map((lot) => (
            <article key={lot.id} className="rounded-2xl border border-stone-200 bg-white p-4">
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(520px,1.3fr)]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-black text-stone-950">{lot.nameAr}</h2>
                    <Badge variant={lot.imagePermissionStatus === "APPROVED" ? "soft" : "gold"}>
                      {PERMISSION_LABELS[lot.imagePermissionStatus]}
                    </Badge>
                  </div>
                  <dl className="mt-3 grid gap-2 text-sm text-stone-600 sm:grid-cols-2">
                    <div>
                      <dt className="text-xs font-bold text-stone-400">المحمصة</dt>
                      <dd>{lot.roaster.nameAr}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-bold text-stone-400">الدولة</dt>
                      <dd>{lot.originCountry.nameAr}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-bold text-stone-400">المعالجة</dt>
                      <dd>{formatProcess(lot.process as CoffeeProcess, lot.processLabel)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-bold text-stone-400">رابط المصدر</dt>
                      {lot.productSourceUrl ? (
                        <a
                          href={lot.productSourceUrl}
                          title={lot.productSourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="break-all text-amber-700 underline [overflow-wrap:anywhere]"
                          dir="ltr"
                        >
                          {shortenUrl(lot.productSourceUrl)}
                        </a>
                      ) : (
                        <dd className="text-stone-300">غير متوفر</dd>
                      )}
                    </div>
                  </dl>
                </div>
                <MissingImageRowForm lot={lot} />
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
