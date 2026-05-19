import {
  BrewMethod,
  CoffeeProcess,
  PrismaClient,
  ReviewStatus,
  Role,
} from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to seed the database.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg(
    new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
    }),
  ),
});

const roasters = [
  { name: "Camel Step Roasters", nameAr: "كامل ستيب", slug: "camel-step-roasters", country: "السعودية", city: "الرياض" },
  { name: "Half Million", nameAr: "هاف ميليون", slug: "half-million", country: "السعودية", city: "الرياض" },
  { name: "Mokhabz", nameAr: "مخابز", slug: "mokhabz", country: "السعودية", city: "الرياض" },
];

const countries = [
  { nameAr: "إثيوبيا", nameEn: "Ethiopia", isoCode: "ET" },
  { nameAr: "كولومبيا", nameEn: "Colombia", isoCode: "CO" },
  { nameAr: "البرازيل", nameEn: "Brazil", isoCode: "BR" },
  { nameAr: "كينيا", nameEn: "Kenya", isoCode: "KE" },
  { nameAr: "اليمن", nameEn: "Yemen", isoCode: "YE" },
  { nameAr: "باناما", nameEn: "Panama", isoCode: "PA" },
  { nameAr: "رواندا", nameEn: "Rwanda", isoCode: "RW" },
];

const coffeeLots = [
  {
    name: "Yirgacheffe Natural",
    nameAr: "يرجاتشيف طبيعي",
    slug: "yirgacheffe-natural",
    roasterSlug: "camel-step-roasters",
    countryIsoCode: "ET",
    region: "Yirgacheffe",
    regionAr: "يرجاتشيف",
    process: CoffeeProcess.NATURAL,
    processLabel: "Natural",
    flavorNotes: ["فراولة", "ياسمين", "توت"],
    recommendedBrewMethods: [BrewMethod.V60, BrewMethod.CHEMEX],
    imagePath: null,
  },
  {
    name: "Sidamo Washed",
    nameAr: "سيدامو مغسول",
    slug: "sidamo-washed",
    roasterSlug: "half-million",
    countryIsoCode: "ET",
    region: "Sidamo",
    regionAr: "سيدامو",
    process: CoffeeProcess.WASHED,
    processLabel: "Washed",
    flavorNotes: ["حمضيات", "شاي أسود", "زهور"],
    recommendedBrewMethods: [BrewMethod.V60, BrewMethod.AEROPRESS],
    imagePath: null,
  },
  {
    name: "Huila Pink Bourbon",
    nameAr: "هويلا بينك بوربون",
    slug: "huila-pink-bourbon",
    roasterSlug: "mokhabz",
    countryIsoCode: "CO",
    region: "Huila",
    regionAr: "هويلا",
    variety: "Pink Bourbon",
    process: CoffeeProcess.WASHED,
    processLabel: "Washed",
    flavorNotes: ["سكر بني", "كرز", "برتقال"],
    recommendedBrewMethods: [BrewMethod.V60, BrewMethod.ESPRESSO],
    imagePath: null,
  },
  {
    name: "Narino Washed",
    nameAr: "نارينيو مغسول",
    slug: "narino-washed",
    roasterSlug: "camel-step-roasters",
    countryIsoCode: "CO",
    region: "Narino",
    regionAr: "نارينيو",
    process: CoffeeProcess.WASHED,
    processLabel: "Washed",
    flavorNotes: ["تفاح", "كراميل", "حمضيات"],
    recommendedBrewMethods: [BrewMethod.CHEMEX, BrewMethod.V60],
    imagePath: null,
  },
  {
    name: "Cerrado Mineiro Natural",
    nameAr: "سيرادو مينيرو طبيعي",
    slug: "cerrado-mineiro-natural",
    roasterSlug: "half-million",
    countryIsoCode: "BR",
    region: "Cerrado Mineiro",
    regionAr: "سيرادو مينيرو",
    process: CoffeeProcess.NATURAL,
    processLabel: "Natural",
    flavorNotes: ["شوكولاتة", "مكسرات", "عسل"],
    recommendedBrewMethods: [BrewMethod.ESPRESSO, BrewMethod.FRENCH_PRESS],
    imagePath: null,
  },
  {
    name: "Nyeri AA Washed",
    nameAr: "نيري AA مغسول",
    slug: "nyeri-aa-washed",
    roasterSlug: "mokhabz",
    countryIsoCode: "KE",
    region: "Nyeri",
    regionAr: "نيري",
    process: CoffeeProcess.WASHED,
    processLabel: "Washed",
    flavorNotes: ["كشمش أسود", "غريب فروت", "سكر قصب"],
    recommendedBrewMethods: [BrewMethod.V60, BrewMethod.AEROPRESS],
    imagePath: null,
  },
  {
    name: "Haraz Natural",
    nameAr: "حراز طبيعي",
    slug: "haraz-natural",
    roasterSlug: "camel-step-roasters",
    countryIsoCode: "YE",
    region: "Haraz",
    regionAr: "حراز",
    process: CoffeeProcess.NATURAL,
    processLabel: "Natural",
    flavorNotes: ["تمر", "بهارات", "كاكاو"],
    recommendedBrewMethods: [BrewMethod.FRENCH_PRESS, BrewMethod.V60],
    imagePath: null,
  },
  {
    name: "Bani Matar Anaerobic",
    nameAr: "بني مطر لاهوائي",
    slug: "bani-matar-anaerobic",
    roasterSlug: "mokhabz",
    countryIsoCode: "YE",
    region: "Bani Matar",
    regionAr: "بني مطر",
    process: CoffeeProcess.ANAEROBIC,
    processLabel: "Anaerobic",
    flavorNotes: ["رمان", "قرفة", "عنب أحمر"],
    recommendedBrewMethods: [BrewMethod.V60, BrewMethod.COLD_BREW],
    imagePath: null,
  },
  {
    name: "Geisha Washed",
    nameAr: "جيشا مغسول",
    slug: "geisha-washed",
    roasterSlug: "half-million",
    countryIsoCode: "PA",
    region: "Boquete",
    regionAr: "بوكيتي",
    variety: "Geisha",
    process: CoffeeProcess.WASHED,
    processLabel: "Washed",
    flavorNotes: ["برغموت", "ياسمين", "خوخ"],
    recommendedBrewMethods: [BrewMethod.V60, BrewMethod.CHEMEX],
    imagePath: null,
    description: "محصول مميز بسعر عال ونكهات زهرية واضحة.",
  },
  {
    name: "Nyamasheke Washed",
    nameAr: "نياماشيكي مغسول",
    slug: "nyamasheke-washed",
    roasterSlug: "camel-step-roasters",
    countryIsoCode: "RW",
    region: "Nyamasheke",
    regionAr: "نياماشيكي",
    process: CoffeeProcess.WASHED,
    processLabel: "Washed",
    flavorNotes: ["شاي", "ليمون", "عسل"],
    recommendedBrewMethods: [BrewMethod.AEROPRESS, BrewMethod.V60],
    imagePath: null,
  },
];

const reviewers = [
  { email: "reviewer-1@bunnlist.local", name: "مراجع BunnList 1" },
  { email: "reviewer-2@bunnlist.local", name: "مراجع BunnList 2" },
  { email: "reviewer-3@bunnlist.local", name: "مراجع BunnList 3" },
  { email: "reviewer-4@bunnlist.local", name: "مراجع BunnList 4" },
];

const reviews = [
  {
    coffeeLotSlug: "yirgacheffe-natural",
    reviewerEmail: "reviewer-1@bunnlist.local",
    rating: 5,
    brewMethod: BrewMethod.V60,
    wouldBuyAgain: true,
    body: "فاكهي وواضح جداً مع V60.",
  },
  {
    coffeeLotSlug: "yirgacheffe-natural",
    reviewerEmail: "reviewer-2@bunnlist.local",
    rating: 4,
    brewMethod: BrewMethod.CHEMEX,
    wouldBuyAgain: true,
    body: "نظيف وممتع، الحلاوة تظهر أكثر مع طحن متوسط.",
  },
  {
    coffeeLotSlug: "sidamo-washed",
    reviewerEmail: "reviewer-3@bunnlist.local",
    rating: 4,
    brewMethod: BrewMethod.AEROPRESS,
    wouldBuyAgain: true,
  },
  {
    coffeeLotSlug: "huila-pink-bourbon",
    reviewerEmail: "reviewer-1@bunnlist.local",
    rating: 5,
    brewMethod: BrewMethod.ESPRESSO,
    wouldBuyAgain: true,
  },
  {
    coffeeLotSlug: "cerrado-mineiro-natural",
    reviewerEmail: "reviewer-4@bunnlist.local",
    rating: 3,
    brewMethod: BrewMethod.ESPRESSO,
    wouldBuyAgain: false,
  },
  {
    coffeeLotSlug: "nyeri-aa-washed",
    reviewerEmail: "reviewer-2@bunnlist.local",
    rating: 5,
    brewMethod: BrewMethod.V60,
    wouldBuyAgain: true,
    body: "حمضية كينية جميلة وواضحة.",
  },
  {
    coffeeLotSlug: "haraz-natural",
    reviewerEmail: "reviewer-3@bunnlist.local",
    rating: 4,
    brewMethod: BrewMethod.FRENCH_PRESS,
    wouldBuyAgain: true,
  },
  {
    coffeeLotSlug: "geisha-washed",
    reviewerEmail: "reviewer-4@bunnlist.local",
    rating: 5,
    brewMethod: BrewMethod.CHEMEX,
    wouldBuyAgain: true,
    body: "مميز جداً، لكن السعر يجعله خياراً خاصاً.",
  },
];

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
}

async function refreshCoffeeLotStats(coffeeLotId: string) {
  const publishedReviews = await prisma.review.findMany({
    where: {
      coffeeLotId,
      status: ReviewStatus.PUBLISHED,
    },
    select: {
      rating: true,
      brewMethod: true,
      wouldBuyAgain: true,
    },
  });

  await prisma.coffeeLot.update({
    where: { id: coffeeLotId },
    data: {
      averageRating: average(publishedReviews.map((review) => review.rating)),
      reviewCount: publishedReviews.length,
    },
  });

  const statsByMethod = new Map<
    BrewMethod,
    { ratings: number[]; wouldBuyAgain: number }
  >();

  for (const review of publishedReviews) {
    const current = statsByMethod.get(review.brewMethod) ?? {
      ratings: [],
      wouldBuyAgain: 0,
    };

    current.ratings.push(review.rating);
    current.wouldBuyAgain += review.wouldBuyAgain ? 1 : 0;
    statsByMethod.set(review.brewMethod, current);
  }

  await prisma.coffeeLotBrewStat.deleteMany({
    where: { coffeeLotId },
  });

  for (const [brewMethod, stat] of statsByMethod.entries()) {
    await prisma.coffeeLotBrewStat.create({
      data: {
        coffeeLotId,
        brewMethod,
        averageRating: average(stat.ratings),
        reviewCount: stat.ratings.length,
        wouldBuyAgain: stat.wouldBuyAgain,
      },
    });
  }
}

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const admin = adminEmail
    ? await prisma.user.upsert({
        where: { email: adminEmail },
        update: { role: Role.ADMIN },
        create: {
          email: adminEmail,
          name: "BunnList Admin",
          role: Role.ADMIN,
        },
      })
    : null;

  for (const roaster of roasters) {
    await prisma.roaster.upsert({
      where: { slug: roaster.slug },
      update: {
        name: roaster.name,
        nameAr: roaster.nameAr,
        country: `${roaster.country} - ${roaster.city}`,
      },
      create: {
        name: roaster.name,
        nameAr: roaster.nameAr,
        slug: roaster.slug,
        country: `${roaster.country} - ${roaster.city}`,
      },
    });
  }

  for (const country of countries) {
    await prisma.originCountry.upsert({
      where: { isoCode: country.isoCode },
      update: country,
      create: country,
    });
  }

  for (const lot of coffeeLots) {
    const roaster = await prisma.roaster.findUniqueOrThrow({
      where: { slug: lot.roasterSlug },
    });
    const originCountry = await prisma.originCountry.findUniqueOrThrow({
      where: { isoCode: lot.countryIsoCode },
    });

    await prisma.coffeeLot.upsert({
      where: { slug: lot.slug },
      update: {
        name: lot.name,
        nameAr: lot.nameAr,
        roasterId: roaster.id,
        originCountryId: originCountry.id,
        region: lot.region,
        regionAr: lot.regionAr,
        variety: "variety" in lot ? lot.variety : null,
        process: lot.process,
        processLabel: lot.processLabel,
        flavorNotes: lot.flavorNotes,
        recommendedBrewMethods: lot.recommendedBrewMethods,
        imagePath: lot.imagePath,
        description: "description" in lot ? lot.description : null,
        publishedAt: new Date(),
      },
      create: {
        slug: lot.slug,
        name: lot.name,
        nameAr: lot.nameAr,
        roasterId: roaster.id,
        originCountryId: originCountry.id,
        region: lot.region,
        regionAr: lot.regionAr,
        variety: "variety" in lot ? lot.variety : null,
        process: lot.process,
        processLabel: lot.processLabel,
        flavorNotes: lot.flavorNotes,
        recommendedBrewMethods: lot.recommendedBrewMethods,
        imagePath: lot.imagePath,
        description: "description" in lot ? lot.description : null,
        publishedAt: new Date(),
        createdById: admin?.id,
      },
    });
  }

  for (const reviewer of reviewers) {
    await prisma.user.upsert({
      where: { email: reviewer.email },
      update: { name: reviewer.name },
      create: {
        email: reviewer.email,
        name: reviewer.name,
        role: Role.USER,
      },
    });
  }

  for (const review of reviews) {
    const coffeeLot = await prisma.coffeeLot.findUniqueOrThrow({
      where: { slug: review.coffeeLotSlug },
    });
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: review.reviewerEmail },
    });

    await prisma.review.upsert({
      where: {
        coffeeLotId_userId: {
          coffeeLotId: coffeeLot.id,
          userId: user.id,
        },
      },
      update: {
        rating: review.rating,
        brewMethod: review.brewMethod,
        wouldBuyAgain: review.wouldBuyAgain,
        body: "body" in review ? review.body : null,
        status: ReviewStatus.PUBLISHED,
      },
      create: {
        coffeeLotId: coffeeLot.id,
        userId: user.id,
        rating: review.rating,
        brewMethod: review.brewMethod,
        wouldBuyAgain: review.wouldBuyAgain,
        body: "body" in review ? review.body : null,
        status: ReviewStatus.PUBLISHED,
      },
    });
  }

  const seededCoffeeLots = await prisma.coffeeLot.findMany({
    where: {
      slug: { in: coffeeLots.map((lot) => lot.slug) },
    },
    select: { id: true },
  });

  for (const coffeeLot of seededCoffeeLots) {
    await refreshCoffeeLotStats(coffeeLot.id);
  }

  const [roasterCount, coffeeLotCount, reviewCount, brewStatCount] =
    await Promise.all([
      prisma.roaster.count(),
      prisma.coffeeLot.count(),
      prisma.review.count(),
      prisma.coffeeLotBrewStat.count(),
    ]);

  console.log(
    JSON.stringify(
      {
        roasters: roasterCount,
        coffeeLots: coffeeLotCount,
        reviews: reviewCount,
        coffeeLotBrewStats: brewStatCount,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
