export const ERROR_MESSAGES = {
  GENERIC: "حدث خطأ، حاول مرة أخرى",
  UNAUTHORIZED: "يجب تسجيل الدخول أولاً",
  FORBIDDEN: "ليس لديك صلاحية للقيام بهذا الإجراء",
  NOT_FOUND: "العنصر غير موجود",
  RATE_LIMITED: "تجاوزت الحد المسموح، حاول مرة أخرى بعد قليل",
  VALIDATION: "البيانات المدخلة غير صحيحة",
  DB_ERROR: "تعذر الاتصال بقاعدة البيانات",
  UPLOAD_ERROR: "تعذر رفع الملف",
  SESSION_EXPIRED: "انتهت صلاحية الجلسة، سجّل دخولك مجدداً",
  HAS_REVIEWS: "لا يمكن حذف محصول له تقييمات",
  COFFEE_NOT_FOUND: "المحصول غير موجود",
  REVIEW_NOT_FOUND: "التقييم غير موجود",
  INVALID_RATING: "التقييم يجب أن يكون بين 1 و 5",
} as const;

export type ErrorMessageKey = keyof typeof ERROR_MESSAGES;
