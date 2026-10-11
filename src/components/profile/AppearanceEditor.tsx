"use client";

import {
  Button,
  Column,
  Dialog,
  Flex,
  Media,
  Row,
  SegmentedControl,
  Slider,
  Text,
  Textarea,
  useToast,
} from "@once-ui-system/core";
import { MediaUpload } from "@once-ui-system/core/media";
import { useCallback, useEffect, useMemo, useState } from "react";
import { saveAppearance, type CardPatch } from "@/app/(main)/profile/actions";
import { ColorInput } from "@/components/dashboard/ColorInput";
import { shrinkForUpload } from "@/components/images/compress";
import { Section } from "@/components/dashboard/Section";
import { PageHeader } from "@/components/layout/PageHeader";
import { SelectReact } from "@/components/user/SelectReact";
import { CardPreview } from "@/components/profile/cards/CardPreview";
import type {
  CardColors,
  CardIdentity,
  CardKind,
  CardTimeUnits,
} from "@/components/profile/cards/types";
import { useUnsavedChanges } from "@/contexts/UnsavedChangesContext";
import { useT } from "@/i18n/client";
import type { MessageKey } from "@/i18n/messages";
import {
  type Appearance,
  BIO_MAX_LENGTH,
  CARD_KINDS,
  COLOR_KEYS,
  ICONS_PADDING_MAX,
  ICONS_PADDING_MIN,
  defaultAppearance,
  defaultColors,
  sameCard,
} from "@/lib/profile/appearance";
import {
  CARD_BACKGROUND_ACCEPT,
  CARD_BACKGROUND_MAX_BYTES,
  CARD_BACKGROUND_SIZES,
  DEFAULT_CARD_BACKGROUND,
  cardBackgroundUrl,
} from "@/lib/profile/cardBackground";
import styles from "./Appearance.module.scss";

export interface EditorGuild {
  id: string;
  name: string;
  /** What the preview shows as the member's numbers on this server. */
  stats: { level: number; xp: number; voiceTime: number };
  appearance: Appearance;
}

interface AppearanceEditorProps {
  guilds: EditorGuild[];
  initialGuildId: string;
  identity: CardIdentity;
  units: CardTimeUnits;
}

type Drafts = Record<string, Appearance>;

const cloneAppearance = (value: Appearance): Appearance => structuredClone(value);

/** The part of the appearance a card is made of, as the server expects it. */
function toPatch(kind: CardKind, a: Appearance): CardPatch {
  if (kind === "profile") {
    return {
      kind,
      solid: a.profile.solid,
      background: a.profile.background,
      bio: a.profile.bio,
      iconsPadding: a.profile.iconsPadding,
    };
  }
  return { kind, solid: a[kind].solid, background: a[kind].background };
}

/** Copies one card from `from` over the same card of `to`. */
function withCard(to: Appearance, kind: CardKind, from: Appearance): Appearance {
  const next = cloneAppearance(to);
  next[kind].background = { ...from[kind].background };
  if (kind === "profile") {
    next.profile.solid = { ...from.profile.solid };
    next.profile.bio = from.profile.bio;
    next.profile.iconsPadding = from.profile.iconsPadding;
  } else {
    next[kind].solid = { ...from[kind].solid };
  }
  return next;
}

export function AppearanceEditor({
  guilds,
  initialGuildId,
  identity,
  units,
}: AppearanceEditorProps) {
  const t = useT();
  const { addToast } = useToast();
  const { setIsDirty, setSaveAction, setCancelAction } = useUnsavedChanges();

  const [guildId, setGuildId] = useState(initialGuildId);
  const [kind, setKind] = useState<CardKind>("rank");
  const [baselines, setBaselines] = useState<Drafts>(() =>
    Object.fromEntries(guilds.map((g) => [g.id, cloneAppearance(g.appearance)])),
  );
  const [drafts, setDrafts] = useState<Drafts>(() =>
    Object.fromEntries(guilds.map((g) => [g.id, cloneAppearance(g.appearance)])),
  );
  const [confirmAll, setConfirmAll] = useState(false);
  const [applying, setApplying] = useState(false);

  const guild = guilds.find((g) => g.id === guildId) ?? guilds[0];
  const draft = drafts[guild.id];
  const colors = draft[kind].solid;

  /** Kinds changed since the last save, per server. */
  const dirtyByGuild = useMemo(() => {
    const out: Record<string, CardKind[]> = {};
    for (const g of guilds) {
      const changed = CARD_KINDS.filter((k) => !sameCard(k, drafts[g.id], baselines[g.id]));
      if (changed.length > 0) out[g.id] = changed;
    }
    return out;
  }, [guilds, drafts, baselines]);

  const isDirty = Object.keys(dirtyByGuild).length > 0;

  useEffect(() => {
    setIsDirty(isDirty);
  }, [isDirty, setIsDirty]);

  const update = useCallback(
    (change: (next: Appearance) => void) => {
      setDrafts((prev) => {
        const next = cloneAppearance(prev[guild.id]);
        change(next);
        return { ...prev, [guild.id]: next };
      });
    },
    [guild.id],
  );

  const setColor = (key: keyof CardColors, value: string) => {
    // The clear button of the field hands back an empty string: that means "the default".
    const color = value || defaultColors(kind)[key];
    update((next) => {
      next[kind].solid[key] = color;
    });
  };

  const background = draft[kind].background;
  const [uploading, setUploading] = useState(false);

  /** Sends the picture; the server cuts it to the size of the card and hands back its id. */
  const uploadBackground = async (file: File) => {
    const target = kind;
    setUploading(true);
    try {
      const body = await shrinkForUpload(file, CARD_BACKGROUND_MAX_BYTES);
      if (!body) {
        addToast({ variant: "danger", message: t("profile.appearance.background.tooBig") });
        return;
      }
      const form = new FormData();
      form.set("file", body, file.name);
      form.set("kind", target);
      const res = await fetch("/api/profile/card-background", { method: "POST", body: form });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        const code =
          json?.error === "tooBig" || json?.error === "notAPicture" ? json.error : "failed";
        addToast({
          variant: "danger",
          message: t(`profile.appearance.background.${code}` as MessageKey),
        });
        return;
      }
      update((next) => {
        next[target].background.image = json.image as string;
      });
    } catch {
      addToast({ variant: "danger", message: t("profile.appearance.background.failed") });
    } finally {
      setUploading(false);
    }
  };

  const reset = () => {
    const defaults = defaultAppearance();
    update((next) => {
      next[kind].background = { ...DEFAULT_CARD_BACKGROUND };
      if (kind === "profile") {
        next.profile.solid = defaults.profile.solid;
        next.profile.bio = defaults.profile.bio;
        next.profile.iconsPadding = defaults.profile.iconsPadding;
      } else {
        next[kind].solid = defaults[kind].solid;
      }
    });
  };

  const handleSave = useCallback(async () => {
    const saved: Drafts = {};
    for (const [id, kinds] of Object.entries(dirtyByGuild)) {
      const result = await saveAppearance(
        id,
        kinds.map((k) => toPatch(k, drafts[id])),
      );
      if (!result) {
        addToast({ variant: "danger", message: t("profile.appearance.noResponse") });
        break;
      }
      if (!result.ok) {
        addToast({
          variant: "danger",
          message: result.error || t("profile.appearance.saveFailed"),
        });
        break;
      }
      saved[id] = cloneAppearance(drafts[id]);
    }
    if (Object.keys(saved).length === 0) return;

    // What was saved is the new baseline; whatever was typed while saving stays a draft.
    setBaselines((prev) => {
      const next = { ...prev };
      for (const [id, appearance] of Object.entries(saved)) {
        const kinds = dirtyByGuild[id] ?? [];
        let merged = next[id];
        for (const k of kinds) merged = withCard(merged, k, appearance);
        next[id] = merged;
      }
      return next;
    });
    addToast({ variant: "success", message: t("profile.appearance.saved") });
  }, [dirtyByGuild, drafts, addToast, t]);

  const handleCancel = useCallback(() => {
    setDrafts(
      Object.fromEntries(Object.entries(baselines).map(([id, a]) => [id, cloneAppearance(a)])),
    );
  }, [baselines]);

  useEffect(() => {
    setSaveAction(handleSave);
    setCancelAction(handleCancel);
    return () => {
      setSaveAction(null);
      setCancelAction(null);
    };
  }, [handleSave, handleCancel, setSaveAction, setCancelAction]);

  /** Puts the card that is open on every server, and saves it right away. */
  const applyToAll = async () => {
    setApplying(true);
    try {
      const result = await saveAppearance("all", [toPatch(kind, draft)]);
      if (!result) {
        addToast({ variant: "danger", message: t("profile.appearance.noResponse") });
        return;
      }
      if (!result.ok) {
        addToast({
          variant: "danger",
          message: result.error || t("profile.appearance.saveFailed"),
        });
        return;
      }
      setBaselines((prev) =>
        Object.fromEntries(Object.entries(prev).map(([id, a]) => [id, withCard(a, kind, draft)])),
      );
      setDrafts((prev) =>
        Object.fromEntries(Object.entries(prev).map(([id, a]) => [id, withCard(a, kind, draft)])),
      );
      addToast({
        variant: "success",
        message: t("profile.appearance.savedAll", { count: result.servers }),
      });
      setConfirmAll(false);
    } finally {
      setApplying(false);
    }
  };

  const cardName = t(`profile.appearance.cards.${kind}`);

  return (
    <Column gap="24" fillWidth>
      <PageHeader
        title={t("profile.appearance.title")}
        description={t("profile.appearance.description")}
        actions={
          <Button variant="secondary" prefixIcon="user" href="/profile">
            {t("profile.appearance.backToProfile")}
          </Button>
        }
      />

      <Row gap="16" vertical="end" wrap fillWidth>
        <Column style={{ flex: "1 1 260px", maxWidth: 420, minWidth: 0 }} gap="4">
          <SelectReact
            id="appearance-server"
            label={t("profile.appearance.server")}
            value={guild.id}
            options={guilds.map((g) => ({
              value: g.id,
              label: dirtyByGuild[g.id] ? `${g.name} •` : g.name,
            }))}
            onSelect={(value) => setGuildId(String(value))}
          />
          <Text variant="body-default-xs" onBackground="neutral-weak">
            {t("profile.appearance.serverHint")}
          </Text>
        </Column>
        <SegmentedControl
          fillWidth={false}
          aria-label={t("profile.appearance.cardLabel")}
          value={kind}
          onChange={(value) => setKind(value as CardKind)}
          buttons={CARD_KINDS.map((k) => ({
            value: k,
            label: t(`profile.appearance.cards.${k}`),
          }))}
        />
      </Row>

      <div className={styles.layout}>
        <Column gap="24" minWidth={0}>
          <Section
            num={1}
            icon="palette"
            title={t("profile.appearance.colors.title")}
            description={`${t("profile.appearance.colors.description")} ${t(
              `profile.appearance.cardHints.${kind}`,
            )}`}
          >
            <Column gap="16" fillWidth>
              {COLOR_KEYS.map((key) => (
                <ColorInput
                  key={`${guild.id}-${kind}-${key}`}
                  id={`appearance-${kind}-${key}`}
                  label={t(`profile.appearance.colors.${key}`)}
                  value={colors[key]}
                  onChange={(e) => setColor(key, e.target.value)}
                />
              ))}
            </Column>
          </Section>

          <Section
            num={2}
            icon="image"
            title={t("profile.appearance.background.title")}
            description={t("profile.appearance.background.description", {
              size: `${CARD_BACKGROUND_SIZES[kind].width}×${CARD_BACKGROUND_SIZES[kind].height}`,
            })}
          >
            <Column gap="12" fillWidth>
              {background.image ? (
                // The picture as the card will draw it. Not optimised by Next: the route needs the
                // session cookie, which the optimiser does not send.
                <Media
                  src={cardBackgroundUrl(background.image) as string}
                  alt={t("profile.appearance.background.title")}
                  aspectRatio={`${CARD_BACKGROUND_SIZES[kind].width} / ${CARD_BACKGROUND_SIZES[kind].height}`}
                  radius="m"
                  border="neutral-medium"
                  unoptimized
                  style={{ maxWidth: kind === "profile" ? 320 : undefined }}
                />
              ) : null}
              <MediaUpload
                key={`${guild.id}-${kind}-${background.image ?? "none"}`}
                compress={false}
                aspectRatio={
                  background.image
                    ? "16 / 3"
                    : `${CARD_BACKGROUND_SIZES[kind].width} / ${CARD_BACKGROUND_SIZES[kind].height}`
                }
                accept={CARD_BACKGROUND_ACCEPT}
                radius="m"
                loading={uploading}
                emptyState={t(
                  background.image
                    ? "profile.appearance.background.replace"
                    : "profile.appearance.background.drop",
                )}
                onFileUpload={uploadBackground}
                style={{ maxWidth: kind === "profile" ? 320 : undefined }}
              />
              <Text variant="body-default-xs" onBackground="neutral-weak">
                {t("profile.appearance.background.hint")}
              </Text>
              {background.image ? (
                <>
                  <Slider
                    id={`appearance-${kind}-dim`}
                    label={t("profile.appearance.background.dim")}
                    min={0}
                    max={100}
                    step={1}
                    showValue
                    value={background.dim}
                    onChange={(value) =>
                      update((next) => {
                        next[kind].background.dim = Math.round(value);
                      })
                    }
                  />
                  <Flex>
                    <Button
                      variant="secondary"
                      prefixIcon="trash"
                      onClick={() =>
                        update((next) => {
                          next[kind].background.image = null;
                        })
                      }
                    >
                      {t("profile.appearance.background.remove")}
                    </Button>
                  </Flex>
                </>
              ) : null}
            </Column>
          </Section>

          {kind === "profile" && (
            <>
              <Section
                num={3}
                icon="text"
                title={t("profile.appearance.bio.title")}
                description={t("profile.appearance.bio.description")}
              >
                <Column gap="4" fillWidth>
                  <Textarea
                    id="appearance-bio"
                    label={t("profile.appearance.bio.label")}
                    placeholder={t("profile.appearance.bio.placeholder")}
                    lines={5}
                    maxLength={BIO_MAX_LENGTH}
                    value={draft.profile.bio}
                    onChange={(e) =>
                      update((next) => {
                        next.profile.bio = e.target.value.slice(0, BIO_MAX_LENGTH);
                      })
                    }
                  />
                  <Text variant="body-default-xs" onBackground="neutral-weak" align="right">
                    {t("profile.appearance.bio.counter", {
                      count: draft.profile.bio.length,
                      max: BIO_MAX_LENGTH,
                    })}
                  </Text>
                </Column>
              </Section>

              <Section
                num={4}
                icon="boxes"
                title={t("profile.appearance.icons.title")}
                description={t("profile.appearance.icons.description")}
              >
                <Slider
                  id="appearance-icons-padding"
                  label={t("profile.appearance.icons.padding")}
                  min={ICONS_PADDING_MIN}
                  max={ICONS_PADDING_MAX}
                  step={1}
                  showValue
                  value={draft.profile.iconsPadding}
                  onChange={(value) =>
                    update((next) => {
                      next.profile.iconsPadding = Math.round(value);
                    })
                  }
                />
              </Section>
            </>
          )}

          <Flex gap="8" wrap>
            <Button variant="secondary" prefixIcon="redo" onClick={reset}>
              {t("profile.appearance.actions.reset")}
            </Button>
            <Button
              variant="secondary"
              prefixIcon="boxes"
              onClick={() => setConfirmAll(true)}
              disabled={guilds.length < 2}
            >
              {t("profile.appearance.actions.applyAll")}
            </Button>
          </Flex>
        </Column>

        <Column
          gap="16"
          padding="24"
          radius="l"
          border="neutral-medium"
          background="surface"
          className={styles.preview}
        >
          <Column gap="4">
            <Text variant="body-strong-l">{t("profile.appearance.preview.title")}</Text>
            <Text variant="body-default-s" onBackground="neutral-medium">
              {t("profile.appearance.preview.description")}
            </Text>
          </Column>
          <Column padding="16" radius="m" horizontal="center" className={styles.stage}>
            <CardPreview
              kind={kind}
              identity={identity}
              stats={{
                level: guild.stats.level,
                xp: guild.stats.xp,
                voice_time: guild.stats.voiceTime,
              }}
              colors={colors}
              units={units}
              bio={draft.profile.bio}
              icons={draft.profile.icons}
              iconsPadding={draft.profile.iconsPadding}
              levelUpTo={guild.stats.level + 1}
              background={
                cardBackgroundUrl(background.image)
                  ? { src: cardBackgroundUrl(background.image) as string, dim: background.dim }
                  : null
              }
            />
          </Column>
        </Column>
      </div>

      <Dialog
        open={confirmAll}
        onClose={() => !applying && setConfirmAll(false)}
        title={t("profile.appearance.actions.applyAllTitle")}
        description={t("profile.appearance.actions.applyAllText", { card: cardName })}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmAll(false)} disabled={applying}>
              {t("common.actions.cancel")}
            </Button>
            <Button onClick={applyToAll} loading={applying}>
              {t("profile.appearance.actions.applyAllConfirm")}
            </Button>
          </>
        }
      />
    </Column>
  );
}
