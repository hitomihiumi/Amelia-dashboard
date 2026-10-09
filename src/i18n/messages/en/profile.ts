export const profile = {
  nav: {
    title: "My profile",
    section: "Profile",
    overview: "Overview",
    appearance: "Appearance",
    backToSite: "Back to site",
  },

  overview: {
    title: "Your profile",
    description: "How active you are on every server that has Amelia, all in one place.",
    totals: {
      servers: "Servers",
      serversHint: "{active, plural, one {# with activity} other {# with activity}}",
      messages: "Messages",
      voice: "Voice time",
      xp: "Total XP",
      level: "Highest level",
      rank: "Best rank",
      rankHint: "In the XP ranking of a server",
      money: "Money",
      moneyHint: "Wallets and banks together",
    },
    servers: {
      title: "Your servers",
      description:
        "Servers you share with Amelia. Statistics are kept separately for each of them.",
      empty: "Amelia is not on any of your servers yet.",
      emptyHint: "Invite her to a server and your statistics will show up here.",
      noActivity: "No activity here yet. Send a message or join a voice channel.",
      level: "Level {level}",
      rank: "#{rank} of {total}",
      rankLabel: "Rank",
      messages: "Messages",
      voice: "Voice",
      balance: "Balance",
      xp: "{xp} / {next} XP",
      customize: "Customize cards",
    },
    errors: {
      title: "Could not load your servers",
      generic: "Unknown error while loading your servers.",
      rateLimit: "Discord is busy. Try again in a few seconds.",
    },
  },

  appearance: {
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
