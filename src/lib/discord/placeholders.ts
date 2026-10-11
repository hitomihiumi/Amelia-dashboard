/**
 * The placeholders the text editors offer in their "insert a placeholder" menu.
 *
 * Every entry here is resolved by the bot (`src/helpers/custom/substitute.ts`) and by the live
 * preview (`preview-tags.ts`), apart from the scenario group, which only exists while a scenario
 * runs and stays as typed everywhere else.
 */

import type { MessageKey } from "@/i18n/messages/types";
import { VARIABLE_PLACEHOLDERS } from "@/lib/db/types";

export type PlaceholderGroupId =
  | "user"
  | "channel"
  | "guild"
  | "time"
  | "scenario"
  | "levelUp"
  | "stats";

/**
 * Which placeholders a field offers. `default` is a message sent by a component or a scenario,
 * `levelUp` a level-up announcement and `banner` the text of a server banner.
 */
export type PlaceholderSet = "default" | "levelUp" | "banner";

export interface PlaceholderDef {
  id: string;
  group: PlaceholderGroupId;
  labelKey: MessageKey;
  /** What the menu shows under the label. */
  token: string;
  /** What is inserted. A few tokens are templates the author completes (`{input.0}`, `{var.name}`). */
  insert: string;
  /** Part of `insert` to select after inserting, so typing replaces the example (`0`, `name`). */
  select?: string;
  /** The value is a link or an id, so it also fits link fields (thumbnail, icon, button URL). */
  url?: boolean;
}

export interface PlaceholderGroup {
  id: PlaceholderGroupId;
  labelKey: MessageKey;
  /** Shown under the group name. */
  hintKey?: MessageKey;
  items: PlaceholderDef[];
}

const P = VARIABLE_PLACEHOLDERS;

function def(
  id: string,
  group: PlaceholderGroupId,
  labelKey: MessageKey,
  token: string,
  extra: Partial<Pick<PlaceholderDef, "insert" | "select" | "url">> = {},
): PlaceholderDef {
  return { id, group, labelKey, token, insert: token, ...extra };
}

export const PLACEHOLDER_GROUPS: readonly PlaceholderGroup[] = [
  {
    id: "user",
    labelKey: "common.textTools.groups.user",
    items: [
      def("USER_ID", "user", "common.textTools.placeholders.USER_ID", P.USER_ID, { url: true }),
      def("USER_NAME", "user", "common.textTools.placeholders.USER_NAME", P.USER_NAME),
      def("USER_DISPLAY_NAME", "user", "common.textTools.placeholders.USER_DISPLAY_NAME", P.USER_DISPLAY_NAME),
      def("USER_MENTION", "user", "common.textTools.placeholders.USER_MENTION", P.USER_MENTION),
      def("USER_AVATAR", "user", "common.textTools.placeholders.USER_AVATAR", P.USER_AVATAR, { url: true }),
    ],
  },
  {
    id: "channel",
    labelKey: "common.textTools.groups.channel",
    items: [
      def("CHANNEL_ID", "channel", "common.textTools.placeholders.CHANNEL_ID", P.CHANNEL_ID, { url: true }),
      def("CHANNEL_NAME", "channel", "common.textTools.placeholders.CHANNEL_NAME", P.CHANNEL_NAME),
      def("CHANNEL_MENTION", "channel", "common.textTools.placeholders.CHANNEL_MENTION", P.CHANNEL_MENTION),
    ],
  },
  {
    id: "guild",
    labelKey: "common.textTools.groups.guild",
    items: [
      def("GUILD_ID", "guild", "common.textTools.placeholders.GUILD_ID", P.GUILD_ID, { url: true }),
      def("GUILD_NAME", "guild", "common.textTools.placeholders.GUILD_NAME", P.GUILD_NAME),
      def("GUILD_ICON", "guild", "common.textTools.placeholders.GUILD_ICON", P.GUILD_ICON, { url: true }),
    ],
  },
  {
    id: "time",
    labelKey: "common.textTools.groups.time",
    items: [
      def("DATE", "time", "common.textTools.placeholders.DATE", P.DATE),
      def("TIME", "time", "common.textTools.placeholders.TIME", P.TIME),
      def("TIMESTAMP", "time", "common.textTools.placeholders.TIMESTAMP", P.TIMESTAMP),
    ],
  },
  {
    id: "scenario",
    labelKey: "common.textTools.groups.scenario",
    hintKey: "common.textTools.groups.scenarioHint",
    items: [
      def("INPUT", "scenario", "common.textTools.placeholders.INPUT", "{input.N}", {
        insert: "{input.0}",
        select: "0",
        url: true,
      }),
      def("INPUT_LABEL", "scenario", "common.textTools.placeholders.INPUT_LABEL", "{input.N.label}", {
        insert: "{input.0.label}",
        select: "0",
      }),
      def("INPUT_VALUE", "scenario", "common.textTools.placeholders.INPUT_VALUE", "{input.N.value}", {
        insert: "{input.0.value}",
        select: "0",
        url: true,
      }),
      def("SELECTED_VALUE", "scenario", "common.textTools.placeholders.SELECTED_VALUE", "{selected.value}", {
        url: true,
      }),
      def("SELECTED_LABEL", "scenario", "common.textTools.placeholders.SELECTED_LABEL", "{selected.label}"),
      def("VAR", "scenario", "common.textTools.placeholders.VAR", "{var.name}", {
        insert: "{var.name}",
        select: "name",
        url: true,
      }),
    ],
  },
  {
    id: "levelUp",
    labelKey: "common.textTools.groups.levelUp",
    items: [
      def("LEVEL", "levelUp", "common.textTools.placeholders.LEVEL", "{level}"),
      def("LEVEL_PREV", "levelUp", "common.textTools.placeholders.LEVEL_PREV", "{level.prev}"),
      def("XP_TOTAL", "levelUp", "common.textTools.placeholders.XP_TOTAL", "{xp.total}"),
      def("MESSAGES", "levelUp", "common.textTools.placeholders.MESSAGES", "{messages}"),
      def("REWARD_ROLE", "levelUp", "common.textTools.placeholders.REWARD_ROLE", "{reward.role}"),
    ],
  },
  {
    id: "stats",
    labelKey: "common.textTools.groups.stats",
    items: [
      def("B_GUILD_NAME", "stats", "common.textTools.placeholders.GUILD_NAME", "{guild.name}"),
      def("B_GUILD_ICON", "stats", "common.textTools.placeholders.GUILD_ICON", "{guild.icon}", { url: true }),
      def("MEMBERS", "stats", "common.textTools.placeholders.MEMBERS", "{members}"),
      def("MEMBERS_ONLINE", "stats", "common.textTools.placeholders.MEMBERS_ONLINE", "{members.online}"),
      def("VOICE_MEMBERS", "stats", "common.textTools.placeholders.VOICE_MEMBERS", "{voice.members}"),
      def("BOOSTS", "stats", "common.textTools.placeholders.BOOSTS", "{boosts}"),
      def("BOOST_TIER", "stats", "common.textTools.placeholders.BOOST_TIER", "{boost.tier}"),
      def("MESSAGES_TODAY", "stats", "common.textTools.placeholders.MESSAGES_TODAY", "{messages.today}"),
      def("MESSAGES_WEEK", "stats", "common.textTools.placeholders.MESSAGES_WEEK", "{messages.week}"),
      def("JOINS_TODAY", "stats", "common.textTools.placeholders.JOINS_TODAY", "{joins.today}"),
      def("LEAVES_TODAY", "stats", "common.textTools.placeholders.LEAVES_TODAY", "{leaves.today}"),
      def("CHANNELS", "stats", "common.textTools.placeholders.CHANNELS", "{channels}"),
      def("ROLES", "stats", "common.textTools.placeholders.ROLES", "{roles}"),
      def("TOP_NAME", "stats", "common.textTools.placeholders.TOP_NAME", "{top.name}"),
      def("TOP_AVATAR", "stats", "common.textTools.placeholders.TOP_AVATAR", "{top.avatar}", { url: true }),
      def("TOP_MESSAGES", "stats", "common.textTools.placeholders.TOP_MESSAGES", "{top.messages}"),
    ],
  },
];

export interface PlaceholderFilter {
  /** Offer only values that fit a link or id field. */
  urlOnly?: boolean;
  /** Offer the scenario group. Off where the message is posted outside a scenario. */
  scenario?: boolean;
  /** The placeholders of a particular kind of message; `default` when omitted. */
  set?: PlaceholderSet;
}

/** The groups each set offers, in the order the menu lists them. */
const SET_GROUPS: Record<PlaceholderSet, readonly PlaceholderGroupId[]> = {
  default: ["user", "channel", "guild", "time", "scenario"],
  levelUp: ["user", "channel", "guild", "time", "levelUp"],
  banner: ["stats", "time"],
};

/** The banner has its own clock, so only the date and the time are offered, not the timestamp. */
const BANNER_TIME = new Set(["DATE", "TIME"]);

/** The groups to show for a field, without the entries (or groups) that do not apply. */
export function placeholderGroups({
  urlOnly = false,
  scenario = true,
  set = "default",
}: PlaceholderFilter = {}): PlaceholderGroup[] {
  const ids = SET_GROUPS[set].filter((id) => scenario || id !== "scenario");
  return ids
    .map((id) => PLACEHOLDER_GROUPS.find((group) => group.id === id)!)
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => (!urlOnly || item.url) && (set !== "banner" || group.id !== "time" || BANNER_TIME.has(item.id)),
      ),
    }))
    .filter((group) => group.items.length > 0);
}
