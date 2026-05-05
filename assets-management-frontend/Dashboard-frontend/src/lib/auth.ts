import { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

export const authOptions = {
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Email",
      credentials: {
        name: { label: "Name", type: "text" },
        email: { label: "Email", type: "email" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim();
        const name = credentials?.name?.trim() || email?.split("@")[0];

        if (!email) return null;

        return {
          id: email,
          name,
          email,
        };
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      authorization: {
        params: {
          // prompt: "consent" нь хэрэглэгчийг дахин зөвшөөрөл өгөхийг шаардана
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope:
            "openid email profile https://www.googleapis.com/auth/gmail.readonly",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, user }: { token: JWT; account: any; user: any }) {
      if (account) {
        token.accessToken = account.access_token;
      }
      if (user) {
        token.name = user.name;
        token.email = user.email;
        token.picture = user.image;
      }
      return token;
    },
    async session({ session, token }: { session: any; token: JWT }) {
      session.accessToken = token.accessToken;
      session.user = {
        ...session.user,
        name: token.name,
        email: token.email,
        image: token.picture,
      };
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || "asset-management-local-dev-secret",
};
