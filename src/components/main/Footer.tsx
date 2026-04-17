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

export function Footer() {
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
            <Text onBackground="neutral-weak">© 2024-2026 /</Text>
            <Text onBackground="neutral-weak">
              {" "}
              Built with <SmartLink href="https://once-ui.com">Once UI</SmartLink> / By{" "}
              <SmartLink href={"https://hitomihiumi.xyz/"}>hitomihiumi</SmartLink> 💜
            </Text>
          </Text>
        </Row>
        <Row>
          <Text onBackground="neutral-weak" variant={"body-default-s"}>
            <SmartLink href={"/terms"}>Terms of Service</SmartLink> /{" "}
            <SmartLink href={"/privacy"}>Privacy Policy</SmartLink>
          </Text>
        </Row>
      </Row>
    </Flex>
  );
}
