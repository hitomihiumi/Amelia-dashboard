import { Column, Row, Text } from "@once-ui-system/core";
import styles from "@/components/profile/Profile.module.scss";

/** Big avatar, the member's handle and a line about what the page shows. */
export function ProfileHeader({
  name,
  description,
  avatar,
}: {
  name: string;
  description: string;
  avatar: string | null;
}) {
  return (
    <Row gap="24" vertical="center" fillWidth>
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatar}
          alt=""
          width={88}
          height={88}
          className={styles.avatar}
          style={{ borderRadius: 20, objectFit: "cover", flexShrink: 0 }}
        />
      ) : (
        <Row
          center
          radius="xl"
          background="neutral-alpha-weak"
          border="neutral-medium"
          style={{ width: 88, height: 88, flexShrink: 0 }}
        >
          <Text variant="display-strong-s">{Array.from(name)[0]?.toUpperCase()}</Text>
        </Row>
      )}
      <Column gap="8" minWidth={0}>
        <Text variant="display-strong-xs" style={{ overflowWrap: "anywhere" }}>
          {name}
        </Text>
        <Text variant="body-default-m" onBackground="neutral-weak">
          {description}
        </Text>
      </Column>
    </Row>
  );
}
