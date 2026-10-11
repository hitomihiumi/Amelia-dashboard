"use client";

import { MediaUrlField } from "@/app/dashboard/[guildId]/components/layouts/MediaUrlField";
import { ConfirmIconButton } from "@/components/dashboard/ConfirmIconButton";
import { useT } from "@/i18n/client";
import type { MessageKey } from "@/i18n/messages";
import {
  BANNER_IMAGE_LIMITS,
  type BannerImageInfo,
  uploadId,
  uploadRef,
  uploadUrl,
} from "@/lib/banners/images";
import {
  Button,
  Column,
  Feedback,
  Flex,
  Grid,
  Input,
  Media,
  Row,
  SegmentedControl,
  Text,
  useToast,
} from "@once-ui-system/core";
import Compressor from "compressorjs";
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

/** The pictures this server uploaded, and the actions on them. */
interface BannerImagesValue {
  guildId: string;
  /** `null` until the list was asked for. */
  images: BannerImageInfo[] | null;
  /** A picture is being sent or the list is being loaded. */
  busy: boolean;
  ensureLoaded: () => void;
  upload: (file: File) => Promise<BannerImageInfo | null>;
  remove: (id: string) => Promise<void>;
}

/** `Row as="button"` does not type `type`, but the element still needs it (never a submit button). */
const NATIVE_BUTTON = { type: "button" } as const;

const BannerImagesContext = createContext<BannerImagesValue | null>(null);

export function useBannerImages(): BannerImagesValue {
  const value = useContext(BannerImagesContext);
  if (!value) throw new Error("useBannerImages must be used inside <BannerImagesProvider>");
  return value;
}

/** Scales a big picture down in the browser, so it fits what the host accepts. */
function compress(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    new Compressor(file, {
      quality: 0.85,
      maxWidth: BANNER_IMAGE_LIMITS.maxSide,
      maxHeight: BANNER_IMAGE_LIMITS.maxSide,
      // A big PNG would stay big; as a JPEG it fits.
      convertSize: 1_000_000,
      success: resolve,
      error: reject,
    });
  });
}

export function BannerImagesProvider({
  guildId,
  usedIds,
  children,
}: {
  guildId: string;
  /** Pictures the banners being edited use; they cannot be deleted. */
  usedIds: Set<string>;
  children: ReactNode;
}) {
  const t = useT();
  const { addToast } = useToast();
  const [images, setImages] = useState<BannerImageInfo[] | null>(null);
  const [busy, setBusy] = useState(false);
  const requested = useRef(false);
  const used = useRef(usedIds);
  used.current = usedIds;

  const fail = useCallback(
    (code: string) => {
      const key = `banners.images.errors.${code}` as MessageKey;
      addToast({ variant: "danger", message: t(key) });
    },
    [addToast, t],
  );

  const ensureLoaded = useCallback(() => {
    if (requested.current) return;
    requested.current = true;
    setBusy(true);
    fetch(`/api/dashboard/${guildId}/banner-images`)
      .then((res) => res.json())
      .then((json) => {
        if (json?.ok) setImages(json.images as BannerImageInfo[]);
        else throw new Error(json?.error);
      })
      .catch(() => {
        requested.current = false;
        setImages([]);
        fail("failed");
      })
      .finally(() => setBusy(false));
  }, [guildId, fail]);

  const upload = useCallback(
    async (file: File): Promise<BannerImageInfo | null> => {
      if (!file.type.startsWith("image/")) {
        fail("notAPicture");
        return null;
      }
      setBusy(true);
      try {
        let body: Blob = file;
        if (file.size > BANNER_IMAGE_LIMITS.maxBytes) {
          body = await compress(file).catch(() => file);
        }
        if (body.size > BANNER_IMAGE_LIMITS.maxBytes) {
          fail("tooBig");
          return null;
        }

        const form = new FormData();
        form.set("file", body, file.name);
        const res = await fetch(`/api/dashboard/${guildId}/banner-images`, {
          method: "POST",
          body: form,
        });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok) {
          fail(typeof json?.error === "string" ? json.error : "failed");
          return null;
        }

        const image = json.image as BannerImageInfo;
        requested.current = true;
        setImages((current) => [image, ...(current ?? [])]);
        return image;
      } catch {
        fail("failed");
        return null;
      } finally {
        setBusy(false);
      }
    },
    [guildId, fail],
  );

  const remove = useCallback(
    async (id: string) => {
      if (used.current.has(id)) {
        fail("inUse");
        return;
      }
      const res = await fetch(`/api/dashboard/${guildId}/banner-images/${id}`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        fail(json?.error === "inUse" ? "inUse" : "failed");
        return;
      }
      setImages((current) => (current ?? []).filter((image) => image.id !== id));
    },
    [guildId, fail],
  );

  const value = useMemo(
    () => ({ guildId, images, busy, ensureLoaded, upload, remove }),
    [guildId, images, busy, ensureLoaded, upload, remove],
  );

  return <BannerImagesContext.Provider value={value}>{children}</BannerImagesContext.Provider>;
}

/** A hidden file input and the function that opens the file dialog. */
export function useFilePicker(onFiles: (files: File[]) => void, multiple = false) {
  const ref = useRef<HTMLInputElement>(null);
  const handler = useRef(onFiles);
  handler.current = onFiles;

  const input = (
    <Flex style={{ display: "none" }} aria-hidden>
      <Input
        id="banner-image-file"
        ref={ref}
        type="file"
        accept={BANNER_IMAGE_LIMITS.accept}
        multiple={multiple}
        tabIndex={-1}
        onChange={(event) => {
          const target = event.target as HTMLInputElement;
          const files = [...(target.files ?? [])];
          // The same file can be chosen again afterwards.
          target.value = "";
          if (files.length > 0) handler.current(files);
        }}
      />
    </Flex>
  );

  return { input, open: () => ref.current?.click() };
}

function Thumbnail({
  guildId,
  image,
  selected,
  onSelect,
  onDelete,
}: {
  guildId: string;
  image: BannerImageInfo;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const t = useT();

  return (
    <Column
      gap="4"
      padding="4"
      radius="m"
      border={selected ? "brand-strong" : "neutral-medium"}
      background={selected ? "surface" : "neutral-alpha-weak"}
      minWidth={0}
    >
      <Row
        as="button"
        {...NATIVE_BUTTON}
        fillWidth
        onClick={onSelect}
        aria-pressed={selected}
        aria-label={image.name}
        style={{ background: "transparent", border: 0, padding: 0, cursor: "pointer" }}
      >
        <Media
          src={uploadUrl(guildId, image.id)}
          alt={image.name}
          aspectRatio="16 / 9"
          radius="s"
          objectFit="contain"
          unoptimized
          background="neutral-alpha-weak"
        />
      </Row>
      <Row fillWidth vertical="center" gap="4" paddingX="4">
        <Column flex="1" minWidth={0}>
          <Text variant="body-default-xs" truncate>
            {image.name}
          </Text>
          <Text variant="body-default-xs" onBackground="neutral-weak">
            {image.width}×{image.height}
          </Text>
        </Column>
        <ConfirmIconButton
          variant="confirm"
          size="s"
          tooltip={t("banners.images.delete")}
          onConfirm={onDelete}
        />
      </Row>
    </Column>
  );
}

/** The pictures of the server: choose one, upload another, delete what is not used. */
function ImageLibrary({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  const t = useT();
  const { guildId, images, busy, ensureLoaded, upload, remove } = useBannerImages();
  const picker = useFilePicker(async (files) => {
    const image = await upload(files[0]);
    if (image) onChange(uploadRef(image.id));
  });

  useEffect(() => ensureLoaded(), [ensureLoaded]);

  const selected = uploadId(value);
  const missing =
    selected !== null && images !== null && !images.some((image) => image.id === selected);

  return (
    <Column fillWidth gap="8">
      {picker.input}
      <Row fillWidth vertical="center" gap="12" wrap>
        <Button
          variant="secondary"
          prefixIcon="plus"
          onClick={picker.open}
          loading={busy}
          disabled={busy || (images?.length ?? 0) >= BANNER_IMAGE_LIMITS.maxCount}
        >
          {t("banners.images.upload")}
        </Button>
        <Text variant="body-default-xs" onBackground="neutral-weak" style={{ flex: "1 1 160px" }}>
          {t("banners.images.hint", {
            max: Math.round(BANNER_IMAGE_LIMITS.maxBytes / 1_000_000),
            count: BANNER_IMAGE_LIMITS.maxCount,
          })}
        </Text>
      </Row>

      {missing ? <Feedback variant="warning" description={t("banners.images.missing")} /> : null}

      {images !== null && images.length === 0 ? (
        <Text variant="body-default-s" onBackground="neutral-weak">
          {t("banners.images.empty")}
        </Text>
      ) : null}

      {images !== null && images.length > 0 ? (
        <Grid
          fillWidth
          gap="8"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 130px), 1fr))" }}
        >
          {images.map((image) => (
            <Thumbnail
              key={image.id}
              guildId={guildId}
              image={image}
              selected={image.id === selected}
              onSelect={() => onChange(uploadRef(image.id))}
              onDelete={() => void remove(image.id)}
            />
          ))}
        </Grid>
      ) : null}
    </Column>
  );
}

export interface ImageSourceFieldProps {
  id: string;
  label: string;
  /** A link, a placeholder, or `upload:<id>`. */
  value: string;
  onChange: (next: string) => void;
}

/** Where a picture comes from: a link typed in, or one uploaded to the server's library. */
export function ImageSourceField({ id, label, value, onChange }: ImageSourceFieldProps) {
  const t = useT();
  const [mode, setMode] = useState<"link" | "upload">(uploadId(value) ? "upload" : "link");

  return (
    <Column fillWidth gap="8">
      <SegmentedControl
        fillWidth
        value={mode}
        onChange={(next) => {
          if (next === mode) return;
          setMode(next as "link" | "upload");
          // A link field showing `upload:abc` would only confuse; the choice is dropped with it.
          if (next === "link" && uploadId(value)) onChange("");
        }}
        buttons={[
          { label: t("banners.images.link"), value: "link" },
          { label: t("banners.images.uploaded"), value: "upload" },
        ]}
      />
      {mode === "link" ? (
        <MediaUrlField
          id={id}
          label={label}
          value={value}
          placeholderSet="banner"
          onChange={onChange}
        />
      ) : (
        <ImageLibrary value={value} onChange={onChange} />
      )}
    </Column>
  );
}
