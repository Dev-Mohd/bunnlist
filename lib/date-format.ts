const DAY_MS = 24 * 60 * 60 * 1000;

const relativeFormatter = new Intl.RelativeTimeFormat("ar-SA", {
  numeric: "auto",
});

const dateFormatter = new Intl.DateTimeFormat("ar-SA", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function formatReviewDate(date: Date): string {
  const diffMs = date.getTime() - Date.now();
  const diffDays = Math.round(diffMs / DAY_MS);

  if (Math.abs(diffDays) < 7) {
    return relativeFormatter.format(diffDays, "day");
  }

  return dateFormatter.format(date);
}
