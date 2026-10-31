import { describe, it, expect } from "vitest";
import { tidyDescription } from "../describe";

describe("tidyDescription", () => {
  it("puts run-together spec labels each on a line and drops the bag weight", () => {
    expect(tidyDescription("البلد: اثيوبيا - يرغا شف الوزن: 250 جم الارتفاع عن سطح البحر: 1,200-1,800 متر نوع المعالجة: مجفف الإيحاءات: فاكهية ، توت"))
      .toBe("البلد: اثيوبيا - يرغا شف\nالارتفاع عن سطح البحر: 1,200-1,800 متر\nنوع المعالجة: مجفف\nالإيحاءات: فاكهية ، توت");
    expect(tidyDescription("الاسم: فراولةالدولة: كولومبياالمعالجة: انفيوجن")).toBe("الاسم: فراولة\nالدولة: كولومبيا\nالمعالجة: انفيوجن");
  });

  it("drops recipes, storage advice, gift offers and shop slogans, keeping what the text says about the coffee", () => {
    expect(tidyDescription("حمصة شاملة الدولة: أوغندا المعالجة: طبيعية الايحاءات: شوكولاتة، عنب. وصفة مقترحة للإسبريسو : كمية القهوة : 18 جرام"))
      .toBe("حمصة شاملة\nالدولة: أوغندا\nالمعالجة: طبيعية\nالايحاءات: شوكولاتة، عنب");
    expect(tidyDescription("قهوة عنب | تسوق انفيوجن عنب 125 جم من أناناس، بإيحاء عنب واضح. اطلب عبوتك 125جم الآن"))
      .toBe("انفيوجن عنب 125 جم من أناناس، بإيحاء عنب واضح");
    expect(tidyDescription("كولومبيا ويلا بمعالجة مجففة وإيحاءات خوخ. راجع التفاصيل واختر الوزن والطحن الملائم لطريقتك"))
      .toBe("كولومبيا ويلا بمعالجة مجففة وإيحاءات خوخ");
    expect(tidyDescription("هي محمصة سعودية مقرها حائل تأسست عام 2020. محصول مغسول بإيحاءات الكراميل والبندق."))
      .toBe("محصول مغسول بإيحاءات الكراميل والبندق");
  });

  it("returns null when nothing about the coffee is left", () => {
    expect(tidyDescription("﻿")).toBeNull();
    expect(tidyDescription("وصفات مقترحة: وصفة تقطير: الأداة: V60")).toBeNull();
    expect(tidyDescription(null)).toBeNull();
  });
});
