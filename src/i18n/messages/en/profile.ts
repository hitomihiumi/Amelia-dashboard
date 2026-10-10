export const profile = {
  overview: {
    description: "Combined statistics across all servers with Amelia.",
    appearanceLink: {
      title: "Card appearance",
      description: "Colors, biography and the look of your rank, profile and level-up cards",
    },
    total: "Total",
    byServer: "By server",
    totals: {
      servers: "Servers",
      serversHint: "with the bot",
      level: "Combined level",
      levelHint: "{xp} XP",
      messages: "Messages",
      messagesHint: "sent all time",
      voice: "Voice time",
      voiceHint: "accumulated all time",
    },
    servers: {
      levelLine: "Level {level} · {xp} / {next} XP",
      rank: "#{rank} of {total}",
      messagesShort: "msgs",
      empty: "Amelia is not on any of your servers yet.",
      emptyHint: "Invite her to a server and your statistics will show up here.",
    },
    units: {
      day: "d",
      hour: "h",
      minute: "min",
      second: "s",
    },
    errors: {
      title: "Could not load your servers",
      generic: "Unknown error while loading your servers.",
      rateLimit: "Discord is busy. Try again in a few seconds.",
    },
  },

  appearance: {
    backToProfile: "Back to profile",
    title: "Card appearance",
    description:
      "Change how your rank, profile and level-up cards look. Every server keeps its own settings, and the preview is drawn exactly the way Amelia draws the card.",
    server: "Server",
    serverHint: "Cards are saved separately for each server.",
    noServers: "Amelia is not on any of your servers yet, so there is nothing to customize.",
    cards: {
      rank: "Rank",
      profile: "Profile",
      level_up: "Level-up",
    },
    cardLabel: "Card",
    cardHints: {
      rank: "Shown by /rank.",
      profile: "Shown by /profile.",
      level_up: "Sent when you reach a new level.",
    },
    colors: {
      title: "Colors",
      description: "The colors the card is painted with.",
      bg_color: "Background",
      first_component: "First accent",
      second_component: "Second accent",
      third_component: "Third accent",
      invalid: "Use a hex color such as #C30F45.",
    },
    bio: {
      title: "Biography",
      description: "The text under “Biography” on your profile card.",
      label: "About you",
      placeholder: "Tell others a little about yourself",
      counter: "{count} / {max}",
    },
    icons: {
      title: "Icons",
      description: "The gap between the icon slots on the profile card.",
      padding: "Gap between icons",
      paddingHint: "{min}–{max} px",
    },
    preview: {
      title: "Live preview",
      description:
        "Drawn right here with LazyCanvas, the same layout the bot renders. Your real level, XP and voice time on this server are used.",
      loading: "Drawing the card…",
    },
    actions: {
      reset: "Reset card",
      resetHint: "Back to the default look. Press Save to keep it.",
      applyAll: "Use on all servers",
      applyAllTitle: "Use this card on all servers?",
      applyAllText:
        "The {card} card settings you see now will replace the ones you have on every server that has Amelia. Settings of the other cards stay as they are.",
      applyAllConfirm: "Apply to all servers",
    },
    saved: "Appearance saved.",
    savedAll: "Applied to {count, plural, one {# server} other {# servers}}.",
    saveFailed: "Could not save the appearance.",
    noResponse: "The server did not answer.",
  },

  units: {
    day: "d",
    hour: "h",
    minute: "m",
    second: "s",
  },

  errors: {
    notSignedIn: "Sign in with Discord first.",
    invalidServer: "Amelia is not on that server, or you are not a member of it.",
    nothingToSave: "There is nothing to save.",
    invalidCard: "Unknown card.",
    invalidColor: "Colors must be hex values such as #C30F45.",
    bioTooLong: "The biography can have at most {max} characters.",
    invalidPadding: "The gap between icons must be a whole number from 0 to 10.",
    internal: "Internal error while saving. Try again later.",
  },
};
