# BunnList Project Context

## Product
BunnList is an Arabic-first community platform for specialty coffee crops.

It helps users:
- Discover coffee crops.
- Compare crops before buying.
- Read and add community reviews.
- Know the best brewing method for each crop.
- Search by roastery, origin country, process, flavor notes, and brew method.

BunnList should not feel like a coffee store or a simple product catalog.
It should feel like a coffee decision assistant.

Core positioning:
Discover. Rate. Compare. Brew Better.

Arabic positioning:
اكتشف · قيّم · قارن · حضّر أفضل

## Current Priority
Work only on the homepage for now.

Do not modify:
- Database schema
- Prisma models
- Auth
- Admin pages
- Import tools
- Coffee detail page
- Coffee listing/filtering page
- API routes unless absolutely required
- Seed/import logic

## Brand Identity
The official BunnList identity is premium, clean, warm, trusted, minimal, and specialty-coffee focused.

Palette:
- Main text / coffee black: #171411
- Dark brown: #4A3428
- Cream background: #EDE3D6
- Olive accent: #6D7B61
- Caramel CTA: #B97945

Use:
- #171411 for main text
- #4A3428 for secondary text
- #EDE3D6 or lighter cream for warm backgrounds
- #B97945 for primary CTA/buttons
- #6D7B61 as subtle accent

Avoid:
- Random bright colors
- Old orange-heavy identity
- Colorful placeholders that do not match the brand
- Overly decorative UI

## Homepage Goal
The homepage should help the user decide:
- What coffee crop should I buy?
- Which crop fits my taste?
- Which crop fits my brewing method?
- What does the community recommend?
- How can I compare or evaluate crops?

The homepage should not be only:
Hero + search + product grid.

It should be:
Hero + decision tools + recommendation paths + limited crop suggestions.

## Required Homepage Sections

1. Hero
Headline:
اكتشف محصولك القادم بثقة

Supporting text:
BunnList يساعدك تقارن المحاصيل، تشوف تجارب المجتمع، وتعرف أنسب طريقة تحضير قبل الشراء.

Primary CTA:
رشّح لي محصول

Secondary CTA:
استكشف المحاصيل

Feature line:
اكتشف · قيّم · قارن · حضّر أفضل

Keep existing search behavior.

2. Core Features
Title:
كل ما تحتاجه قبل شراء المحصول

Feature cards:
- اكتشف: ابحث عن محاصيل حسب المحمصة، الدولة، المعالجة، أو النكهات.
- قيّم: شارك تجربتك وساعد غيرك يعرف هل المحصول يستاهل.
- قارن: قارن بين محصولين قبل الشراء.
- حضّر أفضل: اعرف هل المحصول يناسب V60 أو الإسبريسو أو الكيمكس.
- استكشف: شوف اختيارات المجتمع والمحاصيل الأعلى تفاعلًا.

3. Quick Recommendation
Title:
محتار وش تختار؟

Description:
اختر طريقة التحضير والنكهة، ونوصلك لمحاصيل أقرب لذوقك.

Chips:
- V60
- إسبريسو
- كيمكس
- فواكه
- شوكولاتة
- حلاوة عالية
- مناسب للبداية

CTA:
اعرض الترشيحات

The CTA should be visually close to the chips inside the same decision-tool block.

4. Goal Cards
Title:
وش هدفك اليوم؟

Cards:
- محصول يومي: خيارات سهلة ومتوازنة للاستخدام اليومي.
- إسبريسو واضح: محاصيل مناسبة للمكينة وتعطي استخلاص أوضح.
- V60 فاكهي: محاصيل بطابع فاكهي وتجربة واضحة بالترشيح.
- هدية آمنة: خيارات مناسبة لمعظم الأذواق.
- تجربة مختلفة: معالجات ونكهات غير معتادة لمحبي التجربة.

5. Starter Picks
Title:
اختيارات تساعدك تبدأ

Rules:
- Show max 3 coffee cards.
- This section should not dominate the homepage.
- Add link: استكشف كل المحاصيل
- Reuse existing CoffeeCard if possible.

6. Community Contribution CTA
Title:
جربت محصول؟ ساعد غيرك يقرر

Text:
أضف تقييمك لطريقة التحضير والنكهات اللي ظهرت لك، وخل تجربة الشراء أوضح للمجتمع.

CTA:
قيّم محصول

## UX Rules
The homepage should:
- Feel like a coffee decision assistant.
- Reduce excessive empty whitespace.
- Keep RTL layout correct.
- Be responsive on mobile.
- Prioritize decision-making tools before coffee grids.
- Make CTAs obvious.
- Make brew method recommendation a core value.

Avoid:
- Making the homepage only a product grid.
- Showing too many coffee cards.
- Repeating the same product sections.
- Large empty sections.
- Weak CTAs.
- Mixing old and new color systems.

## Placeholder Rules
Known issue:
Some product placeholders are colorful and do not match the new identity.

Rule:
Use a unified cream/neutral placeholder later. Do not fix this in the current homepage-only task unless the placeholder is directly inside app/page.tsx.

## Technical Rules
Before editing:
- Read this file.
- Inspect app/page.tsx.
- Reuse existing components where possible.

Do not:
- Install dependencies.
- Change database schema.
- Change Prisma models.
- Touch admin/import tools.
- Break search.
- Break listing filters.
- Rewrite unrelated pages.

After editing:
- Run lint.
- Run build if reasonable.
- Report files changed, commands run, assumptions, and issues.

Current task:
Make only one small homepage adjustment:
In app/page.tsx, make the "محتار وش تختار؟" quick recommendation section feel like one coherent decision tool. The CTA "اعرض الترشيحات" should be close to the chips, preferably below them inside the same visual block.

Do not touch other files except PROJECT_CONTEXT.md and app/page.tsx.
