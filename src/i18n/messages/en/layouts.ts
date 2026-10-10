/**
 * Components V2 "layouts": the Layouts tab of the custom components manager, the block editor,
 * the live preview chrome and the save errors.
 *
 * Placeholder tokens such as {user.name} are never written into a message: they are passed as
 * the `token` parameter, because `{...}` is the interpolation syntax.
 */
export const layouts = {
  fallbackName: "Layout",
  nameLabel: "Name (internal)",

  // The tab in the components manager.
  tab: {
    label: "Layouts",
    newItem: "New layout",
    emptyText:
      "Create your first layout to build a rich message from containers, text, images and buttons.",
    componentsCount: "{count}/{max} components",
    usedIn: "{count, plural, one {Used in # scenario} other {Used in # scenarios}}",
    deleteUsedConfirm:
      "{count, plural, one {A scenario uses this layout. Delete it anyway?} other {# scenarios use this layout. Delete it anyway?}}",
    limitReached: "A server can have at most {max} layouts.",
  },

  defaults: {
    name: "New layout",
    title: "Announcement",
    text: "Hello {token}! Write your message here. You can use **bold**, lists and placeholders.",
    sectionText: "Text next to the picture",
  },

  empty: {
    title: "Add your first block",
    text: "A layout is built from blocks: text, images, buttons and containers that group them together.",
    add: "Add first block",
  },

  add: {
    button: "Add block",
    toContainer: "Add block to container",
    groupContent: "Content",
    groupInteractive: "Interactive",
    groupLayout: "Structure",
  },

  blocks: {
    unknown: "Block",
    text: { label: "Text", description: "Markdown text: headings, lists, quotes" },
    section: { label: "Section", description: "Text with a thumbnail or a button beside it" },
    gallery: { label: "Gallery", description: "Up to 10 images shown as a mosaic" },
    separator: { label: "Separator", description: "A divider line or empty space" },
    buttons: { label: "Buttons row", description: "Up to 5 of your stored buttons" },
    select: { label: "Select menu row", description: "One of your stored select menus" },
    actions: { label: "Row" },
    container: { label: "Container", description: "A card with an accent colour that groups blocks" },
  },

  // Where a problem is, used in the save error.
  blockRef: {
    top: "block {n} ({type})",
    child: "block {n} ({type}) › block {m} ({childType})",
  },

  block: {
    drag: "Drag to reorder",
    dragHint: "Drag to reorder, or press the up and down arrow keys",
    delete: "Delete block",
    deleteContainerConfirm:
      "{count, plural, one {Delete this container and its block?} other {Delete this container and its # blocks?}}",
    expand: "Expand",
    collapse: "Collapse",
    expandAll: "Expand all",
    collapseAll: "Collapse all",
    dropHere: "Drop here",
  },

  budget: {
    components: "Components",
    text: "Text characters",
    issues: "{count, plural, one {# problem} other {# problems}}",
    valid: "Ready to save",
  },

  summary: {
    emptyText: "Empty text",
    images: "{count, plural, one {# image} other {# images}}",
    dividerLine: "Divider, {spacing}",
    dividerSpace: "Empty space, {spacing}",
    noButtons: "No buttons chosen",
    noSelect: "No select menu chosen",
    blocks: "{count, plural, one {# block} other {# blocks}}",
  },

  text: {
    label: "Text",
    placeholder: "Write your text…",
    chars: "{count, plural, one {# character} other {# characters}}",
    markdownHint:
      "Discord markdown works here: **bold**, *italic*, # headings, - lists, > quotes and ||spoilers||.",
  },

  separator: {
    divider: "Show a divider line",
    dividerHint: "Off keeps only the empty space.",
    spacing: "Spacing",
    small: "Small",
    large: "Large",
  },

  gallery: {
    items: "Images ({count}/{max})",
    addItem: "Add image",
    removeItem: "Remove image",
    itemTitle: "Image {n}",
  },

  media: {
    url: "Image or video URL",
    description: "Description (alt text)",
    spoiler: "Mark as spoiler",
    ok: "The link works",
    failed: "This link could not be loaded as an image",
    placeholderNote: "The placeholder is replaced when the message is sent.",
  },

  section: {
    textTitle: "Text {n}",
    addText: "Add text ({count}/{max})",
    removeText: "Remove this text",
    accessory: "Beside the text",
    thumbnail: "Thumbnail",
    button: "Button",
    pickButton: "Button",
    pickButtonPlaceholder: "Choose a stored button…",
  },

  actions: {
    modeButtons: "Buttons",
    modeSelect: "Select menu",
    buttonsCount: "Buttons ({count}/{max})",
    missingButton: "Deleted button",
    removeButton: "Remove from row",
    addButton: "Add a button",
    addButtonPlaceholder: "Choose a stored button…",
    noMoreButtons: "No other buttons available",
    rowFull: "This row is full ({max} buttons).",
    pickSelect: "Select menu",
    pickSelectPlaceholder: "Choose a stored select menu…",
  },

  pickers: {
    usedElsewhere: "Already used in this layout",
    noButtons: "You have no stored buttons yet. Create one in the Buttons tab first.",
    noSelectMenus: "You have no stored select menus yet. Create one in the Select Menus tab first.",
    gotoButtons: "Open Buttons",
    gotoSelectMenus: "Open Select Menus",
  },

  container: {
    accent: "Accent colour",
    spoiler: "Hide behind a spoiler",
    spoilerHint: "Members click to reveal the whole container.",
  },

  preview: {
    empty: "Empty layout. Add a block to see it here.",
    emptyContainer: "Empty container",
    emptyRow: "Empty row",
    missingButton: "Button deleted",
    missingSelect: "Select menu deleted",
    mediaEmpty: "No image",
    mediaFailed: "Image unavailable",
    spoiler: "Spoiler",
    revealSpoiler: "Reveal spoiler",
  },

  issues: {
    nameLength: "Give the layout a name of 1 to {max} characters.",
    empty: "Add at least one block.",
    emptyContainer: "This container is empty. Add a block to it or delete it.",
    tooManyComponents:
      "The layout has {count} components, Discord allows {max}. Buttons, menus and the texts of sections count too.",
    textTooLong: "The layout has {length} characters of text, Discord allows {max} in total.",
    textEmpty: "This text is empty.",
    galleryEmpty: "Add at least one image.",
    galleryTooMany: "A gallery holds at most {max} images.",
    mediaUrlInvalid: "Enter an http(s) link, or a placeholder that becomes one.",
    descriptionTooLong: "The description can be at most {max} characters.",
    sectionTexts: "A section needs 1 to {max} texts.",
    sectionAccessoryMissing: "Choose a thumbnail or a button for this section.",
    buttonMissing: "The button {name} no longer exists. Pick another one.",
    selectMenuMissing: "The select menu {name} no longer exists. Pick another one.",
    duplicateInteractive:
      "{name} is already used elsewhere in this layout. Discord does not allow the same button or menu twice.",
    rowEmpty: "Choose at least one button or a select menu for this row.",
    rowMixed: "A row holds buttons or a select menu, not both.",
    rowTooManyButtons: "A row holds at most {max} buttons.",
    accentColorInvalid: "The accent colour must look like #5865f2.",
    duplicateId: "This block has the same internal id as another one. Duplicate it again instead of copying.",
    unknownType: "This kind of block is not supported here.",
  },

  errors: {
    layoutIssue: "Layout \"{layout}\": {message}",
    blockIssue: "Layout \"{layout}\", {block}: {message}",
    tooMany: "A server can have at most {max} layouts.",
    missingId: "Layout {n}: the id is missing",
    duplicateId: "Layout: duplicate id \"{id}\"",
    malformed: "Layout \"{layout}\": the data is malformed",
  },
};
