import getNavigation from "@/app/utils/getNavigation";
import { CONTENT_DIR } from "@/app/utils/content";
import { getLocale } from "@/i18n/server";
import { NextResponse } from "next/server";

export async function GET() {
  const locale = await getLocale();
  const navigation = getNavigation(CONTENT_DIR, locale);
  return NextResponse.json(navigation, { headers: { Vary: "Cookie, Accept-Language" } });
}
