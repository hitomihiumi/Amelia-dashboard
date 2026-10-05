export const moderation = {
  // Case types (punishments and their counterparts). The ids are stored in the database.
  punishments: {
    warn: "Warn",
    mute: "Mute",
    kick: "Kick",
    ban: "Ban",
    note: "Note",
    unwarn: "Warn revoked",
    unmute: "Unmute",
    unban: "Unban",
    purge: "Purge",
  },

  errors: {
    // Page-level
    sessionExpiredTitle: "Session expired",
    sessionExpiredText:
      "Your Discord session has expired. Please log in again.",
    genericTitle: "Error",
    loadServerData: "An unknown error occurred while loading server data.",
    loadChannels: "An unknown error occurred while loading channels.",
    saveFailed: "Save failed",
    actionFailed: "Action failed",

    // Server actions
    missingData: "Required data is missing.",
    parseFailed: "Failed to parse data payload.",
    internalSave: "Internal server error occurred while saving.",
    internal: "Internal server error occurred.",
    notAuthorized: "Not authorized.",
    unknownStatus: "Unknown status.",
    reportForm: "Report form: {error}",
    appealForm: "Appeal form: {error}",

    // General settings
    rolesLimit: "Moderation roles must be a list of at most 25 roles.",
    invalidRole: "Invalid role selected.",
    invalidLogChannel: "Invalid moderation log channel.",
    warnExpiryRange: "Warn expiry must be between 0 and 365 days.",
    thresholdsLimit: "You can configure at most 10 escalation rules.",
    thresholdCount:
      "Every escalation rule needs a warn count between 1 and 100.",
    thresholdDuplicate: "Escalation rules must use distinct warn counts.",
    thresholdPunishment: "Every escalation rule needs a valid punishment.",
    thresholdDuration: "Escalation durations must be between 0 and 28 days.",

    // Auto moderation
    autoModIncomplete: "Auto moderation data is incomplete.",
    ignoredChannelsLimit:
      "Ignored channels must be a list of at most 50 channels.",
    ignoredRolesLimit: "Ignored roles must be a list of at most 50 roles.",
    autoModPunishment: "Every auto moderation rule needs a valid punishment.",
    autoModDuration: "Auto moderation durations must be between 0 and 28 days.",
    autoModReason:
      "Auto moderation reasons must be at most 400 characters long.",
    whitelistLimit: "The link whitelist accepts at most 100 entries.",
    whitelistText: "The link whitelist accepts text patterns only.",
    patternEmpty: "Pattern cannot be empty.",
    patternSpaces: "“{pattern}” cannot contain spaces.",
    patternTooLong: "“{pattern}” is longer than {max} characters.",
    patternWildcards: "“{pattern}” uses more than {max} wildcards.",
    patternInvalid: "“{pattern}” is not a valid pattern.",

    // Forms
    formCooldown: "Cooldown must be between 0 and 30 days.",
    formMaxPending: "The pending submission limit must be between 1 and 20.",
    formChannel: "Invalid channel selected.",
    formFieldsLimit: "A form can have at most {max} fields.",
    formNeedsChannel:
      "Choose a channel the submissions are posted to before enabling the form.",
    formFieldId: "Every field needs a unique identifier.",
    formFieldLabel: "Every field needs a label of at most 100 characters.",
    formFieldNeedsOption: "Field “{label}” needs at least one option.",
    formFieldOptionsLimit: "Field “{label}” can have at most 25 options.",

    // Audit log
    auditInvalid: "Invalid audit log data.",
    auditChannel: "Invalid audit log channel.",
    auditUnknownCategory: "Unknown audit category “{key}”.",
    auditCategoryChannel:
      "Invalid channel selected for the “{category}” category.",
    auditIgnoredChannelsLimit:
      "Ignored channels must be a list of at most 50 entries.",
    auditIgnoredChannelsInvalid: "Ignored channels contains an invalid ID.",
    auditIgnoredRolesLimit:
      "Ignored roles must be a list of at most 50 entries.",
    auditIgnoredRolesInvalid: "Ignored roles contains an invalid ID.",
    webhookNameLength: "The webhook name must be at most 80 characters long.",
    webhookAvatar: "The webhook avatar must be a link to an image.",
    auditUnknownEvent: "Unknown audit event “{key}”.",
    auditEventInvalid: "Invalid configuration for “{event}”.",
    auditEventChannel: "Invalid channel selected for “{event}”.",
    auditOrphan:
      "Some events have no channel. Pick a default channel, or a channel for every category.",
    botTokenMissing: "The bot token is not configured.",
    webhookRefused:
      "Discord refused to create a webhook ({status}). Check that the bot may manage webhooks in that channel. {details}",
    webhookNoToken: "Discord returned a webhook without a token.",

    // Submissions and cases
    submissionNotFound: "Submission not found.",
    submissionHandled: "This submission has already been handled.",
    caseNotFound: "Case #{number} was not found.",
    caseRevoked: "Case #{number} is already revoked.",
    caseNotRevocable: "This case type cannot be revoked.",
    unbanRejected: "Discord rejected the unban. Check the bot permissions.",
  },

  automod: {
    kinds: {
      invite: "Invite links",
      links: "Links",
      keywords: "Blocked words",
      profanity: "Word lists",
      mention_spam: "Mention spam",
      spam: "Spam",
    },
    issues: {
      ignore_channels_too_many: "{kind}: Discord accepts at most {max} ignored channels.",
      ignore_roles_truncated: "{kind}: Discord accepts at most {max} exempt roles (ignored roles plus moderator roles together). The rest was left out.",
      block_message_too_long: "{kind}: the message shown to the author can have at most {max} characters.",
      keywords_empty: "{kind}: add at least one word or pattern.",
      keywords_too_many: "{kind}: at most {max} words are allowed.",
      keyword_too_long: "{kind}: \"{word}\" is longer than {max} characters.",
      regex_too_many: "{kind}: at most {max} patterns are allowed.",
      regex_too_long: "{kind}: the pattern \"{pattern}\" is longer than {max} characters.",
      allow_too_many: "{kind}: at most {max} allowed words are accepted.",
      presets_empty: "{kind}: pick at least one word list.",
      mention_limit_range: "{kind}: the limit must be between 1 and {max}.",
      link_pattern_invalid: "{kind}: \"{pattern}\" is not a valid whitelist pattern.",
      link_whitelist_unsupported: "{kind}: \"{pattern}\" has a wildcard in the middle, which Discord cannot match. Use * only at the start or the end.",
      link_whitelist_too_large: "{kind}: the whitelist needs {words} entries in Discord, the limit is {max}. Remove some patterns.",
    },
    sync: {
      noToken: "Saved, but this dashboard has no bot token, so the AutoMod rules were not updated in Discord.",
      permissions: "Saved, but Discord refused to change the AutoMod rules: the bot needs the Manage Server permission (and Moderate Members for timeouts).",
      limit: "{kind}: Discord has reached its limit for rules of this type on the server. Remove a rule of the same type in Server Settings → Safety Setup → AutoMod.",
      invalid: "{kind}: Discord rejected the rule: {message}",
      unknown: "{kind}: Discord could not apply the rule: {message}",
    },
    state: {
      active: "Active in Discord",
      missing: "Missing in Discord",
      off: "Not created",
      unknown: "Disabled in Discord",
      unavailable: "Cannot check Discord",
    },
  },

  settings: {
    title: "Moderation",
    description:
      "Configure who can moderate, how punishments escalate and what the bot filters automatically.",
    saved: "Moderation settings saved",

    general: {
      title: "General",
      description: "Who may moderate and where actions are recorded.",
      roles: "Moderator roles",
      rolesHint:
        "Members with these roles can use the /mod commands. Administrators always can.",
      logChannel: "Moderation log channel",
      dmNotify: "Notify punished members",
      dmNotifyHint:
        "Send a direct message with the reason, the duration and the appeal link.",
    },

    escalation: {
      title: "Warn escalation",
      description:
        "Punish members automatically once they collect a given number of active warns.",
      expiry: "Warns expire after (days, 0 = never)",
      rule: "Rule {number}",
      removeRule: "Remove rule",
      warns: "Warns",
      duration: "Duration (seconds)",
      empty: "No escalation configured — warns only accumulate.",
      addRule: "Add rule",
    },

    autoMod: {
      deleteMessage: "Delete the offending message",
      moderatorsExempt: "Moderators are exempt",
      ignoredChannels: "Ignored channels",
      ignoredRoles: "Ignored roles",
      punishment: "Punishment",
      duration: "Duration in seconds (0 = permanent)",
      reason: "Reason",
    },

    invite: {
      title: "Invite filter",
      description:
        "Act on messages containing invites to other Discord servers.",
    },

    links: {
      title: "Link filter",
      description:
        "Act on messages containing links. Whitelisted domains are ignored.",
    },

    whitelist: {
      title: "Allowed links ({count}/{max})",
      pattern: "Pattern",
      add: "Add",
      duplicate: "This pattern is already in the list.",
      howTitle: "How patterns work",
      howText:
        "Write the address as you would read it. The star stands for “anything”; everything else is matched literally. A pattern always covers the deeper pages of what it matched.",
      examples: {
        domain: "the domain itself, every subdomain and every page",
        subdomains: "subdomains only",
        channel: "only links pointing at a channel",
        contains: "any link containing “docs”",
      },
      test: "Test a link against the list",
      allowedTitle: "This link is allowed",
      allowedText: "Matched by the pattern “{pattern}”.",
      moderatedTitle: "This link is moderated",
      moderatedText:
        "No pattern matches it, so the filter would act on this link.",
    },
  },

  audit: {
    title: "Audit log",
    description:
      "Record what happens on the server — joins, punishments, message edits, voice activity and server changes — in a channel of your choice.",
    saved: "Audit log saved",

    general: {
      title: "General",
      description:
        "The bot posts through a webhook it creates in the channel you pick.",
      channel: "Default audit log channel",
      channelHint:
        "Used by every event that has no channel of its own or of its category.",
      ignoredChannels: "Ignored channels",
      ignoredRoles: "Ignored roles",
      skipBots: "Skip actions made by bots",
      webhookName: "Webhook name",
      webhookAvatar: "Webhook avatar URL",
      permissionsTitle: "Bot permissions",
      permissionsText:
        "The bot needs “Manage Webhooks” in the log channel, and “View Audit Log” on the server to name the moderator behind bans, kicks and role changes.",
    },

    category: {
      description:
        "Send the whole category to its own channel, or fine-tune single events below.",
      channel: "{category} channel",
      channelHint: "Leave empty to use the default audit log channel.",
    },

    event: {
      log: "Log this event",
      channel: "Channel for this event only (optional)",
    },

    categories: {
      members: "Members",
      messages: "Messages",
      voice: "Voice",
      server: "Server",
    },

    events: {
      member_join: "Member joined",
      member_leave: "Member left",
      member_roles: "Roles changed",
      member_nickname: "Nickname changed",
      member_ban: "Member banned",
      member_unban: "Member unbanned",
      member_kick: "Member kicked",
      member_timeout: "Member timed out",
      message_delete: "Message deleted",
      message_edit: "Message edited",
      message_bulk_delete: "Messages purged",
      voice_join: "Joined a voice channel",
      voice_leave: "Left a voice channel",
      voice_move: "Switched voice channels",
      channel_create: "Channel created",
      channel_delete: "Channel deleted",
      channel_update: "Channel renamed",
      role_create: "Role created",
      role_delete: "Role deleted",
      role_update: "Role updated",
      guild_update: "Server updated",
    },
  },

  cases: {
    title: "Case log",
    description:
      "Every moderation action taken by commands, auto moderation or the dashboard. Revoking a case lifts the punishment in Discord as well.",
    filters: {
      all: "All",
      warn: "Warns",
      mute: "Mutes",
      ban: "Bans",
      kick: "Kicks",
      note: "Notes",
    },
    selectHint: "Select a case to see the details.",
    columns: {
      number: "Case",
      type: "Type",
      user: "User",
      moderator: "Moderator",
      reason: "Reason",
      source: "Source",
      date: "Date",
      status: "Status",
    },
    userFilter: "Filter by user ID",
    emptyTitle: "No cases",
    emptyText: "Nothing matches the current filters.",
    previous: "Previous",
    next: "Next",
    pageOf: "Page {page} / {pages}",
    active: "Active",
    closed: "Closed",
    caseTitle: "#{number} • {type}",
    user: "User: {id}",
    moderator: "Moderator: {moderator}",
    autoModeration: "Auto moderation",
    sources: {
      command: "Command",
      automod: "Auto moderation",
      dashboard: "Dashboard",
      submission: "Submission",
    },
    duration: "Duration: {value}",
    durationSeconds: "{seconds, plural, one {# second} other {# seconds}}",
    permanent: "Permanent",
    expires: "expires {date}",
    revokeReason: "Revocation reason",
    revoke: "Revoke",
    revoked: "Case #{number} revoked",
  },

  forms: {
    title: "Report & appeal forms",
    description:
      "Build the forms your members fill in. Submissions land in the channel you pick, with buttons for your moderators, and in the dashboard queue.",
    saved: "Forms saved",

    report: {
      title: "Report form",
      description: "Members use this form to report rule violations.",
    },
    appeal: {
      title: "Appeal form",
      description:
        "Punished members use this form to ask for a review. Banned users can reach it too.",
    },

    publicLink: "Public link: {url}",
    channel: "Submissions are posted to",
    cooldown: "Cooldown between submissions (seconds)",
    maxPending: "Open submissions per member",
    requireTarget: "Require the reported user's ID",
    hideAuthor: "Hide the author in Discord",
    hideAuthorHint:
      "The author is still stored and visible in the dashboard queue.",
    allowBanned: "Banned users may appeal",
    questions: "Questions ({count}/{max})",
    addQuestion: "Add question",
    noQuestions:
      "No questions yet. Members would only see the built-in fields.",
    newQuestion: "New question",
    newOption: "New option",
    successMessage: "Confirmation shown after sending",
    approveMessage: "Message sent when approved",
    rejectMessage: "Message sent when rejected",

    field: {
      question: "Question",
      hint: "Hint (optional)",
      minValue: "Minimum value",
      maxValue: "Maximum value",
      minLength: "Minimum length",
      maxLength: "Maximum length",
      placeholder: "Placeholder",
      options: "Options ({count}/{max})",
      addOption: "Add option",
      optionLabel: "Label",
      optionValue: "Value",
      required: "Required",
      moveUp: "Move up",
      moveDown: "Move down",
      delete: "Delete question",
    },

    types: {
      short: "Short text",
      paragraph: "Long text",
      number: "Number",
      boolean: "Yes / no",
      select: "Choice",
      user: "User ID",
      channel: "Channel ID",
      message_link: "Message link",
      url: "Link",
    },
  },

  queue: {
    title: "Submission queue",
    description:
      "Reports and appeals sent through the dashboard forms. Approving an appeal automatically lifts the punishment it was filed against.",
    filters: {
      open: "Open",
      all: "All",
      reports: "Reports",
      appeals: "Appeals",
    },
    status: {
      pending: "Pending",
      in_review: "In review",
      approved: "Approved",
      rejected: "Rejected",
    },
    kinds: {
      report: "Report",
      appeal: "Appeal",
    },
    selectHint: "Select a submission to read it and reply.",
    emptyTitle: "Nothing here",
    emptyText: "No submissions match the current filters.",
    cardTitle: "{kind} #{number}",
    author: "Author: {id}",
    reported: "Reported: {id}",
    caseRef: "Case #{number}",
    sent: "Sent {date}",
    handledBy: "Handled by {id}",
    response: "Response",
    responseLabel: "Response to the author (sent in DM)",
    takeInReview: "Take in review",
    reject: "Reject",
    approve: "Approve",
    updated: "Submission updated",
  },
};
