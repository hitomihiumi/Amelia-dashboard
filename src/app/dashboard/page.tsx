"use client";

import {
  Heading,
  Text,
  Button,
  Column,
  Badge,
  Logo,
  Line,
  LetterFx,
  Grid,
  Row,
  Background,
} from "@once-ui-system/core";
import { useEffect, useMemo, useRef, useState } from "react";
import { UserGuildCard } from "@/types/discord";
import { GuildCard, SkeletonGuildCard } from "@/components/dashboard/GuildCard";
import { useSession } from "next-auth/react";
import { Footer } from "@/components/main/Footer";

type ApiOk = { ok: true; guilds: UserGuildCard[] };
type ApiErr = { ok: false; error: string };

export default function Page() {
  const { status } = useSession();

  const [guilds, setGuilds] = useState<UserGuildCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const loadIdRef = useRef(0);

  const guildsWithBot = useMemo(() => guilds?.filter((g) => g.botPresent) ?? [], [guilds]);
  const guildsWithoutBot = useMemo(() => guilds?.filter((g) => !g.botPresent) ?? [], [guilds]);

  useEffect(() => {
    if (status !== "authenticated") return;

    const fetchGuilds = async () => {
      const id = ++loadIdRef.current;
      if (id === 1) setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/user/guilds");
        const data = (await res.json()) as ApiOk | ApiErr;
        if (loadIdRef.current !== id) return;
        if (!res.ok || !data.ok) {
          setError("error" in data ? data.error : `Ошибка ${res.status}`);
          setGuilds([]);
          return;
        }
        setGuilds(data.guilds);
      } catch {
        if (loadIdRef.current === id) {
          setError("Не удалось загрузить серверы");
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
  }, [status]);

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
          <Button prefixIcon={"back"} variant={"tertiary"} href={"/"}>
            Back to Home
          </Button>
          <Column center gap={"16"} fill>
            <Heading variant={"display-strong-l"}>Login Required</Heading>
            <Row maxWidth={"s"}>
              <Text onBackground={"neutral-weak"} align={"center"}>
                You need to be logged in to view your guilds. Please log in with your Discord
                account to see the servers where you have permission to manage the bot.
              </Text>
            </Row>
          </Column>
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
          <Button prefixIcon={"back"} variant={"tertiary"} href={"/"}>
            Back to Home
          </Button>
          <Column center gap={"16"}>
            <Heading variant={"display-strong-l"}>Your Guilds</Heading>
            <Row maxWidth={"s"}>
              <Text onBackground={"neutral-weak"} align={"center"}>
                List of servers where you have permission to manage the bot. If you don't see a
                server here, make sure you have the "Manage Server" permission on that server and
                try refreshing.
              </Text>
            </Row>
          </Column>
          <Grid columns={3} m={{ columns: 2 }} s={{ columns: 1 }} gap="m" fillWidth>
            <SkeletonGuildCard />
            <SkeletonGuildCard />
            <SkeletonGuildCard />
            <SkeletonGuildCard />
            <SkeletonGuildCard />
            <SkeletonGuildCard />
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
        <Button prefixIcon={"back"} variant={"tertiary"} href={"/"}>
          Back to Home
        </Button>
        <Column center gap={"16"}>
          <Heading variant={"display-strong-l"}>Your Guilds</Heading>
          <Row maxWidth={"s"}>
            <Text onBackground={"neutral-weak"} align={"center"}>
              List of servers where you have permission to manage the bot. If you don't see a server
              here, make sure you have the "Manage Server" permission on that server and try
              refreshing.
            </Text>
          </Row>
        </Column>
        <Column gap={"m"} fillWidth maxWidth={"l"}>
          <Heading variant={"heading-strong-xl"}>With Amelia</Heading>
          <Text onBackground={"neutral-weak"}>
            Servers where you have permission to invite the bot and it's already present.
          </Text>
          {guildsWithBot.length > 0 && (
            <Grid columns={3} m={{ columns: 2 }} s={{ columns: 1 }} gap="m" fillWidth>
              {guildsWithBot.map((g: UserGuildCard) => (
                <GuildCard
                  name={g.name}
                  id={g.id}
                  icon={g.iconUrl}
                  inviteURL={g.inviteUrl}
                  hasBot={g.botPresent}
                  key={`${g.id}`}
                />
              ))}
            </Grid>
          )}
        </Column>
        <Column gap={"m"} fillWidth maxWidth={"l"}>
          <Heading variant={"heading-strong-xl"}>Without Amelia</Heading>
          <Text onBackground={"neutral-weak"}>
            Servers where you have permission to invite the bot but it's not present yet.
          </Text>
          {guildsWithoutBot.length > 0 && (
            <Grid columns={3} m={{ columns: 2 }} s={{ columns: 1 }} gap="m" fillWidth>
              {guildsWithoutBot.map((g: UserGuildCard) => (
                <GuildCard
                  name={g.name}
                  id={g.id}
                  icon={g.iconUrl}
                  inviteURL={g.inviteUrl}
                  hasBot={g.botPresent}
                  key={`${g.id}`}
                />
              ))}
            </Grid>
          )}
        </Column>
      </Column>
    </Column>
  );
}
