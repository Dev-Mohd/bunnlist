import { describe, it, expect } from "vitest";
import { appConfig } from "../appConfig";

describe("app config", () => {
  it("forces nothing by default", () => {
    const c = appConfig({});
    expect(c.ios).toMatchObject({ minBuild: 0, latestBuild: 0 });
    expect(c.android.storeUrl).toContain("dev.devmohd.bunnlist");
  });

  it("reads builds and store links, latest never below the minimum", () => {
    const c = appConfig({ APP_MIN_IOS_BUILD: "31", APP_LATEST_IOS_BUILD: "30", APP_MIN_ANDROID_BUILD: "2", APP_LATEST_ANDROID_BUILD: "3",
      APP_IOS_STORE_URL: "https://apps.apple.com/app/id123", APP_UPDATE_MESSAGE_AR: "حدّث" });
    expect(c.ios).toEqual({ minBuild: 31, latestBuild: 31, storeUrl: "https://apps.apple.com/app/id123" });
    expect(c.android).toMatchObject({ minBuild: 2, latestBuild: 3 });
    expect(c.updateMessageAr).toBe("حدّث");
    expect(appConfig({ APP_MIN_IOS_BUILD: "abc" }).ios.minBuild).toBe(0);
  });
});
