"use client";

import React, { useEffect, useId, useState } from "react";
import Link from "next/link";
import { Button, Column, Row, Switch, Text } from "@once-ui-system/core";
import { LuCookie } from "react-icons/lu";
import classNames from "classnames";
import { useT } from "@/i18n/client";
import { useCookieConsent } from "./CookieConsent";
import styles from "./CookieBanner.module.scss";

/**
 * Asks for consent on the first visit and again whenever the visitor reopens it from the
 * footer. Strictly necessary cookies (sign-in session, remembered language, this choice)
 * need no consent and are listed for transparency; analytics is opt-in.
 */
export function CookieBanner() {
  const t = useT();
  const titleId = useId();
  const textId = useId();
  const { consent, bannerOpen, acceptAll, rejectOptional, save } = useCookieConsent();

  const [customizing, setCustomizing] = useState(false);
  const [analytics, setAnalytics] = useState(consent?.analytics ?? false);

  // Reopened from the footer: start from the current choice, with the details visible.
  useEffect(() => {
    if (bannerOpen) {
      setAnalytics(consent?.analytics ?? false);
      setCustomizing(consent !== null);
    }
  }, [bannerOpen, consent]);

  if (!bannerOpen) return null;

  return (
    <section
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      aria-describedby={textId}
      className={styles.banner}
    >
      <Row gap="12" vertical="start">
        <span className={styles.icon} aria-hidden="true">
          <LuCookie size={20} />
        </span>
        <Column gap="4" style={{ minWidth: 0 }}>
          <Text id={titleId} variant="heading-strong-s">
            {t("common.cookies.title")}
          </Text>
          <Text id={textId} variant="body-default-s" onBackground="neutral-weak">
            {t("common.cookies.description")}{" "}
            <Link href="/privacy#cookies" className={styles.link}>
              {t("common.cookies.learnMore")}
            </Link>
          </Text>
        </Column>
      </Row>

      {customizing && (
        <Column gap="8" className={styles.details}>
          <Row gap="12" vertical="center" horizontal="between" className={styles.category}>
            <Column gap="2" style={{ minWidth: 0 }}>
              <Text variant="label-strong-s">{t("common.cookies.necessary.title")}</Text>
              <Text variant="body-default-xs" onBackground="neutral-weak">
                {t("common.cookies.necessary.text")}
              </Text>
            </Column>
            <Text variant="label-default-xs" onBackground="neutral-weak" className={styles.always}>
              {t("common.cookies.alwaysOn")}
            </Text>
          </Row>

          <Row gap="12" vertical="center" horizontal="between" className={styles.category}>
            <Column gap="2" style={{ minWidth: 0 }}>
              <Text variant="label-strong-s">{t("common.cookies.analytics.title")}</Text>
              <Text variant="body-default-xs" onBackground="neutral-weak">
                {t("common.cookies.analytics.text")}
              </Text>
            </Column>
            <Switch
              checked={analytics}
              onToggle={() => setAnalytics((value) => !value)}
              ariaLabel={t("common.cookies.analytics.title")}
            />
          </Row>
        </Column>
      )}

      <div className={classNames(styles.actions, customizing && styles.actionsStacked)}>
        {customizing ? (
          <>
            <Button variant="primary" size="s" onClick={() => save({ analytics })} fillWidth>
              {t("common.cookies.save")}
            </Button>
            <Button variant="secondary" size="s" onClick={acceptAll} fillWidth>
              {t("common.cookies.acceptAll")}
            </Button>
          </>
        ) : (
          <>
            <Button variant="primary" size="s" onClick={acceptAll} fillWidth>
              {t("common.cookies.acceptAll")}
            </Button>
            <Button variant="secondary" size="s" onClick={rejectOptional} fillWidth>
              {t("common.cookies.necessaryOnly")}
            </Button>
            <Button variant="tertiary" size="s" onClick={() => setCustomizing(true)} fillWidth>
              {t("common.cookies.customize")}
            </Button>
          </>
        )}
      </div>
    </section>
  );
}
