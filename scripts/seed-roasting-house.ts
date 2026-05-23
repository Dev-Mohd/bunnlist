/**
 * بيت التحميص — Roasting House
 * يضيف المحمصة + الدول + 8 محاصيل جديدة
 * يتجاهل تلقائيًا أي محصول موجود مسبقًا بنفس الاسم + المحمصة
 *
 * تشغيل: cd bunnlist-web && npx tsx scripts/seed-roasting-house.ts
 */

import { prisma } from "@/lib/prisma";
import type { BrewMethod, CoffeeProcess } from "@prisma/client";

// ── توليد slug ────────────────────────────────────────────────────
function makeSlug(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "coffee"
  );
}

async function getUniqueSlug(base: string): Promise<string> {
  let slug = base;
  let counter = 1;
  for (;;) {
    const existing = await prisma.coffeeLot.findFirst({
      where: { slug },
      select: { id: true },
    });
    if (!existing) return slug;
    counter++;
    slug = `${base}-${counter}`;
  }
}

// ── بيانات الدول المطلوبة ─────────────────────────────────────────
const COUNTRIES = [
  { isoCode: "CO", nameAr: "كولومبيا",   nameEn: "Colombia"    },
  { isoCode: "CR", nameAr: "كوستاريكا",  nameEn: "Costa Rica"  },
  { isoCode: "ID", nameAr: "إندونيسيا",  nameEn: "Indonesia"   },
  { isoCode: "GT", nameAr: "غواتيمالا",  nameEn: "Guatemala"   },
  { isoCode: "SV", nameAr: "السلفادور",  nameEn: "El Salvador" },
  { isoCode: "ET", nameAr: "إثيوبيا",    nameEn: "Ethiopia"    },
] as const;

// ── المحاصيل ─────────────────────────────────────────────────────
const COFFEES = [
  {
    name: "Colombia Select Decaf",
    nameAr: "كولومبيا سيليكت - قهوة خالية من الكافيين",
    isoCode: "CO",
    region: "Colombia",
    farm: "مجتمع مزارعين في كولومبيا",
    producer: null,
    process: "WASHED",
    variety: ["Caturra", "Typica"],
    roastLevel: null,
    flavorNotes: ["Caramel", "Brown Sugar", "Milk Chocolate"],
    brewMethods: ["V60", "ESPRESSO"],
    imageUrl:
      "https://roastinghouse.sa/media/catalog/product/cache/c61fa29da8d2a02fc64fb550224ec6e4/s/e/select_decafe-2.png",
    descriptionAr:
      "محصول كولومبي خالٍ من الكافيين بطريقة المعالجة المائية، مناسب للقهوة المقطرة والاسبريسو.",
    description:
      "Colombian decaf coffee processed using water decaffeination, suitable for filter coffee and espresso.",
  },
  {
    name: "Costa Rica Santa Maria Washed",
    nameAr: "كوستاريكا سانتا ماريا المغسولة",
    isoCode: "CR",
    region: "Dota, San Jose",
    farm: "جمعية دوتا التعاونية لمزارعي القهوة",
    producer: "جمعية دوتا التعاونية",
    process: "WASHED",
    variety: ["Catuai", "Caturra"],
    roastLevel: null,
    flavorNotes: ["Flowers", "Roasted Nuts", "White Chocolate"],
    brewMethods: ["V60", "ESPRESSO"],
    imageUrl:
      "https://roastinghouse.sa/media/catalog/product/cache/c61fa29da8d2a02fc64fb550224ec6e4/c/o/costa-rica-weashed.jpg",
    descriptionAr:
      "قهوة كوستاريكية مغسولة بإيحاءات زهور، مكسرات محمصة، وشوكولاتة بيضاء. مناسبة للمقطرة والاسبريسو ومشروبات الحليب.",
    description:
      "Washed Costa Rican coffee with notes of flowers, roasted nuts, and white chocolate. Suitable for filter coffee, espresso, and milk drinks.",
  },
  {
    name: "Java Estate Blawan",
    nameAr: "جافا ايستيت بلاوان",
    isoCode: "ID",
    region: "Java",
    farm: "Estate Blawan",
    producer: "Estate Blawan",
    process: "WASHED",
    variety: ["Typica"],
    roastLevel: null,
    flavorNotes: ["Cacao", "Grape", "Chocolate"],
    brewMethods: ["V60", "ESPRESSO"],
    imageUrl:
      "https://roastinghouse.sa/media/catalog/product/cache/c61fa29da8d2a02fc64fb550224ec6e4/j/a/java_11.jpg",
    descriptionAr:
      "قهوة من مزرعة ايستيت بلاوان في جزيرة جاوة بإندونيسيا، معالجة مغسولة، بإيحاءات كاكاو وعنب وشوكولاتة.",
    description:
      "Washed Indonesian coffee from Estate Blawan in Java, with notes of cacao, grape, and chocolate.",
  },
  {
    name: "Guatemala Buena Vista",
    nameAr: "غواتيمالا بوينا فيستا",
    isoCode: "GT",
    region: "Antigua, San Juan",
    farm: null,
    producer: "Maria Cristina",
    process: "WASHED",
    variety: ["Bourbon", "Caturra"],
    roastLevel: null,
    flavorNotes: ["Figs", "Flowers", "Chocolate", "Citrus Apple"],
    brewMethods: ["V60"],
    imageUrl:
      "https://roastinghouse.sa/media/catalog/product/cache/c61fa29da8d2a02fc64fb550224ec6e4/g/u/guatemala.jpg",
    descriptionAr:
      "محصول غواتيمالي من منطقة أنتيغوا، سان خوان، معالجة مغسولة، بإيحاءات تين، زهور، شوكولاتة، وحمضية التفاح.",
    description:
      "Washed Guatemalan coffee from Antigua, San Juan, with notes of figs, flowers, chocolate, and citrus apple acidity.",
  },
  {
    name: "Colombia Agustino",
    nameAr: "كولومبيا اغوستينو",
    isoCode: "CO",
    region: "Huila",
    farm: "Agustino Forest",
    producer: "جمعية كو أغوستينوس",
    process: "WASHED",
    variety: ["Colombia", "Caturra"],
    roastLevel: null,
    flavorNotes: ["Fruit Tea", "Hibiscus", "Zesty Acidity"],
    brewMethods: ["V60", "ESPRESSO"],
    imageUrl:
      "https://roastinghouse.sa/media/catalog/product/cache/c61fa29da8d2a02fc64fb550224ec6e4/a/g/agustino_.jpg",
    descriptionAr:
      "قهوة كولومبية مغسولة من جمعية كو أغوستينوس، بإيحاءات شاي فواكه، كركديه، وحمضية لطيفة. مناسبة للمقطرة والاسبريسو.",
    description:
      "Washed Colombian coffee from Co Agustinos association, with notes of fruit tea, hibiscus, and zesty acidity. Suitable for filter and espresso.",
  },
  {
    name: "El Salvador Aida Batlle",
    nameAr: "السلفادور عايدة باتل",
    isoCode: "SV",
    region: "Kilimanjaro, Santa Ana",
    farm: "Finca Kilimanjaro",
    producer: "Aida Batlle",
    process: "NATURAL",
    variety: ["Kenya SL28", "Kenya SL34"],
    roastLevel: null,
    flavorNotes: ["Toffee Sweet", "White Grapes", "Grapefruit"],
    brewMethods: ["V60"],
    imageUrl:
      "https://roastinghouse.sa/media/catalog/product/cache/c61fa29da8d2a02fc64fb550224ec6e4/a/i/aida_batlle-2.png",
    descriptionAr:
      "قهوة من المزارعة عايدة باتل في السلفادور، معالجة مجففة، بقوام حلو يشبه التوفي ولمسات عنب أبيض وقريب فروت.",
    description:
      "Natural processed El Salvador coffee by Aida Batlle, with toffee sweetness, white grapes, and grapefruit notes.",
  },
  {
    name: "Ethiopia Kedida Natural",
    nameAr: "اثيوبيا كديدا المجففة",
    isoCode: "ET",
    region: "Kedida",
    farm: "مزارعي القهوة في كديدا",
    producer: "مزارعي كديدا",
    process: "NATURAL",
    variety: ["Heirloom"],
    roastLevel: null,
    flavorNotes: ["Orange", "Red Fruits", "Flowers"],
    brewMethods: ["V60", "ESPRESSO"],
    imageUrl:
      "https://roastinghouse.sa/media/catalog/product/cache/c61fa29da8d2a02fc64fb550224ec6e4/k/a/kadida-2.png",
    descriptionAr:
      "قهوة إثيوبية من كديدا، معالجة مجففة، بإيحاءات برتقال وفواكه حمراء وزهور. مناسبة للمقطرة والاسبريسو ومشروبات الحليب.",
    description:
      "Natural Ethiopian coffee from Kedida, with notes of orange, red fruits, and flowers. Suitable for filter, espresso, and milk drinks.",
  },
  {
    name: "Ethiopia Omni Honey Process",
    nameAr: "اثيوبيا أومني - معالجة عسلية",
    isoCode: "ET",
    region: "Yirgacheffe, Gedeo",
    farm: "Banko Taratu",
    producer: "أكثر من 500 مزارع",
    process: "HONEY",
    variety: ["Heirloom"],
    roastLevel: "Omni",
    flavorNotes: ["Floral", "Cream Fudge", "Biscuits"],
    brewMethods: ["V60", "ESPRESSO"],
    imageUrl:
      "https://roastinghouse.sa/media/catalog/product/cache/c61fa29da8d2a02fc64fb550224ec6e4/o/m/omni-2.png",
    descriptionAr:
      "محصول إثيوبي من بانكو تاراتو، معالجة عسلية، بتحميص أومني مناسب للفلتر والاسبريسو، بإيحاءات زهور، كريم فدج، وبسكويت.",
    description:
      "Ethiopian honey processed coffee from Banko Taratu, roasted as omni for both filter and espresso, with floral, cream fudge, and biscuit notes.",
  },
] as const;

// ── الدالة الرئيسية ───────────────────────────────────────────────
async function main() {
  console.log("🚀 بدء إضافة محاصيل بيت التحميص...\n");

  // 1. المحمصة
  let roaster = await prisma.roaster.findFirst({
    where: { OR: [{ slug: "roasting-house" }, { name: "Roasting House" }] },
  });
  if (!roaster) {
    roaster = await prisma.roaster.create({
      data: {
        name: "Roasting House",
        nameAr: "بيت التحميص",
        slug: "roasting-house",
        website: "https://roastinghouse.sa",
        country: "SA",
      },
    });
    console.log("✅ تم إنشاء المحمصة:", roaster.nameAr);
  } else {
    console.log("⏭️  المحمصة موجودة:", roaster.nameAr);
  }

  // 2. دول المنشأ
  const countryMap: Record<string, string> = {};
  for (const c of COUNTRIES) {
    let country = await prisma.originCountry.findUnique({
      where: { isoCode: c.isoCode },
    });
    if (!country) {
      country = await prisma.originCountry.create({ data: c });
      console.log("✅ تم إنشاء الدولة:", c.nameAr);
    } else {
      console.log("⏭️  الدولة موجودة:", c.nameAr);
    }
    countryMap[c.isoCode] = country.id;
  }

  // 3. المحاصيل
  console.log("\n── المحاصيل ──────────────────────────────────");
  let created = 0;
  let skipped = 0;

  for (const coffee of COFFEES) {
    const existing = await prisma.coffeeLot.findFirst({
      where: { roasterId: roaster.id, name: coffee.name },
      select: { id: true, slug: true },
    });

    if (existing) {
      console.log("⏭️  موجود بالفعل:", coffee.nameAr, `(/${existing.slug})`);
      skipped++;
      continue;
    }

    const slug = await getUniqueSlug(makeSlug(coffee.name));

    await prisma.coffeeLot.create({
      data: {
        slug,
        name: coffee.name,
        nameAr: coffee.nameAr,
        roasterId: roaster.id,
        originCountryId: countryMap[coffee.isoCode],
        region: coffee.region ?? null,
        regionAr: null,
        farm: coffee.farm ?? null,
        producer: coffee.producer ?? null,
        process: coffee.process as CoffeeProcess,
        variety: coffee.variety.length ? coffee.variety.join(", ") : null,
        roastLevel: coffee.roastLevel ?? null,
        flavorNotes: [...coffee.flavorNotes],
        recommendedBrewMethods: [...coffee.brewMethods] as BrewMethod[],
        imageUrl: coffee.imageUrl,
        imageType: "OFFICIAL",
        imagePermissionStatus: "PENDING",
        imageSource: "ROASTERY_WEBSITE",
        imageCredit: "بيت التحميص",
        imageSourceUrl: coffee.imageUrl,
        descriptionAr: coffee.descriptionAr ?? null,
        description: coffee.description ?? null,
        publishedAt: new Date(),
      },
    });

    console.log("✅ تم إضافة:", coffee.nameAr, `→ /coffees/${slug}`);
    created++;
  }

  console.log(`\n🎉 انتهى! أُضيف: ${created} | موجود مسبقًا: ${skipped}`);
}

main()
  .catch((err) => {
    console.error("❌ خطأ:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
