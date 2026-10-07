export const adminAi = {
  title: "AI & premium",
  description:
    "Limits of the AI chat that hold for every server, and the servers that have premium. The AI chat is a premium feature that the bot's administrators give out by hand.",
  saved: "AI limits saved. The bot picks them up within about 30 seconds.",
  range: "Between {min} and {max}",

  models: {
    "31b": "Gemma 4 31B",
    "26b": "Gemma 4 26B",
  },

  quota: {
    title: "Quota of the API key",
    description:
      "How much the bot may send to each model. Keep these at or below what the key allows; the bot stops using a model when one of them is spent.",
    rpm: "Requests per minute",
    rpd: "Requests per day",
    tpm: "Tokens per minute",
    noteTitle: "Shared by every server",
    note: "These numbers are counted across all servers and shards together. The per-minute limit is a sliding 60 second window, so it holds around the turn of a minute too. The daily counter follows Google's reset at midnight Pacific time. When the API itself answers that the quota is spent, the bot pauses that model for as long as it asks, whatever is set here.",
  },

  caps: {
    title: "Ceilings for servers",
    description:
      "The most a server may allow itself in the AI chat settings. A server that saved more is brought down to these numbers at once.",
    user_per_minute: "Messages per member per minute",
    user_per_day: "Messages per member per day",
    guild_per_day: "Messages per server per day",
  },

  premium: {
    title: "Premium servers",
    description:
      "Give a server premium to unlock the AI chat. It takes effect at once and works even before the bot has joined the server.",
    guildId: "Server ID",
    until: "Valid until",
    untilHint: "Premium stays on until the end of the chosen day.",
    note: "Note",
    notePlaceholder: "Who it is for and why",
    give: "Give or update premium",
    listTitle: "Servers with premium ({count})",
    empty: "No server has premium yet.",
    unknownGuild: "Unknown server",
    active: "Active",
    expired: "Expired",
    endsOn: "Until {date}",
    noEnd: "No end date",
    edit: "Edit",
    revoke: "Revoke premium",
    revokeConfirm: "Take premium away from this server? Its AI settings are kept.",
    granted: "Premium saved.",
    revoked: "Premium revoked.",
  },

  errors: {
    invalidToast: "Some numbers are out of range.",
    range: "{field}: enter a whole number between {min} and {max}.",
    saveFailed: "Could not save. Please try again.",
    invalidGuild: "Enter a valid server ID (17 to 20 digits).",
    invalidDate: "Enter the end date as a valid date.",
    pastDate: "The end date must be in the future.",
    noteLength: "The note can be at most {max} characters long.",
  },
};
