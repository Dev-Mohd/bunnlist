import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 5;

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();

function getClientKey(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const userAgent = request.headers.get("user-agent") ?? "unknown";
  const rawKey = `${forwardedFor ?? realIp ?? "unknown"}:${userAgent}`;
  const salt = process.env.WAITLIST_RATE_LIMIT_SECRET ?? "bunnlist-waitlist";

  return createHash("sha256").update(`${salt}:${rawKey}`).digest("hex");
}

function isRateLimited(key: string) {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  entry.count += 1;
  return entry.count > MAX_REQUESTS_PER_WINDOW;
}

function normalizeEmail(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const email = value.trim().toLowerCase();

  if (email.length === 0 || email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) {
    return null;
  }

  return email;
}

export async function POST(request: NextRequest) {
  const endpoint = process.env.FORMSPREE_ENDPOINT;

  if (!endpoint) {
    return NextResponse.json(
      { message: "خدمة قائمة الانتظار غير مفعلة حاليًا." },
      { status: 503 },
    );
  }

  if (isRateLimited(getClientKey(request))) {
    return NextResponse.json(
      { message: "حاول مرة أخرى بعد دقائق قليلة." },
      { status: 429 },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "الطلب غير صالح." }, { status: 400 });
  }

  const payload = body as { email?: unknown; company?: unknown };
  const email = normalizeEmail(payload.email);

  if (typeof payload.company === "string" && payload.company.trim().length > 0) {
    return NextResponse.json({ message: "تم تسجيل اهتمامك." });
  }

  if (!email) {
    return NextResponse.json(
      { message: "اكتب بريد إلكتروني صحيح." },
      { status: 400 },
    );
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      source: "bunnlist-coming-soon",
      submittedAt: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    return NextResponse.json(
      { message: "تعذر التسجيل الآن. حاول مرة أخرى لاحقًا." },
      { status: 502 },
    );
  }

  return NextResponse.json({ message: "تم تسجيل اهتمامك. شكرًا لك." });
}
