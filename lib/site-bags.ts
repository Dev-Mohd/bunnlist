// Black Knight coffees for the site's shelf, as published in the guide (snapshot).
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
    "file": "massar",
    "name": "مسار",
    "origin": "اليمن",
    "code": "YE",
    "process": "تجريبية",
    "notes": [
      "عنب",
      "تفاح",
      "مانجو",
      "عسل"
    ],
    "rating": 0,
    "reviews": 0
  },
  {
    "file": "nardos",
    "name": "ناردوس",
    "origin": "إثيوبيا",
    "code": "ET",
    "process": "لاهوائية",
    "notes": [
      "خوخ",
      "أناناس",
      "زهري",
      "شوكولاتة بالحليب"
    ],
    "rating": 0,
    "reviews": 0
  },
  {
    "file": "lolit",
    "name": "لوليت",
    "origin": "إثيوبيا",
    "code": "ET",
    "process": "طبيعية",
    "notes": [
      "توت أحمر",
      "تين",
      "ياسمين",
      "كراميل"
    ],
    "rating": 0,
    "reviews": 0
  },
  {
    "file": "black-mountain",
    "name": "الجبل الأسود",
    "origin": "البرازيل",
    "code": "BR",
    "process": "طبيعية",
    "notes": [
      "مكسرات",
      "فانيليا",
      "شوكولاتة"
    ],
    "rating": 0,
    "reviews": 0
  },
  {
    "file": "zubaida",
    "name": "زبيدة",
    "origin": "اليمن",
    "code": "YE",
    "process": "طبيعية",
    "notes": [
      "عنب",
      "زبيب",
      "قصب السكر",
      "شوكولاتة"
    ],
    "rating": 0,
    "reviews": 0
  },
  {
    "file": "milora",
    "name": "ميلورا",
    "origin": "كوستاريكا",
    "code": "CR",
    "process": "عسلية",
    "notes": [
      "توت",
      "باشن فروت",
      "يوسفي",
      "كراميل"
    ],
    "rating": 0,
    "reviews": 0
  },
  {
    "file": "9009",
    "name": "9009",
    "origin": "اليمن",
    "code": "YE",
    "process": "لاهوائية",
    "notes": [
      "عنب أحمر",
      "توت",
      "شوكولاتة",
      "ياسمين"
    ],
    "rating": 0,
    "reviews": 0
  },
  {
    "file": "alshikha",
    "name": "الشيخة",
    "origin": "مزيج",
    "code": "XB",
    "process": null,
    "notes": [
      "سمسم",
      "لوز محمص",
      "فول سوداني"
    ],
    "rating": 0,
    "reviews": 0
  },
  {
    "file": "adham-2",
    "name": "أدهم",
    "origin": "مزيج",
    "code": "XB",
    "process": null,
    "notes": [
      "عسل",
      "كراميل",
      "مكسرات"
    ],
    "rating": 0,
    "reviews": 0
  },
  {
    "file": "eyana",
    "name": "إيانا",
    "origin": "إثيوبيا",
    "code": "ET",
    "process": "لاهوائية",
    "notes": [
      "توت أحمر",
      "خوخ",
      "موز",
      "ياسمين"
    ],
    "rating": 0,
    "reviews": 0
  },
  {
    "file": "excelso",
    "name": "إكسيلسو",
    "origin": "كولومبيا",
    "code": "CO",
    "process": "مغسولة",
    "notes": [
      "كراميل",
      "سكر بني",
      "لوز",
      "حمضيات"
    ],
    "rating": 0,
    "reviews": 0
  },
  {
    "file": "decaf",
    "name": "دي كاف",
    "origin": "كولومبيا",
    "code": "CO",
    "process": null,
    "notes": [
      "برتقال",
      "عسل",
      "شوكولاتة"
    ],
    "rating": 0,
    "reviews": 0
  },
  {
    "file": "guji",
    "name": "قوجي",
    "origin": "إثيوبيا",
    "code": "ET",
    "process": "طبيعية",
    "notes": [
      "توت أحمر",
      "فراولة",
      "عنب",
      "شوكولاتة"
    ],
    "rating": 0,
    "reviews": 0
  },
  {
    "file": "rio",
    "name": "ريو",
    "origin": "البرازيل",
    "code": "BR",
    "process": "طبيعية",
    "notes": [
      "كراميل",
      "شوكولاتة",
      "مكسرات"
    ],
    "rating": 0,
    "reviews": 0
  },
  {
    "file": "rozitta",
    "name": "روزيتا",
    "origin": "كوستاريكا",
    "code": "CR",
    "process": "عسلية",
    "notes": [
      "أناناس",
      "توت",
      "كرز",
      "باشن فروت"
    ],
    "rating": 0,
    "reviews": 0
  },
  {
    "file": "kitkat",
    "name": "كيت كات",
    "origin": "البرازيل",
    "code": "BR",
    "process": "تجريبية",
    "notes": [
      "شوكولاتة",
      "فانيليا",
      "كراميل",
      "بندق"
    ],
    "rating": 0,
    "reviews": 0
  },
  {
    "file": "silver",
    "name": "سيلفر",
    "origin": "السلفادور",
    "code": "SV",
    "process": "عسلية",
    "notes": [
      "توت",
      "كراميل",
      "لوز",
      "شوكولاتة داكنة"
    ],
    "rating": 0,
    "reviews": 0
  },
  {
    "file": "victoria",
    "name": "فكتوريا",
    "origin": "أوغندا",
    "code": "UG",
    "process": "طبيعية",
    "notes": [
      "يوسفي",
      "عنب",
      "عسل",
      "مكسرات"
    ],
    "rating": 0,
    "reviews": 0
  },
  {
    "file": "sulaf",
    "name": "سُلاف",
    "origin": "اليمن",
    "code": "YE",
    "process": "تجريبية",
    "notes": [
      "عنب",
      "أناناس",
      "موز",
      "عسل"
    ],
    "rating": 0,
    "reviews": 0
  },
  {
    "file": "solana",
    "name": "سولانا",
    "origin": "إثيوبيا",
    "code": "ET",
    "process": "تجريبية",
    "notes": [
      "توت أزرق",
      "فراولة",
      "فانيليا",
      "زهري"
    ],
    "rating": 0,
    "reviews": 0
  },
  {
    "file": "altura",
    "name": "ألتورا",
    "origin": "كولومبيا",
    "code": "CO",
    "process": "تجريبية",
    "notes": [
      "كرز",
      "باشن فروت",
      "برقوق",
      "شوكولاتة"
    ],
    "rating": 0,
    "reviews": 0
  },
  {
    "file": "chelchele",
    "name": "شيلشلي",
    "origin": "إثيوبيا",
    "code": "ET",
    "process": "طبيعية",
    "notes": [
      "فراولة",
      "توت أسود",
      "شوكولاتة"
    ],
    "rating": 0,
    "reviews": 0
  },
  {
    "file": "azora",
    "name": "أزورا",
    "origin": "أوغندا",
    "code": "UG",
    "process": "طبيعية",
    "notes": [
      "شمام",
      "جوافة",
      "عنب",
      "عسل"
    ],
    "rating": 0,
    "reviews": 0
  },
  {
    "file": "raul",
    "name": "راؤول",
    "origin": "غواتيمالا",
    "code": "GT",
    "process": "طبيعية",
    "notes": [
      "بابايا",
      "كرز",
      "رمان",
      "شوكولاتة"
    ],
    "rating": 0,
    "reviews": 0
  }
];
