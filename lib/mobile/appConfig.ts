// What the apps check on launch: the oldest build still allowed (older ones must update,
// a full-screen stop with a link to the store) and the newest one (older ones get a gentle nudge).
// Set from Vercel without code changes:
//   APP_MIN_IOS_BUILD / APP_LATEST_IOS_BUILD          (CFBundleVersion, e.g. 31)
//   APP_MIN_ANDROID_BUILD / APP_LATEST_ANDROID_BUILD  (versionCode, e.g. 2)
//   APP_IOS_STORE_URL / APP_ANDROID_STORE_URL
// Unset or 0 means nothing is forced.

export interface PlatformConfig { minBuild: number; latestBuild: number; storeUrl: string }
export interface AppConfig { ios: PlatformConfig; android: PlatformConfig; updateMessageAr: string }

const int = (v: string | undefined) => {
  const n = Number.parseInt(v ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

export function appConfig(env: Record<string, string | undefined> = process.env): AppConfig {
  const iosMin = int(env.APP_MIN_IOS_BUILD), androidMin = int(env.APP_MIN_ANDROID_BUILD);
  return {
    ios: {
      minBuild: iosMin,
      latestBuild: Math.max(iosMin, int(env.APP_LATEST_IOS_BUILD)),
      storeUrl: env.APP_IOS_STORE_URL?.trim() || "https://apps.apple.com/app/id6826369847",
    },
    android: {
      minBuild: androidMin,
      latestBuild: Math.max(androidMin, int(env.APP_LATEST_ANDROID_BUILD)),
      storeUrl: env.APP_ANDROID_STORE_URL?.trim() || "https://play.google.com/store/apps/details?id=dev.devmohd.bunnlist",
    },
    updateMessageAr: env.APP_UPDATE_MESSAGE_AR?.trim() || "نزّلنا نسخة جديدة فيها تحسينات مهمة. حدّث التطبيق عشان تكمل.",
  };
}
