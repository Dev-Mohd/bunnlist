import type { MetadataRoute } from "next";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://bunnlist.com";

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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!process.env.DATABASE_URL) {
    return staticRoutes;
  }

  const { prisma } = await import("@/lib/prisma");

  const publishedLots = await prisma.coffeeLot.findMany({
    where: { publishedAt: { not: null } },
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });

  const coffeeRoutes: MetadataRoute.Sitemap = publishedLots.map((lot) => ({
    url: `${BASE_URL}/coffees/${lot.slug}`,
    lastModified: lot.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [...staticRoutes, ...coffeeRoutes];
}
