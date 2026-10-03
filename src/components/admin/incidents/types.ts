/** The server actions the screens need; handed in by the page so a bench can stub them. */
export type IncidentActions = typeof import("@/app/admin/incidents/actions");

export const INCIDENTS_PATH = "/admin/incidents";
export const TITLE_MAX = 200;
export const BODY_MAX = 2000;
