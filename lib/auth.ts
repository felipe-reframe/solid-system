import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          // Request offline access so we get a refresh token
          access_type: "offline",
          prompt: "consent",
          scope: [
            "openid",
            "email",
            "profile",
            // Read-only Drive access — enough to list files and export docs
            "https://www.googleapis.com/auth/drive.readonly",
          ].join(" "),
        },
      },
    }),
  ],

  callbacks: {
    // Persist the OAuth access & refresh tokens in the JWT
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
      }
      return token;
    },
    // Expose the access token on the client-side session object
    async session({ session, token }) {
      session.accessToken = token.accessToken as string | undefined;
      return session;
    },
  },

  // Stay on the home page — the sign-in modal is triggered from there
  pages: {
    signIn: "/",
  },
};
