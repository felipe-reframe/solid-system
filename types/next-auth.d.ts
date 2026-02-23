// Augment the NextAuth Session and JWT types to carry our Drive access token
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    /** Google OAuth access token — used to call Drive API server-side */
    accessToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
  }
}
