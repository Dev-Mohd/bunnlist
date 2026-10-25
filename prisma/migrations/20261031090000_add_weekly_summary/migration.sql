-- The Friday "ملخصك الأسبوعي" notification, on by default.
ALTER TABLE "MobileNotificationSettings" ADD COLUMN "weeklySummary" BOOLEAN NOT NULL DEFAULT true;
