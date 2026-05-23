# BunnList Project Context

## Project Name
BunnList

## Product Idea
BunnList is an Arabic-first community platform for specialty coffee crops.

The product helps users:
- Discover coffee crops.
- Compare crops before buying.
- Read and add community reviews.
- Know the best brewing method for each crop.
- Search by roastery, origin country, process, flavor notes, and brew method.

The core positioning is:
"Discover. Rank. Brew Better."

Arabic positioning:
"اكتشف · قيّم · قارن · حضّر أفضل"

BunnList should not feel like a coffee store or simple product catalog.
It should feel like a coffee decision assistant.

---

## Current Priority
We are currently working ONLY on improving the homepage.

Do not modify:
- Database schema
- Auth
- Admin pages
- Import tools
- Coffee detail page
- Coffee listing/filtering page
- API routes unless absolutely required for homepage display
- Prisma models
- Seed/import logic

The current task is to make the homepage more useful, attractive, and aligned with the new brand identity.

---

## Homepage Goal
The homepage should help the user decide:

- What coffee crop should I buy?
- Which crop fits my taste?
- Which crop fits my brewing method?
- What does the community recommend?
- How can I compare or evaluate crops?

The homepage should NOT be just:
Hero + search + product grid.

It should be:
Hero + decision tools + recommendation paths + limited crop suggestions.

---

## New Official Brand Identity

We adopted a new official BunnList brand identity.

Brand personality:
- Premium
- Clean
- Trusted
- Warm
- Specialty coffee focused
- Minimal
- Arabic-first

Core brand words:
- Discover
- Rate
- Compare
- Brew Better

Arabic equivalents:
- اكتشف
- قيّم
- قارن
- حضّر أفضل

---

## Brand Palette

Use these colors as the main visual system:

  --bunn-black:   #171411
  --bunn-brown:   #4A3428
  --bunn-cream:   #EDE3D6
  --bunn-olive:   #6D7B61
  --bunn-caramel: #B97945

Usage:
- Main text: #171411
- Secondary text: #4A3428
- Warm backgrounds: #EDE3D6 or lighter cream variations
- Main CTA/buttons: #B97945
- Subtle accent: #6D7B61
- Borders should be soft and warm, not harsh gray.

Avoid:
- Random bright colors
- Old orange-heavy identity
- Colorful placeholders that do not match the brand
- Overly decorative UI

---

## Logo Usage

The new BunnList logo is official.

Use:
- Horizontal logo in the header when space allows.
- Symbol only for app icon, favicon, small mobile areas, and placeholders if available.

Do not replace the logo with unrelated icons.
Do not invent a new coffee cup icon if the official symbol is available.

If the actual logo asset is not yet in the project, keep the existing logo temporarily but prepare the UI to match the new brand colors.

---

## Typography Direction

Preferred style:
- Modern, Clean, Premium, Readable Arabic

Suggested Arabic fonts: IBM Plex Sans Arabic / Tajawal
Suggested English fonts: Inter / Satoshi / System font fallback

Do not add new font dependencies unless the project already supports them.

---

## Homepage Required Structure

### 1. Hero Section
Headline: "اكتشف محصولك القادم بثقة"
Supporting text: "BunnList يساعدك تقارن المحاصيل، تشوف تجارب المجتمع، وتعرف أنسب طريقة تحضير قبل الشراء."
Primary CTA: "رشّح لي محصول"
Secondary CTA: "استكشف المحاصيل"
Feature line: "اكتشف · قيّم · قارن · حضّر أفضل"
Keep existing search behavior if present.

### 2. Core Features Section
Title: "كل ما تحتاجه قبل شراء المحصول"
5 cards: اكتشف / قيّم / قارن / حضّر أفضل / استكشف

### 3. Quick Recommendation Section
Title: "محتار وش تختار؟"
Chips: V60 / إسبريسو / كيمكس / فواكه / شوكولاتة / حلاوة عالية / مناسب للبداية
CTA: "اعرض الترشيحات" → routes to /coffees with matching filters if supported

### 4. Goal Cards Section
Title: "وش هدفك اليوم؟"
5 cards: محصول يومي / إسبريسو واضح / V60 فاكهي / هدية آمنة / تجربة مختلفة

### 5. Starter Picks Section
Title: "اختيارات تساعدك تبدأ"
Max 3 CoffeeCards. Link: "استكشف كل المحاصيل"

### 6. Community CTA
Title: "جربت محصول؟ ساعد غيرك يقرر"
CTA: "قيّم محصول" → /coffees

---

## UX Rules

- Feel like a coffee decision assistant.
- Reduce excessive empty vertical whitespace.
- Be visually tighter than the current version.
- Keep RTL layout correct. Be responsive on mobile.
- Prioritize decision-making tools before coffee grids.
- Make CTAs obvious. Make "brew method recommendation" a core value.

Avoid:
- Making the homepage only a product grid.
- Showing too many coffee cards.
- Repeating the same product sections.
- Large empty sections. Weak CTAs.
- Mixing old and new color systems.

---

## Technical Rules

- Do NOT install dependencies.
- Do NOT change database schema / Prisma models.
- Do NOT rewrite unrelated pages.
- Do NOT touch admin/import tools.
- Do NOT break existing search or listing filters.
- Reuse existing components when possible.
- After editing: run tsc, lint, build and fix any errors.

Component naming if needed:
HomeHero / HomeFeatureCards / HomeQuickRecommendation / HomeGoalCards / HomeStarterPicks / HomeContributeSection
