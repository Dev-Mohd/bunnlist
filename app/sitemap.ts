import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://bunnlist.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // جلب المحاصيل المنشورة فقط — المسودات لا تظهر في الـ sitemap
  const publishedLots = await prisma.coffeeLot.findMany({
    where: { publishedAt: { not: null } },
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${BASE_URL}/coffees`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];

  const coffeeRoutes: MetadataRoute.Sitemap = publishedLots.map((lot) => ({
    url: `${BASE_URL}/coffees/${lot.slug}`,
    lastModified: lot.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [...staticRoutes, ...coffeeRoutes];
}
