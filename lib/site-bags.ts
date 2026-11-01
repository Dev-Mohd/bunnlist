// Coffees from the guide for the site's shelf and scenes: one each from fifteen
// Saudi roasters, as published in the app (snapshot).
// Refresh by re-running the export; photos live in public/site/bags.

export interface ShelfLot {
  file: string;
  name: string;
  origin: string | null;
  code: string | null;
  process: string | null;
  notes: string[];
  rating: number;
  reviews: number;
}

export const SHELF_LOTS: ShelfLot[] = [
  {
    "file": "black-knight-chelchele",
    "name": "شيلشلي",
    "origin": "إثيوبيا",
    "code": "ET",
    "process": "مجففة",
    "notes": [
      "فراولة",
      "توت أسود",
      "شوكولاتة"
    ],
    "rating": 0,
    "reviews": 0
  },
  {
    "file": "mahmasa-oolala-blueberry",
    "name": "بلوبيري",
    "origin": "إندونيسيا",
    "code": "ID",
    "process": "تجريبية",
    "notes": [
      "توت أزرق",
      "حلاوة",
      "فانيلا"
    ],
    "rating": 0,
    "reviews": 0
  },
  {
    "file": "kof-ethiopia-shakiso",
    "name": "اثيوبيا - شاكيسو",
    "origin": "إثيوبيا",
    "code": "ET",
    "process": "مجففة",
    "notes": [
      "تفاح اخضر",
      "ياسمين",
      "فاكهية"
    ],
    "rating": 0,
    "reviews": 0
  },
  {
    "file": "ash-grape-colombia",
    "name": "عنب كولومبيا",
    "origin": "كولومبيا",
    "code": "CO",
    "process": "لاهوائية",
    "notes": [
      "عنب",
      "عسل",
      "شوكولاتة"
    ],
    "rating": 0,
    "reviews": 0
  },
  {
    "file": "mamtad-roastery-manahasi-uganda",
    "name": "مناناسي",
    "origin": "أوغندا",
    "code": "UG",
    "process": "مجففة",
    "notes": [
      "مشمش",
      "مانجو",
      "باشن فروت"
    ],
    "rating": 0,
    "reviews": 0
  },
  {
    "file": "arriyadh-roaster-qasr-al-souh-panama",
    "name": "قصر الصوح",
    "origin": "بنما",
    "code": "PA",
    "process": "مجففة",
    "notes": [
      "شاي أولونغ",
      "كمثرى",
      "خوخيات"
    ],
    "rating": 0,
    "reviews": 0
  },
  {
    "file": "camel-step-colombia-descanso",
    "name": "كولومبيا ديسكانسو",
    "origin": "كولومبيا",
    "code": "CO",
    "process": "مجففة",
    "notes": [
      "رمان",
      "جوافة",
      "كاجو"
    ],
    "rating": 0,
    "reviews": 0
  },
  {
    "file": "alwaal-albari-shelshely-chelchele",
    "name": "شيلشلي",
    "origin": "إثيوبيا",
    "code": "ET",
    "process": "مجففة",
    "notes": [
      "حمضيات",
      "زهور"
    ],
    "rating": 0,
    "reviews": 0
  },
  {
    "file": "asante-roastery-farida-khan",
    "name": "فريدة خان",
    "origin": "الهند",
    "code": "IN",
    "process": "مغسولة",
    "notes": [
      "كراميل",
      "كرز",
      "عسل"
    ],
    "rating": 0,
    "reviews": 0
  },
  {
    "file": "mahmasa-slop-colombia-sweida-250g",
    "name": "كولومبيا سويدا",
    "origin": "كولومبيا",
    "code": "CO",
    "process": "مجففة",
    "notes": [
      "عنب أحمر",
      "كرز",
      "فانيلا"
    ],
    "rating": 0,
    "reviews": 0
  },
  {
    "file": "bunista-peru-valle-dorado",
    "name": "بيرو فالي دورادو",
    "origin": "بيرو",
    "code": "PE",
    "process": "مجففة",
    "notes": [
      "تفاح أحمر",
      "سكر بني",
      "برتقال"
    ],
    "rating": 0,
    "reviews": 0
  },
  {
    "file": "admi-roastery-rwanda-kiesha-muf",
    "name": "قيشا موف",
    "origin": "رواندا",
    "code": "RW",
    "process": "مغسولة",
    "notes": [
      "برتقال",
      "تفاح"
    ],
    "rating": 0,
    "reviews": 0
  },
  {
    "file": "mahmasa-aqahi-maaluja-lahawaiya",
    "name": "معالجة لاهوائية",
    "origin": "كولومبيا",
    "code": "CO",
    "process": "لاهوائية",
    "notes": [
      "عنب",
      "زبيب",
      "أناناس"
    ],
    "rating": 0,
    "reviews": 0
  },
  {
    "file": "jesha-roastery-gogi-ethiopia",
    "name": "قوجي اثيوبيا",
    "origin": "إثيوبيا",
    "code": "ET",
    "process": "مجففة",
    "notes": [
      "كرز",
      "سكر بني"
    ],
    "rating": 0,
    "reviews": 0
  },
  {
    "file": "mahmasa-masna-al-qahwa-al-brazil-al-thahira",
    "name": "البرازيل - الظاهرة",
    "origin": "البرازيل",
    "code": "BR",
    "process": "مجففة",
    "notes": [
      "كراميل",
      "قرنفل",
      "فول سوداني"
    ],
    "rating": 0,
    "reviews": 0
  }
];

/** Look one up by its photo file. */
export const lotByFile = (file: string) => SHELF_LOTS.find((l) => l.file === file)!;
