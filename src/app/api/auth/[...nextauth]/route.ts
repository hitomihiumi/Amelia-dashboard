import NextAuth, { NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import { refreshDiscordAccessToken } from "@/lib/discord/oauth-refresh";

export const authOptions: NextAuthOptions = {
  pages: {
    signIn: "/login",
  },
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      authorization: {
        url: "https://discord.com/api/oauth2/authorize",
        params: {
          scope: "identify email guilds",
        },
      },
      profile(profile) {
        const avatarDecoration = profile.avatar_decoration_data?.asset
          ? `https://cdn.discordapp.com/avatar-decoration-presets/${profile.avatar_decoration_data.asset}.png`
          : null;

        return {
          id: profile.id,
          name: profile.global_name || profile.username,
          email: profile.email,
          image: profile.avatar
            ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
            : null,
          avatarDecoration,
        };
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, account, user }) {
      if (user) {
        token.avatarDecoration = (user as any).avatarDecoration;
      }

      if (account) {
        const now = Math.floor(Date.now() / 1000);
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt =
          account.expires_at ??
          now + (typeof account.expires_in === "number" ? account.expires_in : 604800);
        delete token.error;
        return token;
      }

      if (!token.refreshToken) {
        return token;
      }

      const now = Math.floor(Date.now() / 1000);
      const expiresAt = token.expiresAt as number | undefined;
      const refreshMarginSec = 300;
      const shouldRefresh = expiresAt === undefined || now >= expiresAt - refreshMarginSec;

      if (!shouldRefresh) {
        return token;
      }

      try {
        const refreshed = await refreshDiscordAccessToken(token.refreshToken);
        token.accessToken = refreshed.access_token;
        if (refreshed.refresh_token) {
          token.refreshToken = refreshed.refresh_token;
        }
        token.expiresAt = now + refreshed.expires_in;
        delete token.error;
      } catch {
        token.error = "RefreshAccessTokenError";
      }

      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.avatarDecoration = token.avatarDecoration as string | null;
      }
      if (token.error === "RefreshAccessTokenError") {
        session.error = "RefreshAccessTokenError";
      } else {
        session.error = undefined;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
