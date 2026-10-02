import type { Translator } from "@/i18n/translate";
import {
  MAX_PATTERN_LENGTH,
  MAX_WILDCARDS,
  getLinkPatternIssue,
} from "./linkPatterns";

/**
 * Translated counterpart of `validateLinkPattern`: a message for the dashboard,
 * or `null` when the pattern is usable. The pattern itself is passed as a
 * parameter, so wildcards and braces in it are never interpreted.
 */
export function describeLinkPatternIssue(
  t: Translator,
  pattern: string,
): string | null {
  switch (getLinkPatternIssue(pattern)) {
    case "empty":
      return t("moderation.errors.patternEmpty");
    case "spaces":
      return t("moderation.errors.patternSpaces", { pattern });
    case "too_long":
      return t("moderation.errors.patternTooLong", {
        pattern,
        max: MAX_PATTERN_LENGTH,
      });
    case "wildcards":
      return t("moderation.errors.patternWildcards", {
        pattern,
        max: MAX_WILDCARDS,
      });
    case "invalid":
      return t("moderation.errors.patternInvalid", { pattern });
    default:
      return null;
  }
}
