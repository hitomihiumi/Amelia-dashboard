export const site = {
  landing: {
    hero: {
      tagline: "Open Source",
      wordMultipurpose: "Multipurpose",
      wordCustomizable: "Customizable",
      text: "Your handy assistant for improving and customizing your Discord guild!",
      getStarted: "Get Started",
      inviteBot: "Invite Bot",
    },
    stats: {
      eyebrow: "ALREADY RUNNING",
      title: "Amelia is live on Discord servers",
      servers: "servers",
      members: "members",
      commands: "commands",
      botStatus: "bot status",
      alwaysOn: "24/7",
    },
    features: {
      title: "Everything a community needs",
      subtitle: "One bot instead of five, configured from the dashboard.",
      items: {
        moderation: {
          title: "Moderation",
          text: "Numbered cases, warn escalation, temporary bans and auto moderation for invites and links.",
        },
        reports: {
          title: "Reports & appeals",
          text: "Members file reports and appeal punishments through forms you build yourself.",
        },
        audit: {
          title: "Audit log",
          text: "Joins, bans, edited messages and voice activity, delivered to a channel through a webhook.",
        },
        economy: {
          title: "Economy",
          text: "Currency, shop roles, daily rewards and a balance card members can customize.",
        },
        leveling: {
          title: "Leveling",
          text: "Experience from chat and voice, role rewards and level-up cards.",
        },
        scenarios: {
          title: "Scenarios",
          text: "Buttons, menus and modals wired together in a visual editor — no code required.",
        },
      },
    },
    latestNews: {
      title: "Latest news",
      all: "All news",
    },
    statusTeaser: {
      statusPage: "Status page",
    },
  },

  news: {
    metaDescription: "Updates, new features and maintenance notices.",
    title: "News",
    subtitle: "Releases, new features and everything else worth knowing about the bot.",
    all: "All",
    allNews: "All news",
    empty: "Nothing published here yet.",
    previous: "Previous",
    next: "Next",
    page: "Page {page} / {pages}",
    categories: {
      update: "Update",
      feature: "Feature",
      maintenance: "Maintenance",
      announcement: "Announcement",
    },
  },

  status: {
    metaTitle: "Status",
    metaDescription: "Live availability of the bot, the database and the website.",
    headline: {
      operational: "All systems operational",
      degraded: "Some systems are degraded",
      down: "Major outage",
      maintenance: "Scheduled maintenance",
    },
    state: {
      operational: "Operational",
      degraded: "Degraded",
      down: "Down",
      maintenance: "Maintenance",
    },
    services: {
      gateway: "Discord Gateway",
      database: "Database",
      website: "Website",
      shards: "Shards",
    },
    shardsReady: "{ready}/{total} ready",
    lastUpdated: "Last updated: {time}",
    never: "never",
    justNow: "just now",
    metrics: {
      ping: {
        label: "Shard ping",
        description: "Average WebSocket latency to the Discord gateway",
      },
      uptime: {
        label: "Bot uptime",
        description: "Time since the bot process last restarted",
      },
      shards: {
        label: "Shards",
        description: "Discord gateway processes reporting in",
      },
    },
    units: {
      ms: "ms",
      day: "d",
      hour: "h",
      minute: "m",
    },
    servicesTitle: "Services",
    history: {
      title: "Incident history",
      empty: "No incidents recorded yet.",
      autoUnavailable: "{service} is unavailable",
      autoDegraded: "{service} is degraded",
      autoDetected: "Automatically detected by the health check.",
      autoRecovered: "The service recovered.",
    },
    severity: {
      critical: "Critical",
      major: "Major",
      minor: "Minor",
      maintenance: "Maintenance",
    },
    incidentStatus: {
      investigating: "Investigating",
      identified: "Identified",
      monitoring: "Monitoring",
      resolved: "Resolved",
    },
  },

  legal: {
    lastUpdated: "Last updated: {date}",
    terms: {
      s1: {
        title: "1. Acceptance of Terms",
        text: "By inviting Amelia (the “Bot”) to your Discord server or logging into our Dashboard, you agree to comply with and be bound by these Terms of Service. If you do not agree with these terms, you must remove the Bot from your server and cease using the Dashboard.",
      },
      s2: {
        title: "2. Description of Service",
        text: "Amelia is a multi-purpose Discord bot providing moderation, economy, leveling, and utility tools. The service is provided “as is” and we reserve the right to modify, suspend, or discontinue any part of the service at any time without notice.",
      },
      s3: {
        title: "3. User Conduct and Restrictions",
        introBefore: "When using the Bot or Dashboard, you agree",
        introEmphasis: "not",
        introAfter: "to:",
        items: {
          i1: "Use the service to violate Discord’s Terms of Service or Community Guidelines.",
          i2: "Attempt to exploit, bypass, or abuse any of the Bot’s systems (e.g., economy exploits, API rate limit abuse).",
          i3: "Use the Bot to generate or distribute malicious, illegal, or highly offensive content.",
        },
      },
      s4: {
        title: "4. Termination of Access",
        text: "We reserve the right to permanently blacklist users or entire servers from using the Bot and Dashboard at our sole discretion, without prior notice, if we determine that these Terms have been violated.",
      },
      s5: {
        title: "5. Limitation of Liability",
        text: "Under no circumstances shall the developers of Amelia be held liable for any direct, indirect, incidental, or consequential damages resulting from the use or inability to use the Bot. We are not responsible for any actions taken by server administrators using our moderation tools.",
      },
    },
    privacy: {
      s1: {
        title: "1. Information We Collect",
        intro:
          "When you use Amelia (the “Bot”) or our Dashboard, we may collect the following data:",
        items: {
          user: {
            label: "Discord User Data:",
            text: "Your User ID, username, global name, and avatar URL.",
          },
          guild: {
            label: "Guild (Server) Data:",
            text: "Guild IDs, names, roles, and channel structures necessary for configuration.",
          },
          activity: {
            label: "Activity Data:",
            text: "Economy balances, experience points, level progressions, and bot usage statistics.",
          },
          content: {
            label: "Content Data:",
            text: "Message content is only processed temporarily for moderation, or leveling features and is not permanently stored unless specifically required by a feature (e.g., ticket logs or moderation histories).",
          },
        },
      },
      s2: {
        title: "2. How We Use Your Data",
        intro: "The collected data is used exclusively to:",
        items: {
          i1: "Provide, operate, and maintain the Bot’s features (e.g., economy, leveling, moderation).",
          i2: "Improve user experience and personalize interactions within the Bot.",
          i3: "Authenticate users on our web Dashboard.",
          i4: "Personalize user experience (e.g., custom profiles and rank cards).",
        },
      },
      s3: {
        title: "3. Data Sharing and Third Parties",
        before: "We",
        emphasis: "do not",
        after:
          "sell, rent, or share your personal data with third parties for marketing purposes. Data may be shared with secure third-party service providers (such as databases) solely for the purpose of operating the Bot’s core functions.",
      },
      s4: {
        title: "4. Data Retention and Deletion",
        text: "We retain your data for as long as the Bot is present in your Discord server or as long as your account is active. If the Bot is removed from a server, related configuration data may be deleted. You have the right to request the complete deletion of your personal data by contacting the developer team.",
      },
      s5: {
        title: "5. Contact Us",
        text: "If you have any questions or concerns about this Privacy Policy, please contact us via our Support Discord Server or reach out to the developer directly.",
      },
    },
  },

  submit: {
    layout: {
      subtitle: "Moderation requests",
    },
    signIn: {
      button: "Sign in with Discord",
    },
    kinds: {
      report: "Report",
      appeal: "Appeal",
    },
    caseTypes: {
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
    statuses: {
      pending: "Pending",
      in_review: "In review",
      approved: "Approved",
      rejected: "Rejected",
    },
    index: {
      emptyTitle: "Nothing to submit",
      emptyDescription: "This server has not enabled any moderation forms yet.",
      reportTitle: "Report a member",
      reportDescription:
        "Tell the moderation team about a rule violation. Members of the server only.",
      appealTitle: "Appeal a punishment",
      appealDescription:
        "Ask the moderation team to review a warn, mute or ban you received. Available even if you are banned.",
      statusTitle: "My submissions",
      statusDescription: "See the status of everything you have sent to this server.",
    },
    report: {
      closedTitle: "Reports are closed",
      closedDescription: "This server does not accept reports through the dashboard right now.",
      signIn: "Sign in with Discord to send a report to the moderation team.",
      deniedTitle: "Access denied",
      deniedDescription: "Only members of this server can send reports.",
      title: "Report a member",
      intro:
        "Describe what happened as precisely as you can — links to the offending messages help the moderators a lot.",
    },
    appeal: {
      closedTitle: "Appeals are closed",
      closedDescription: "This server does not accept appeals through the dashboard right now.",
      signIn:
        "Sign in with Discord to appeal a punishment. This works even if you are banned from the server.",
      deniedTitle: "Access denied",
      deniedDescription: "Only members of this server, or users punished on it, can appeal.",
      bannedClosedTitle: "Appeals are not open to banned users",
      bannedClosedDescription: "This server does not accept appeals from banned users.",
      title: "Appeal a punishment",
      intro:
        "Explain why the punishment should be lifted. A moderator will review your appeal and you will receive the answer in a direct message.",
      bannedTitle: "You are banned from this server",
      bannedDescription:
        "You can still submit this appeal. If it is approved, the ban is lifted automatically.",
      noCasesTitle: "No punishments found",
      noCasesDescription:
        "We could not find any punishment issued to you on this server. You can still submit the form and describe your case.",
    },
    status: {
      signIn: "Sign in with Discord to see your submissions.",
      title: "My submissions",
      emptyTitle: "Nothing here yet",
      emptyDescription: "You have not sent any reports or appeals to this server.",
      sent: "Sent {date}",
      response: "Moderator response",
    },
    form: {
      submittedTitle: "Submitted",
      anonymousTitle: "Anonymous submission",
      anonymousDescription:
        "Your name is hidden from the moderation channel. Moderators can still contact you about this submission.",
      caseLabel: "Punishment you are appealing",
      targetLabel: "Discord ID of the reported user",
      targetDescription:
        "Enable developer mode in Discord, right click the user and choose “Copy User ID”.",
      noFieldsTitle: "Nothing to fill in",
      noFieldsDescription:
        "This form has no fields configured yet. Please contact the server staff.",
      send: "Send",
      invalidUrl: "Please enter a valid URL",
      invalidMessageLink: "Please enter a valid message link",
    },
    actions: {
      unknownForm: "Unknown form.",
      unknownServer: "Unknown server.",
      signInFirst: "Please sign in with Discord first.",
      notAllowed: "You are not allowed to use this form.",
      formDisabled: "This form is currently disabled.",
      invalidData: "Invalid form data.",
      invalidTarget: "Enter a valid Discord ID of the reported user.",
      selfReport: "You cannot report yourself.",
      notYourCase: "That punishment does not belong to you.",
      successReport:
        "Your report #{number} has been sent to the moderation team. You will receive a direct message once it is handled.",
      successAppeal:
        "Your appeal #{number} has been sent to the moderation team. You will receive a direct message once it is handled.",
      internalError: "Internal server error. Please try again later.",
    },
  },
};
