import { Column, Row, Text } from "@once-ui-system/core";
import styles from "@/components/profile/Profile.module.scss";
import { AvatarWFrame } from "@/components/user/AvatarWFrame";

const AVATAR_SIZE = 88;

/** Big avatar (with the Discord decoration), the member's handle and a line about the page. */
export function ProfileHeader({
  name,
  description,
  avatar,
  frame,
}: {
  name: string;
  description: string;
  avatar?: string;
  frame?: string | null;
}) {
  return (
    <Row gap="24" vertical="center" fillWidth>
      <AvatarWFrame
        size="xl"
        src={avatar}
        value={avatar ? undefined : Array.from(name)[0]?.toUpperCase()}
        frame={frame}
        radius="full"
        className={styles.avatar}
        style={{
          width: AVATAR_SIZE,
          height: AVATAR_SIZE,
          minWidth: AVATAR_SIZE,
          minHeight: AVATAR_SIZE,
        }}
      />
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
