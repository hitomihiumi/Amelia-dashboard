import { PageHeader } from "@/components/layout/PageHeader";
import { getT } from "@/i18n/server";
import { normalizeBannerSettings } from "@/lib/banners/normalize";
import { loadBannerContext } from "@/lib/banners/server";
import { Guild } from "@/lib/db/Guild";
import { Flex } from "@once-ui-system/core";
import { BannersForm } from "./BannersForm";

export default async function BannersSettingsPage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const t = await getT();
  const { guildId } = await params;

  const [stored, context] = await Promise.all([
    new Guild(guildId).get("utils.banners"),
    loadBannerContext(guildId),
  ]);

  return (
    <Flex direction="column" gap="24">
      <PageHeader title={t("banners.title")} description={t("banners.description")} />
      <BannersForm
        guildId={guildId}
        defaultSettings={normalizeBannerSettings(stored)}
        context={context}
      />
    </Flex>
  );
}
