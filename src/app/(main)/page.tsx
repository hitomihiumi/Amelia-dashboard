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
  Row, Media, Background, BlobFx, TypeFx,
} from "@once-ui-system/core";
import {signIn, useSession} from "next-auth/react";
import {openDiscordOAuthPopup} from "@/lib/discord/popup-signin";

export default function Home() {
  const { data: session, status } = useSession();

  const handleLogin = () => {
    const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;

    if (isMobile) {
      signIn("discord", { callbackUrl: "/dashboard" });
    } else {
      openDiscordOAuthPopup({ next: "/dashboard" });
    }
  };

  return <Column fill center padding="l">
    <Row gap={'l'} padding={'l'} center radius={'l'} overflow={'hidden'} border="neutral-medium">
      <BlobFx seed={42} position={'absolute'} translateY="50%" opacity={50}/>
      <Background
          fill
          grid={{
            display: true,
            opacity: 100,
            color: "neutral-alpha-medium",
            width: "1rem",
            height: "1rem"
          }}
          position={'absolute'}
      />
      <Column center gap={'8'}>
        <Column gap={"8"} center paddingLeft={'12'}>
          <Text variant={'heading-strong-xs'} onBackground={'brand-medium'}>
            <TypeFx
                words={["Open Source", "Multipurpose", "Customizable"]}
                speed={80}
                hold={2000}
                trigger="instant"
            />
          </Text>
          <Text variant={'display-strong-l'} onBackground={'brand-weak'}>
            Amelia
          </Text>
        </Column>
        <Text align={"center"} onBackground={'neutral-medium'}>
          Your handy assistant for improving and customizing your Discord guild!
        </Text>
        <Row gap={'16'} paddingTop={'8'}>
          {status === "authenticated" ? (
              <Button prefixIcon={"gear"} variant={"primary"} href={"/dashboard"}>Get Started</Button>
          ) : (
              <Button prefixIcon={"discord"} variant={"primary"} onClick={handleLogin}>Login</Button>
          )}
          <Button prefixIcon={"plus"} variant={"secondary"} href={""}>Invite Bot</Button>
        </Row>
      </Column>
      <Column fill height={12} width={12} s={{ hide: true }}>
        <Row fill padding={"2"} radius={"full"} border={"brand-medium"} borderWidth="2">
          <Media fill src={"/images/avatar.jpg"} radius={"full"} />
        </Row>
      </Column>
    </Row>
  </Column>;
}
