import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ComingSoon } from "@/components/site/Chrome";
import { prisma } from "@/lib/prisma";
import { recipeByShareCode, type MobileRecipe } from "@/lib/mobile/recipes";

// A shared recipe (bunnlist.com/r/<code>) opens straight in the app through Universal
// Links. This page shows when the app isn't installed: the recipe's outline and its code.
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "وصفة في BunnList", robots: { index: false } };

const grams = (n: number | null) => (n == null ? null : `${Number.isInteger(n) ? n : n.toFixed(1)}غ`);

export default async function SharedRecipe({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  let recipe: MobileRecipe | null = null;
  try { recipe = await recipeByShareCode(prisma, code, null); } catch { recipe = null; }
  const facts = recipe
    ? [
        ["البن", grams(recipe.doseGrams)],
        [recipe.methodCode === "ESPRESSO" ? "الناتج" : "الماء", grams(recipe.methodCode === "ESPRESSO" ? recipe.yieldGrams : recipe.hotWaterGrams)],
        ["الثلج", recipe.temperature === "iced" ? grams(recipe.iceGrams) : null],
      ].filter((f): f is [string, string] => !!f[1])
    : [];
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg)] px-6 py-16 text-center">
      <Image src="/site/app-icon.png" alt="BunnList" width={96} height={96} className="rounded-[24px] shadow-[0_8px_24px_rgba(0,0,0,0.12)]" />
      {recipe ? (
        <>
          <p className="mt-8 text-[15px] text-[var(--ink-2)]">وصفة من {recipe.authorName}</p>
          <h1 className="mt-2 text-[32px] font-bold tracking-tight sm:text-[44px]">{recipe.title || "وصفة قهوة"}</h1>
          {recipe.lot && <p className="mt-2 text-[17px] text-[var(--ink-2)]">{recipe.lot.nameAr} · {recipe.lot.roasterNameAr}</p>}
          {facts.length > 0 && (
            <dl className="mt-6 flex gap-3">
              {facts.map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-white px-5 py-3 shadow-[0_2px_10px_rgba(0,0,0,0.06)]">
                  <dt className="text-[13px] text-[var(--ink-2)]">{label}</dt>
                  <dd className="text-[20px] font-bold">{value}</dd>
                </div>
              ))}
            </dl>
          )}
          <p className="mt-8 max-w-[32ch] text-[17px] leading-relaxed text-[var(--ink-2)]">
            ثبّت BunnList وافتح الرابط، أو اكتب هذا الكود في «استيراد وصفة»:
          </p>
          <p dir="ltr" className="mt-3 rounded-2xl bg-white px-6 py-3 font-mono text-[28px] font-bold tracking-[0.3em] shadow-[0_2px_10px_rgba(0,0,0,0.06)]">{code.toUpperCase()}</p>
        </>
      ) : (
        <>
          <h1 className="mt-8 text-[32px] font-bold tracking-tight sm:text-[44px]">ما لقينا هذه الوصفة.</h1>
          <p className="mt-4 max-w-[30ch] text-[19px] leading-relaxed text-[var(--ink-2)]">يمكن الكود غلط، أو صاحبها حذفها.</p>
        </>
      )}
      <div className="mt-8"><ComingSoon /></div>
      <Link href="/" className="mt-6 text-[15px] text-[var(--accent)] underline">تعرّف على BunnList</Link>
    </main>
  );
}
