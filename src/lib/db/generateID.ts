export function generateID(id?: string, type?: string) {
  return id && type
    ? `CI_${type}_${id}_${Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)}`
    : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export type CustomIdType =
  | "btn"
  | "embed"
  | "modal"
  | "field"
  | "select"
  | "opt"
  | "scenario"
  | "step";
