import { z } from "zod";
import {
  BrewMethod,
  CoffeeImageSource,
  CoffeeImageType,
  CoffeeProcess,
  ImagePermissionStatus,
} from "@prisma/client";

const brewMethodValues = Object.values(BrewMethod) as [BrewMethod, ...BrewMethod[]];
const processValues = Object.values(CoffeeProcess) as [CoffeeProcess, ...CoffeeProcess[]];
const imageTypeValues = Object.values(CoffeeImageType) as [CoffeeImageType, ...CoffeeImageType[]];
const imagePermissionStatusValues = Object.values(ImagePermissionStatus) as [
  ImagePermissionStatus,
  ...ImagePermissionStatus[],
];
const imageSourceValues = Object.values(CoffeeImageSource) as [
  CoffeeImageSource,
  ...CoffeeImageSource[],
];

export const coffeeFormSchema = z.object({
  name: z.string().min(2, "الاسم الإنجليزي يجب أن يكون حرفين على الأقل").max(100),
  nameAr: z.string().min(2, "الاسم العربي مطلوب").max(100),
  roasterId: z.string().min(1, "اختر محمصة"),
  originCountryId: z.string().min(1, "اختر بلد المنشأ"),
  region: z.string().max(100).optional(),
  regionAr: z.string().max(100).optional(),
  process: z.enum(processValues, { error: "اختر طريقة المعالجة" }),
  variety: z.string().max(100).optional(),
  altitudeMeters: z.number().int().min(0).max(8000).optional().nullable(),
  flavorNotes: z.array(z.string().min(1)).min(1, "أضف نكهة واحدة على الأقل"),
  recommendedBrewMethods: z
    .array(z.enum(brewMethodValues))
    .min(1, "اختر طريقة تحضير واحدة على الأقل"),
  description: z.string().max(2000).optional(),
  descriptionAr: z.string().max(2000).optional(),
  imagePath: z.string().optional(),
  imageUrl: z.string().url("رابط الصورة غير صحيح").or(z.literal("")).optional(),
  imageType: z.enum(imageTypeValues).default(CoffeeImageType.NONE),
  imagePermissionStatus: z
    .enum(imagePermissionStatusValues)
    .default(ImagePermissionStatus.PLACEHOLDER_ONLY),
  imageSource: z.enum(imageSourceValues).default(CoffeeImageSource.PLACEHOLDER),
  imageCredit: z.string().max(200).optional(),
  imageSourceUrl: z.string().url("رابط مصدر الصورة غير صحيح").or(z.literal("")).optional(),
  imagePermissionNote: z.string().max(1000).optional(),
  imageApprovedAt: z.date().optional().nullable(),
  published: z.boolean().default(true),
});

export type CoffeeFormValues = z.infer<typeof coffeeFormSchema>;
