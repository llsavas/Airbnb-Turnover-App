import { extractCheckinDetails, extractDepartureTimes, syncHospitable } from "@/lib/hospitable";

// Fetching reservations for every property can take a while.
export const maxDuration = 300;

// Called by Vercel Cron (see vercel.json) or any scheduler that sends
// "Authorization: Bearer <CRON_SECRET>".
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const cleanings = await syncHospitable();
    const checkins = await extractCheckinDetails();
    const departures = await extractDepartureTimes();
    return Response.json({ ...cleanings, checkins, departures });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
