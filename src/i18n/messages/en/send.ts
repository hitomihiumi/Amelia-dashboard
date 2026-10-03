/**
 * The Send page: compose a message (classic or Components V2) and post it to a channel as the bot.
 * Placeholder tokens such as {token} are passed as parameters, because `{...}` is the interpolation syntax.
 */
export const send = {
  title: "Send message",
  subtitle:
    "Compose a message from your custom components and post it to a channel. Use a layout for a Components V2 message.",

  channel: {
    label: "Channel",
    required: "Pick a channel to send to.",
    none: "No text channels found. Check that the bot can see them.",
  },

  mode: {
    label: "Message type",
    classic: "Classic message",
    layout: "Layout (Components V2)",
    classicHint: "Text, embeds, buttons and select menus.",
    layoutHint:
      "A Components V2 message built from one of your layouts. It cannot carry plain text or embeds next to it.",
  },

  classic: {
    content: "Message text",
    contentHint: "Optional when the message has at least one embed.",
    embeds: "Embeds",
    buttons: "Buttons",
    selectMenus: "Select menus",
    noneAvailable: "None created yet.",
    rowsHint: "A message fits {max} rows: buttons take five per row, each select menu takes a row.",
    rowsUsed: "{used}/{max} rows",
  },

  layout: {
    label: "Layout",
    emptyTitle: "No layouts yet",
    emptyText: "Create a layout first, then come back to send it.",
    open: "Open layouts",
    edit: "Edit layout",
    gone: "This layout does not exist anymore.",
    componentsCount: "{count, plural, one {# component} other {# components}}",
    noText: "No text in this layout",
  },

  mentions: {
    label: "Allow @everyone and @here",
    description: "Users and roles can always be mentioned. Turn this on only when you mean to ping everyone.",
  },

  placeholders: {
    title: "Placeholders",
    text: "Filled in when the message is sent: {tokens}. User values describe you, the sender.",
    interactive:
      "Placeholders such as {tokens} only exist while someone uses a button or a menu. In a message sent from here they stay as plain text.",
  },

  action: {
    send: "Send message",
    sending: "Sending…",
    reset: "Clear",
  },

  result: {
    sentTitle: "Message sent",
    sentText: "The message was posted to the channel.",
    open: "Open in Discord",
    warningsTitle: "Sent, with adjustments",
    warningsText: "Some parts could not be rendered and were skipped or simplified:",
  },

  preview: {
    title: "Preview",
    pickLayout: "Pick a layout to see the message.",
    empty: "Write something or add components to see the message.",
  },

  warnings: {
    interactivePlaceholders:
      "The message contains placeholders that only work for button or menu interactions. They were sent as plain text.",
  },

  errors: {
    invalid: "The request is not valid. Reload the page and try again.",
    channelGone: "That channel does not exist anymore.",
    noPermission:
      "The bot cannot post in that channel. Give it View Channel and Send Messages there.",
    rejected: "Discord rejected the message: {reason}",
    discordFailed: "Discord could not deliver the message (status {status}).",
    cooldown: "Slow down: wait {seconds} seconds between messages.",
    layoutGone: "That layout does not exist anymore.",
    noToken: "The dashboard has no bot token configured, so it cannot send messages.",
    unexpected: "Something went wrong while sending. Try again.",
  },

  payload: {
    noContent: "The message is empty. Add text or at least one embed.",
    contentTooLong: "The text is longer than {max} characters.",
    tooManyEmbeds: "A message can have at most {max} embeds.",
    embedsTooLong: "All embeds together are longer than {max} characters.",
    embedMissing: "One of the embeds does not exist anymore.",
    buttonMissing: "One of the buttons does not exist anymore.",
    menuMissing: "One of the select menus does not exist anymore.",
    buttonInvalid: "Button \"{name}\" cannot be sent: {reason}",
    menuInvalid: "Select menu \"{name}\" cannot be sent: {reason}",
    tooManyRows: "The buttons and menus need more than {max} rows. Remove some of them.",
    layoutEmpty: "Nothing in this layout can be rendered.",
  },
};
