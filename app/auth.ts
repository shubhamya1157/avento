import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import connectDB from "./lib/db";
import userModel from "./models/user";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { type: "email", label: "Email" },
        password: { type: "password", label: "Password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        await connectDB();

        const user = await userModel.findOne({ email });
        if (!user) {
          throw new Error("No account found with this email");
        }

        if (!user.emailVerified) {
          throw new Error("Please verify your email before logging in");
        }

        const isMatch = await bcrypt.compare(password, user.password ?? "");
        if (!isMatch) {
          throw new Error("Invalid password");
        }

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
    Google({
      clientId: process.env.AUTH_GOOGLE_ID ?? "",
      clientSecret: process.env.AUTH_GOOGLE_SECRET ?? "",
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!user?.email) return false;

      if (account?.provider === "google") {
        await connectDB();

        const existingUser = await userModel.findOne({ email: user.email });
        if (!existingUser) {
          await userModel.create({
            name: user.name ?? "Google User",
            email: user.email,
            role: "user",
          });
        }
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? token.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user = {
          ...session.user,
          id: token.id as string,
          role: token.role as string | undefined,
        };
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7,
  },
  secret: process.env.AUTH_SECRET,
});
