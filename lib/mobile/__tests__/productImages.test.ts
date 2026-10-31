import { describe, it, expect } from "vitest";
import { imageCandidates } from "../productImages";

describe("imageCandidates", () => {
  it("takes the product's photos from Salla pages, biggest of each, without the logo", () => {
    const html = `
      <script type="application/ld+json">{"@type":"Organization","logo":"https://cdn.salla.sa/AbC/logo-200x200-L0go.png"}</script>
      <img src="https://cdn.salla.sa/AbC/1a2b-497.1x500-tok1.jpg"><img src="https://cdn.salla.sa/AbC/1a2b-994.2x1000-tok1.jpg">
      <img src="https://cdn.salla.sa/AbC/9z-663.9x1000-card2.png">
      <img src="https://cdn.salla.sa/cdn-cgi/image/fit=scale-down,width=400/AbC/9z-663.9x1000-card2.png">
      <img src="https://cdn.salla.sa/form-builder/x-10x10-f.png">`;
    expect(imageCandidates(html, "https://kuf.sa/ar/x/p1")).toEqual([
      "https://cdn.salla.sa/AbC/1a2b-994.2x1000-tok1.jpg", "https://cdn.salla.sa/AbC/9z-663.9x1000-card2.png",
    ]);
  });

  it("takes Zid's product image and uploads, unwrapping resized copies and skipping svg icons", () => {
    const store = "2fc7db3b-4ce6-4a93-944f-b7cc8914ea10";
    const html = `
      <script type="application/ld+json">{"@type":"Product","image":"https://media.zid.store/cdn-cgi/image/fit=scale-down,width=1000/https://media.zid.store/${store}/567aeda8-bd66-4409-8ac8-c1f11fd241a3.jpeg"}</script>
      <img src="https://media.zid.store/${store}/adf516ff-932f-4220-8ec3-442edab10836.svg">
      <img src="https://media.zid.store/cdn-cgi/image/w=100,f=auto/https://media.zid.store/${store}/3ca8dafd-469b-4d00-86c5-35bd00018d6e.png">`;
    expect(imageCandidates(html, "https://october.sa/products/x")).toEqual([
      `https://media.zid.store/${store}/567aeda8-bd66-4409-8ac8-c1f11fd241a3.jpeg`,
      `https://media.zid.store/${store}/3ca8dafd-469b-4d00-86c5-35bd00018d6e.png`,
    ]);
  });
});
