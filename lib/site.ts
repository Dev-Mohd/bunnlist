// The marketing site's shared facts. The app is the product; the site introduces it.

/** Where people reach us (App Store support URL, roasters, privacy questions). */
export const CONTACT_EMAIL = "devmohd1413@gmail.com";

export const SITE_URL = "https://bunnlist.com";

/** Where the app can be had, in a sentence (the footer). */
export const AVAILABILITY = "متوفر على App Store، وعلى Android بملف تثبيت مباشر";
/** The App Store listing (also the Smart App Banner id). */
export const APP_STORE_ID = "6826369847";
export const APP_STORE_URL = `https://apps.apple.com/app/id${APP_STORE_ID}`;

/** Android, outside Google Play: the page that explains installing, and the APK it downloads.
 *  Put the signed release APK at public/download/BunnList.apk, or set NEXT_PUBLIC_ANDROID_APK_URL to a file hosted elsewhere. */
export const ANDROID_PAGE = "/android";
export const ANDROID_APK_LOCAL = "/download/BunnList.apk";
export const ANDROID_APK_URL = process.env.NEXT_PUBLIC_ANDROID_APK_URL || ANDROID_APK_LOCAL;
/** The oldest Android the app runs on (minSdk 26). */
export const ANDROID_MIN = "Android 8";
