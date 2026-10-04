import { NextResponse } from "next/server";
import { evaluateIncidents, getStatusSnapshot } from "@/lib/status/status";

export const dynamic = "force-dynamic";

/**
 * Health check for an external scheduler (Vercel Cron, systemd timer, uptime
 * monitor). The status page evaluates incidents on render too, but only this
 * catches an outage while nobody is looking at the site.
 */
export async function GET(request: Request) {
  const secret = process.env.STATUS_CRON_SECRET;

  if (secret) {
    const header = request.headers.get("authorization");
    if (header !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  const snapshot = await getStatusSnapshot();
  await evaluateIncidents(snapshot);

  return NextResponse.json({ ok: true, overall: snapshot.overall, checkedAt: snapshot.checkedAt });
}
