import { z } from "zod";
import { BrewMethod, CoffeeProcess } from "@prisma/client";

const brewMethodValues = Object.values(BrewMethod) as [BrewMethod, ...BrewMethod[]];
const processValues = Object.values(CoffeeProcess) as [CoffeeProcess, ...CoffeeProcess[]];

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
});

export type CoffeeFormValues = z.infer<typeof coffeeFormSchema>;
