const TOKEN_URL = "https://discord.com/api/oauth2/token";

export type DiscordTokenRefreshResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
};

export async function refreshDiscordAccessToken(
  refreshToken: string,
): Promise<DiscordTokenRefreshResponse> {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Не заданы DISCORD_CLIENT_ID / DISCORD_CLIENT_SECRET");
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Discord token ${res.status}: ${text.slice(0, 200)}`);
  }

  return res.json() as Promise<DiscordTokenRefreshResponse>;
}
