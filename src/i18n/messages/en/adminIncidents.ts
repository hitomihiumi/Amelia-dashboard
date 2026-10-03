export const adminIncidents = {
  list: {
    title: "Incidents",
    description: "Report problems, keep the timeline up to date and close incidents once they are over.",
    report: "Report incident",
    tabsLabel: "Show incidents",
    tabs: {
      active: "Active",
      history: "History",
    },
    empty: {
      activeTitle: "All clear",
      activeText: "There are no active incidents. If something breaks, report it so visitors know.",
      historyTitle: "No history yet",
      historyText: "Resolved incidents are archived here.",
    },
    showMore: "Show more",
    updates: "{count, plural, one {# update} other {# updates}}",
    noUpdates: "No updates yet",
    lastUpdate: "Last update",
    openIncident: "Open incident: {title}",
  },
  meta: {
    started: "Started {time}",
    ongoing: "Ongoing for {duration}",
    lasted: "Lasted {duration}",
    auto: "Auto",
    autoHint: "Opened automatically by the health check",
    noComponent: "General",
  },
  duration: {
    lessThanMinute: "under a minute",
    minutes: "{minutes} min",
    hoursMinutes: "{hours} h {minutes} min",
    daysHours: "{days} d {hours} h",
  },
  severity: {
    minor: {
      label: "Minor",
      description: "A small hiccup. Most people won't notice.",
    },
    major: {
      label: "Major",
      description: "A noticeable problem for many users.",
    },
    critical: {
      label: "Critical",
      description: "The bot or the site is down for everyone.",
    },
    maintenance: {
      label: "Scheduled maintenance",
      description: "Planned work that was announced ahead of time.",
    },
  },
  counter: "{count}/{max}",
  form: {
    title: "Report incident",
    description: "Visitors see the incident on the status page as soon as you submit it.",
    back: "All incidents",
    severity: "Severity",
    component: "Affected component",
    componentNone: "General / none",
    titleLabel: "Title",
    titlePlaceholder: "For example: Commands are responding slowly",
    messageLabel: "First message",
    messagePlaceholder: "What is going on and what do you know so far?",
    messageHint: "Shown as the first update. Optional, but visitors will want to know what is happening.",
    templates: "Quick templates",
    submit: "Report incident",
    previewTitle: "Live preview",
    previewHint: "This is how the incident will look on the status page.",
    previewPlaceholder: "Incident title",
  },
  detail: {
    back: "All incidents",
    viewOnStatus: "View on status page",
    editDetails: "Edit details",
    titleLabel: "Title",
    saveDetails: "Save changes",
    autoNotice:
      "Opened automatically by the health check. If the service is still down when you resolve it, the check opens a new incident.",
    autoComponentLocked: "The component of an automatic incident cannot be changed.",
    progressLabel: "Incident progress",
    timeline: {
      title: "Timeline",
      opened: "Incident reported",
      empty: "Nothing has been posted yet. Use the form to write the first update.",
      edit: "Edit update",
      delete: "Delete update",
      status: "Status of this update",
      message: "Message",
    },
    composer: {
      title: "Post an update",
      status: "New status",
      message: "Message",
      placeholder: "Tell visitors what changed…",
      templates: "Templates",
      post: "Post update",
      resolve: "Resolve incident",
      resolveHint: "Posts your message, or a default one if the field is empty.",
      resolvedNotice: "This incident was resolved {time}.",
      reopen: "Reopen incident",
    },
    danger: {
      title: "Delete incident",
      text: "Removes the incident and its whole timeline from the status page for good.",
    },
  },
  toast: {
    created: "Incident reported",
    updatePosted: "Update posted",
    resolved: "Incident resolved",
    detailsSaved: "Changes saved",
    updateEdited: "Update changed",
    updateDeleted: "Update deleted",
    deleted: "Incident deleted",
  },
  errors: {
    titleLength: "The title must be between 3 and 200 characters.",
    unknownSeverity: "Unknown severity.",
    unknownComponent: "Unknown component.",
    unknownStatus: "Unknown status.",
    bodyLength: "The message can be at most 2000 characters.",
    updateLength: "The update must be between 1 and 2000 characters.",
    incidentNotFound: "Incident not found.",
    updateNotFound: "Update not found.",
    autoComponentLocked: "The component of an automatic incident cannot be changed.",
    createFailed: "Could not create the incident.",
    updateFailed: "Could not save the changes.",
    updateDeleteFailed: "Could not delete the update.",
    deleteFailed: "Could not delete the incident.",
  },
  templates: {
    create: {
      investigating: {
        label: "Investigating",
        text: "We are aware of an issue and are looking into it. We will post an update as soon as we know more.",
      },
      degraded: {
        label: "Degraded performance",
        text: "Some features are slower than usual or may fail from time to time. We are working on it.",
      },
      outage: {
        label: "Outage",
        text: "The service is currently unavailable. We are working on restoring it and will keep this page updated.",
      },
      maintenance: {
        label: "Maintenance window",
        text: "We are carrying out scheduled maintenance. The bot may be briefly unavailable or slow while we work. We will post an update when it is finished.",
      },
    },
    update: {
      investigating: {
        a: {
          label: "Still looking",
          text: "We are still investigating the issue and will share more details shortly.",
        },
        b: {
          label: "Reports confirmed",
          text: "We have confirmed the problem and are looking for the cause.",
        },
      },
      identified: {
        a: {
          label: "Cause found",
          text: "We have found the cause of the problem and are working on a fix.",
        },
        b: {
          label: "Fix in progress",
          text: "A fix is being prepared and tested. We will let you know once it is rolled out.",
        },
      },
      monitoring: {
        a: {
          label: "Fix deployed",
          text: "A fix has been deployed. We are monitoring the results to make sure everything is stable.",
        },
        b: {
          label: "Recovering",
          text: "The service is recovering. A few users may still notice some delays for a short while.",
        },
      },
      resolved: {
        a: {
          label: "All fixed",
          text: "The issue has been resolved and everything is working normally again. Thank you for your patience.",
        },
        b: {
          label: "Maintenance done",
          text: "Maintenance is complete and all services are running normally.",
        },
      },
    },
    reopened: "We are seeing the problem again and are looking into it.",
  },
};
