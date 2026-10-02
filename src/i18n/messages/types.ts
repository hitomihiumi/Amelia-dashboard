import type { en } from "./en";

/** The shape every locale must follow: same keys as English, strings for leaves. */
export type Dict<T> = { [K in keyof T]: T[K] extends string ? string : Dict<T[K]> };

export type Messages = typeof en;

type Paths<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Paths<T[K], `${P}${K}.`>;
}[keyof T & string];

/** Dot-separated path to any string in the English dictionary, e.g. "common.save". */
export type MessageKey = Paths<Messages>;
