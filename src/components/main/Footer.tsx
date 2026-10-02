"use client";

import {
  Button,
  Column,
  Flex,
  Row,
  Text,
  Icon,
  Option,
  Line,
  SmartLink,
} from "@once-ui-system/core";

import styles from "./Footer.module.scss";
import { useT } from "@/i18n/client";

export function Footer() {
  const t = useT();

  return (
    <Flex
      as={"footer"}
      fitHeight
      fillWidth
      paddingY={"20"}
      vertical={"center"}
      bottom={0}
      background={"overlay"}
      horizontal={"between"}
      className={styles.footer}
    >
      <Row fill horizontal={"between"} vertical={"center"}>
        <Row>
          <Text variant="body-default-s" onBackground="neutral-strong">
            <Text onBackground="neutral-weak">© 2026 /</Text>
            <Text onBackground="neutral-weak">
              {" "}
              {t("common.footer.builtWith")} <SmartLink href="https://once-ui.com">Once UI</SmartLink> /{" "}
              {t("common.footer.by")}{" "}
              <SmartLink href={"https://hitomihiumi.xyz/"}>hitomihiumi</SmartLink> 💜
            </Text>
          </Text>
        </Row>
        <Row>
          <Text onBackground="neutral-weak" variant={"body-default-s"}>
            <SmartLink href={"/news"}>{t("common.nav.news")}</SmartLink> /{" "}
            <SmartLink href={"/status"}>{t("common.nav.status")}</SmartLink> /{" "}
            <SmartLink href={"/terms"}>{t("common.nav.terms")}</SmartLink> /{" "}
            <SmartLink href={"/privacy"}>{t("common.nav.privacy")}</SmartLink>
          </Text>
        </Row>
      </Row>
    </Flex>
  );
}
