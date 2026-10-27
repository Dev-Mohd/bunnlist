// Universal Links: tells iOS that bunnlist.com/coffees/* opens in the BunnList app.
// The app ID is the team ID plus bundle ID, read from the same settings the push
// sender uses. Served as JSON without an extension, as Apple expects.
export const dynamic = "force-dynamic";

export function GET() {
  const team = process.env.APNS_TEAM_ID;
  const bundle = process.env.APNS_BUNDLE_ID ?? "dev.devmohd.bunnlist";
  const appIDs = team ? [`${team}.${bundle}`] : [];
  return Response.json(
    { applinks: { details: [{ appIDs, components: [{ "/": "/coffees/*", comment: "Shared coffees" }] }] } },
    { headers: { "Cache-Control": "public, max-age=3600" } },
  );
}
