export const ai = {
  title: "AI chat",
  description:
    "Let Amelia chat with your members: pick where she talks, which model answers, how much each member can use her and what she is like on your server.",
  saved: "AI chat settings saved.",

  premium: {
    requiredTitle: "Premium required",
    requiredText:
      "The AI chat is a premium feature. For now premium is given out personally by the bot's administrators: ask them to unlock it for this server. Your settings are kept and come back as soon as premium is on.",
    activeTitle: "Premium",
    activeUntil: "Premium is active until {date}.",
    activeForever: "Premium is active, with no end date.",
  },

  errors: {
    premiumRequired: "The AI chat is a premium feature. This server has no active premium.",
    genericTitle: "Error",
    loadChannels: "An unknown error occurred while loading channels.",
    saveFailed: "Save failed",
    missingData: "Required data is missing.",
    parseFailed: "Failed to parse data payload.",
    internalSave: "Internal server error occurred while saving.",
    invalid: "Invalid AI chat data.",
    model: "Unknown model.",
    channelsLimit: "Channel lists can hold at most {max} channels.",
    channelsInvalid: "A channel list contains an invalid ID.",
    personaLength: "The personality text can be at most {max} characters long.",
    limit: "{limit}: enter a whole number between {min} and {max}.",
  },

  general: {
    title: "AI chat",
    description: "Turn the AI on for this server and choose where it talks.",
    channels: "Chat channels",
    channelsHint: "Amelia answers every message in these channels.",
    ignoredChannels: "Ignored channels",
    ignoredChannelsHint: "Amelia never answers in these channels, not even when mentioned.",
    triggersTitle: "When she answers",
    triggersText:
      "When she is mentioned, when someone replies to one of her answers, and to every message in a chat channel (except talk between other members). /ai ask works anywhere that is not ignored.",
    privacyTitle: "Privacy",
    privacyText:
      "Messages addressed to her, and the pictures attached to them, are sent to Google's Gemini API on a free key to write the answer, together with the notes she keeps about the people in the conversation. Keep the AI off if your community should not use it.",
  },

  model: {
    title: "Model",
    description: "Which Gemma 4 model writes the answers.",
    options: {
      auto: "Automatic",
      "31b": "Gemma 4 31B",
      "26b": "Gemma 4 26B",
    },
    hints: {
      auto: "Gemma 4 31B first. When it is out of quota or unavailable, Gemma 4 26B answers instead.",
      "31b": "Only Gemma 4 31B: smarter answers, a smaller daily quota.",
      "26b": "Only Gemma 4 26B: faster answers, lighter on the quota.",
    },
  },

  limits: {
    title: "Limits",
    description: "How much of the AI your members can use.",
    user_per_minute: "Messages per member per minute",
    user_per_day: "Messages per member per day",
    guild_per_day: "Messages per server per day",
    range: "Between {min} and {max}",
    note: "The counters restart every minute and every day at 00:00 UTC. The bot also has a global limit shared by all servers, so answers can pause when many communities talk to her at once.",
  },

  memory: {
    title: "Memory and pictures",
    description: "What Amelia may keep in mind and look at.",
    short_term: "Short-term memory",
    short_termHint:
      "Remembers the last exchanges of a channel for 30 minutes, so replies follow the conversation.",
    long_term: "Long-term memory",
    long_termHint:
      "Remembers lasting things members tell her about themselves, such as names, hobbies and pets, and brings them up days later. Members can see and delete their notes with /ai memory.",
    images: "Pictures",
    imagesHint: "Looks at images attached to a message (PNG, JPEG, WebP), up to 3 per message.",
    code: "Code files",
    codeHint:
      "Reads code and text files attached to a message (up to 3, 200 KB each) to explain or review them. Obvious secrets are blanked out before anything is sent. Files go to Google together with the message, so do not enable it for private code.",
    stored: "Notes kept about members: {count}",
    clear: "Forget all notes",
    clearConfirm: "Delete everything Amelia has noted about the members of this server?",
    cleared: "All notes about the members were deleted.",
  },

  persona: {
    title: "Personality",
    description: "Tell Amelia how to behave on your server.",
    label: "Extra instructions",
    placeholder:
      "For example: we are a study group, keep the tone friendly but a bit more formal, and avoid spoilers.",
    hint: "These are added to Amelia's own personality. Leave empty to use her personality as it is. The safety rules cannot be turned off here.",
  },
};
