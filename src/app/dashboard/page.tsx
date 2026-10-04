"use client";

import {
  Heading,
  Text,
  Button,
  Column,
  Grid,
  Row,
  Background,
  Feedback,
  useToast,
  RevealFx,
} from "@once-ui-system/core";
import { useEffect, useMemo, useRef, useState } from "react";
import { UserGuildCard } from "@/types/discord";
import { GuildCard, SkeletonGuildCard } from "@/components/dashboard/GuildCard";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useT } from "@/i18n/client";

type ApiOk = { ok: true; guilds: UserGuildCard[] };
type ApiErr = { ok: false; error: string };

export default function Page() {
  const t = useT();
  const { status } = useSession();
  const { addToast } = useToast();
  const searchParams = useSearchParams();
  const discordParam = searchParams.get("discord");

  const [guilds, setGuilds] = useState<UserGuildCard[] | null>(null);
  const [loading, setLoading] = useState(true);
  const loadIdRef = useRef(0);

  const guildsWithBot = useMemo(() => guilds?.filter((g) => g.botPresent) ?? [], [guilds]);
  const guildsWithoutBot = useMemo(() => guilds?.filter((g) => !g.botPresent) ?? [], [guilds]);

  useEffect(() => {
    if (status !== "authenticated") return;

    const fetchGuilds = async () => {
      const id = ++loadIdRef.current;
      if (id === 1) setLoading(true);
      try {
        const res = await fetch("/api/user/guilds");
        const data = (await res.json()) as ApiOk | ApiErr;
        if (loadIdRef.current !== id) return;
        if (!res.ok || !data.ok) {
          addToast({
            variant: "danger",
            message:
              "error" in data
                ? data.error
                : t("settings.guilds.errorStatus", { status: res.status }),
          });
          setGuilds([]);
          return;
        }
        setGuilds(data.guilds);
      } catch {
        if (loadIdRef.current === id) {
          addToast({
            variant: "danger",
            message: t("settings.guilds.fetchFailed"),
          });
          setGuilds([]);
        }
      } finally {
        if (loadIdRef.current === id) setLoading(false);
      }
    };

    fetchGuilds();

    const handleFocus = () => {
      fetchGuilds();
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [status, t]);

  if (status === "unauthenticated") {
    return (
      <Column fill center>
        <Background
          fill
          position={"absolute"}
          gradient={{
            display: true,
            opacity: 100,
            x: 50,
            y: 100,
            colorStart: "brand-background-strong",
            colorEnd: "static-transparent",
          }}
          dots={{
            display: true,
            opacity: 100,
            size: "4",
            color: "page-background",
          }}
        />
        <Column fillWidth minHeight="100vh" maxWidth={"l"} padding="xl" gap={"xl"}>
          <RevealFx translateY={-0.5}>
            <Button prefixIcon={"back"} variant={"tertiary"} href={"/"}>
              {t("common.actions.backToHome")}
            </Button>
          </RevealFx>
          <RevealFx delay={300} translateY={-0.5} center>
            <Column center gap={"16"} fill>
              <Heading variant={"display-strong-l"}>
                {t("settings.guilds.loginRequiredTitle")}
              </Heading>
              <Row maxWidth={"s"}>
                <Text onBackground={"neutral-weak"} align={"center"}>
                  {t("settings.guilds.loginRequiredText")}
                </Text>
              </Row>
            </Column>
          </RevealFx>
        </Column>
      </Column>
    );
  }

  if (loading) {
    return (
      <Column fill center>
        <Background
          fill
          position={"absolute"}
          gradient={{
            display: true,
            opacity: 100,
            x: 50,
            y: 100,
            colorStart: "brand-background-strong",
            colorEnd: "static-transparent",
          }}
          dots={{
            display: true,
            opacity: 100,
            size: "4",
            color: "page-background",
          }}
        />
        <Column fillWidth minHeight="100vh" maxWidth={"l"} padding="xl" gap={"xl"}>
          <RevealFx translateY={-0.5}>
            <Button prefixIcon={"back"} variant={"tertiary"} href={"/"}>
              {t("common.actions.backToHome")}
            </Button>
          </RevealFx>
          <RevealFx delay={300} translateY={-0.5} center>
            <Column center gap={"16"}>
              <Heading variant={"display-strong-l"}>{t("settings.guilds.title")}</Heading>
              <Row maxWidth={"s"}>
                <Text onBackground={"neutral-weak"} align={"center"}>
                  {t("settings.guilds.description")}
                </Text>
              </Row>
            </Column>
          </RevealFx>
          <Grid columns={3} m={{ columns: 2 }} s={{ columns: 1 }} gap="m" fillWidth>
            {[...Array(6)].map((_, idx) => (
              <RevealFx delay={400 + idx * 100} translateY={-0.5} key={idx}>
                <SkeletonGuildCard />
              </RevealFx>
            ))}
          </Grid>
        </Column>
      </Column>
    );
  }

  return (
    <Column fill center>
      <Background
        fill
        position={"absolute"}
        gradient={{
          display: true,
          opacity: 100,
          x: 50,
          y: 100,
          colorStart: "brand-background-strong",
          colorEnd: "static-transparent",
        }}
        dots={{
          display: true,
          opacity: 100,
          size: "4",
          color: "page-background",
        }}
      />
      <Column fillWidth minHeight="100vh" maxWidth={"l"} padding="xl" gap={"xl"}>
        <RevealFx translateY={-0.5}>
          <Button prefixIcon={"back"} variant={"tertiary"} href={"/"}>
            {t("common.actions.backToHome")}
          </Button>
        </RevealFx>
        <RevealFx delay={300} translateY={-0.5} center>
          <Column center gap={"16"}>
            <Heading variant={"display-strong-l"}>{t("settings.guilds.title")}</Heading>
            <Row maxWidth={"s"}>
              <Text onBackground={"neutral-weak"} align={"center"}>
                {t("settings.guilds.description")}
              </Text>
            </Row>
          </Column>
        </RevealFx>

        {discordParam === "access" && (
          <RevealFx translateY={-0.5}>
            <Feedback
              variant="danger"
              title={t("settings.guilds.accessTitle")}
              description={t("settings.guilds.accessText")}
            />
          </RevealFx>
        )}
        {guildsWithBot.length > 0 && (
          <Column gap={"m"} fillWidth maxWidth={"l"}>
            <RevealFx translateY={-0.5} direction="column" gap="m">
              <Heading variant={"heading-strong-xl"}>{t("settings.guilds.withBotTitle")}</Heading>
              <Text onBackground={"neutral-weak"}>{t("settings.guilds.withBotText")}</Text>
            </RevealFx>
            <Grid columns={3} m={{ columns: 2 }} s={{ columns: 1 }} gap="m" fillWidth>
              {guildsWithBot.map((g: UserGuildCard, idx) => (
                <RevealFx delay={100 + idx * 100} translateY={-0.5} key={`${g.id}`}>
                  <GuildCard
                    name={g.name}
                    id={g.id}
                    icon={g.iconUrl}
                    inviteURL={g.inviteUrl}
                    hasBot={g.botPresent}
                  />
                </RevealFx>
              ))}
            </Grid>
          </Column>
        )}
        {guildsWithoutBot.length > 0 && (
          <Column gap={"m"} fillWidth maxWidth={"l"}>
            <RevealFx delay={300} translateY={-0.5} direction="column" gap="m">
              <Heading variant={"heading-strong-xl"}>
                {t("settings.guilds.withoutBotTitle")}
              </Heading>
              <Text onBackground={"neutral-weak"}>{t("settings.guilds.withoutBotText")}</Text>
            </RevealFx>
            <Grid columns={3} m={{ columns: 2 }} s={{ columns: 1 }} gap="m" fillWidth>
              {guildsWithoutBot.map((g: UserGuildCard, idx) => (
                <RevealFx delay={400 + idx * 100} translateY={-0.5} key={`${g.id}`}>
                  <GuildCard
                    name={g.name}
                    id={g.id}
                    icon={g.iconUrl}
                    inviteURL={g.inviteUrl}
                    hasBot={g.botPresent}
                    key={`${g.id}`}
                  />
                </RevealFx>
              ))}
            </Grid>
          </Column>
        )}
      </Column>
    </Column>
  );
}
