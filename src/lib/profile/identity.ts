import type { CardIdentity } from "@/components/profile/cards/types";

/** Absolute URL of a Discord avatar the canvas can draw (PNG, a fixed size). */
export function discordAvatarUrl(userId: string, image: string | null | undefined, size = 256) {
  if (image) {
    const url = new URL(image);
    url.searchParams.set("size", String(size));
    return url.toString();
  }
  // Members without an avatar get one of the six default pictures, chosen by their id.
  const index = Number((BigInt(userId) >> BigInt(22)) % BigInt(6));
  return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
}

/** Who the cards are about, from the signed in session. */
export function cardIdentity(user: {
  id: string;
  name?: string | null;
  username?: string;
  image?: string | null;
}): CardIdentity {
  const globalName = user.name || user.username || "User";
  return {
    avatar: discordAvatarUrl(user.id, user.image),
    // Sessions from before the handle was stored have only the display name.
    username: user.username || globalName,
    globalName,
  };
}
