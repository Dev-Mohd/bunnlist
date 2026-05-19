# BunnList ☕

منصة عربية لتقييم محاصيل القهوة المختصة. مستلهمة من IMDb لكن للقهوة.

## ✨ الميزات

- 📚 استعراض محاصيل القهوة المختصة مع بحث وفلترة متقدمة
- ⭐ تقييم المحاصيل وقراءة تجارب المستخدمين
- 📊 معرفة أفضل طريقة تحضير حسب تجارب الناس الفعلية
- 🔐 تسجيل دخول بحساب Google (NextAuth v5)
- 👨‍💼 لوحة إدارة كاملة للمحامص والمحاصيل
- 🖼 رفع صور المحاصيل لـ Supabase Storage

## 🛠 التقنيات

- **Next.js 15** (App Router + Server Actions)
- **TypeScript**
- **Prisma 7** + PostgreSQL (Supabase)
- **NextAuth v5 beta** (Google OAuth)
- **Tailwind CSS**
- **Supabase Storage** (صور المحاصيل)
- **Zod v4** (validation)

## 🚀 التشغيل المحلي

### المتطلبات

- Node.js 20+
- حساب Supabase (مجاني)
- Google OAuth credentials

### الخطوات

```bash
# 1. Clone المشروع
git clone https://github.com/Dev-Mohd/bunnlist-web.git
cd bunnlist-web

# 2. تثبيت الحزم
npm install

# 3. إنشاء ملفات البيئة
cp .env.example .env.local
# عدّل .env.local بمتغيراتك

# 4. إنشاء .env لـ Prisma CLI
echo 'DATABASE_URL="..."' > .env
echo 'DIRECT_URL="..."' >> .env

# 5. تطبيق migrations وإدخال بيانات أولية
npx prisma migrate dev
npm run db:seed

# 6. تشغيل الخادم
npm run dev
```

افتح: http://localhost:3000

## ⚙️ متغيرات البيئة

انظر `.env.example` للقائمة الكاملة. الأساسية:

| المتغير | الوصف |
|---------|-------|
| `DATABASE_URL` | Supabase connection pooler URL |
| `DIRECT_URL` | Supabase direct connection URL |
| `NEXTAUTH_SECRET` | مفتاح سري عشوائي |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret |
| `NEXT_PUBLIC_SUPABASE_URL` | رابط مشروع Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (رفع الصور) |
| `SEED_ADMIN_EMAIL` | البريد الذي يحصل على صلاحية ADMIN تلقائياً |

## 📁 هيكل المشروع

```
app/                    # Next.js pages (App Router)
  admin/                # لوحة الإدارة (ADMIN only)
    coffees/            # إدارة المحاصيل (CRUD)
  coffees/              # تصفح وتفاصيل المحاصيل
    [slug]/review/      # إضافة/تعديل تقييم
  login/                # تسجيل الدخول
  my-reviews/           # تقييمات المستخدم الحالي

actions/                # Server Actions
  admin.ts              # CRUD المحاصيل (admin)
  auth.ts               # signOut action
  coffees.ts            # قراءة المحاصيل والفلترة
  images.ts             # رفع الصور
  reviews.ts            # إنشاء/تعديل التقييمات

components/
  admin/                # admin-specific components
  coffees/              # coffee cards, grids, filters
  reviews/              # review form & cards
  ui/                   # shared UI components

lib/
  auth-helpers.ts       # requireAuth, requireAdmin, getCurrentUser
  coffee-labels.ts      # ترجمة enums عربي
  error-messages.ts     # رسائل الخطأ الموحدة
  prisma.ts             # Prisma client singleton
  storage.ts            # Supabase Storage helpers
  validations/
    coffee.ts           # Zod schema لنموذج المحصول

prisma/
  schema.prisma         # Database schema
  migrations/           # Migration files
  seed.ts               # Seed data (3 محامص، 10 محاصيل، 8 تقييمات)
```

## 🎯 ما تم تأجيله (Post-MVP)

- متابعة المستخدمين وقوائم المفضلة
- تعليقات ولايكات على التقييمات
- نظام نقاط / Gamification
- لوحة محامص عامة
- خريطة تفاعلية لمناطق الإنتاج
- توصيات AI

## 📝 الترخيص

Private — All rights reserved.
