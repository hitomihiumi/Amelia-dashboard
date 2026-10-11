export const levelAnnounce = {
  preview: {
    title: "Preview",
    level: "Preview level",
    cardNote:
      "Every member gets the card in their own colours (set with /appearance); the preview shows the default ones.",
  },
  defaultText: "Congratulations @User, you have leveled up!",
  disabledNote: "Announcements are switched off. Turn the switch of this section on to post them.",
  text: {
    title: "Message text",
    hint: "Posted above the embed and the card. Leave it empty to post only the embed.",
    label: "Text",
  },
  embed: {
    title: "Embed",
    hint: "An embed with a title, a description, a colour and pictures. Leave all of it empty to post no embed.",
  },
  card: {
    title: "Level-up card",
    hint: "A picture with the new level and the member's avatar.",
    switch: "Attach the card",
    switchHint: "With an embed the card is shown inside it, unless the embed has an image of its own.",
  },
  delivery: {
    title: "Where and for how long",
    sameChannel: "Where the member wrote",
    channelHint: "Leave the channel empty to answer where the member wrote.",
    reply: "Reply to the message",
    replyHint: "Replies to the message that levelled the member up. Only works when the channel is not set.",
  },
  errors: {
    textTooLong: "The message text is too long.",
    titleTooLong: "The embed title is too long.",
    descriptionTooLong: "The embed description is too long.",
    footerTooLong: "The embed footer is too long.",
    invalidColor: "The embed colour must look like #5865f2.",
    invalidLink: "Pictures must be links that start with https:// or a placeholder such as {user.avatar}.",
  },
};
