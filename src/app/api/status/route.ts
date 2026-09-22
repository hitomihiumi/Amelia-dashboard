import { NextResponse } from "next/server";
import { getStatusSnapshot } from "@/lib/status/status";

export const dynamic = "force-dynamic";

/** Public snapshot, polled by the status page and the landing statistics. */
export async function GET() {
  const snapshot = await getStatusSnapshot();

  return NextResponse.json(snapshot, {
    headers: { "Cache-Control": "no-store" },
  });
}
