// ===========================================================================
// auth.ts — Logging users in and keeping them logged in
// ===========================================================================
//
// This file configures "NextAuth", a library that handles the hard, security-
// sensitive parts of authentication for us. Authentication = proving you are
// who you say you are (logging in).
//
// This app supports TWO ways to log in ("providers"):
//   1. Credentials — the classic email + password.
//   2. Google      — click "Continue with Google" and use your Google account.
//
// HOW THE APP REMEMBERS YOU AFTER LOGIN:
// We use a "JWT" (JSON Web Token). Think of it as a tamper-proof wristband the
// server gives your browser after you log in. On every later request the
// browser shows the wristband, so the server knows it's still you without
// looking you up in the database each time.
// ===========================================================================

// "import" means "bring in code that lives in another file or library so we can
// use it here". Each line below grabs one tool. A "library" (also called a
// package or module) is a bundle of ready-made code someone else wrote and
// shared, so we don't have to build everything from scratch.
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";          // library for safely checking passwords
import connectDB from "./lib/db";       // our own helper that opens the database
import userModel from "./models/user";  // our description of what a "user" looks like in the database

// NextAuth(...) hands back several ready-made tools. "export" is the opposite of
// "import": it marks these tools as shareable, so OTHER files are allowed to
// import them. A "session" is the period during which you stay logged in — from
// the moment you sign in until you sign out (or it expires). We export:
//   - handlers: the API endpoints (web addresses) the browser talks to during login
//   - signIn / signOut: functions to start/end a session
//   - auth: a function to ask "who is logged in right now?" on the server
//
// The `{ handlers, signIn, signOut, auth } = ...` part is called "destructuring":
// NextAuth returns one big object, and this syntax unpacks four named pieces out
// of it into their own variables in a single line.
export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    // -----------------------------------------------------------------------
    // PROVIDER 1: Email + password login.
    // -----------------------------------------------------------------------
    Credentials({
      // These describe the fields the login form collects.
      credentials: {
        email: { type: "email", label: "Email" },
        password: { type: "password", label: "Password" },
      },

      // `authorize` runs when someone submits the login form. Its job: decide
      // whether the email/password are correct. Return a user object to allow
      // login, or throw an error to reject it.
      //
      // "async" marks a function that does slow work (like asking the database,
      // which takes time over the network). An async function can use "await",
      // which means "pause right here and wait for this slow step to finish
      // before moving to the next line", without freezing the whole app.
      async authorize(credentials) {
        // Guard: both fields must be filled in.
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        // The values arrive as a loose type, so we tell TypeScript they are
        // strings before using them.
        const email = credentials.email as string;
        const password = credentials.password as string;

        await connectDB(); // make sure the database is connected

        // Look up the account by email.
        const user = await userModel.findOne({ email });
        if (!user) {
          throw new Error("No account found with this email");
        }

        // Block login until they've confirmed their email via the OTP code.
        if (!user.emailVerified) {
          throw new Error("Please verify your email before logging in");
        }

        // IMPORTANT: passwords are never stored as plain text. We stored a
        // scrambled "hash". bcrypt.compare re-scrambles the typed password the
        // same way and checks if it matches the stored hash. It returns
        // true/false — we never un-scramble the original.
        const isMatch = await bcrypt.compare(password, user.password ?? "");
        if (!isMatch) {
          throw new Error("Invalid password");
        }

        // Success! Return the (safe, non-secret) fields to put in the session.
        // Notice we never return the password.
        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),

    // -----------------------------------------------------------------------
    // PROVIDER 2: Google login. NextAuth handles the whole Google popup flow;
    // we just supply our app's Google ID and secret (kept in env variables).
    // -----------------------------------------------------------------------
    // "process.env" is how we read "environment variables" — secret settings
    // (passwords, keys, addresses) kept OUTSIDE the code, usually in a hidden
    // .env file. We keep secrets out of the code so they never get shared by
    // accident. The `?? ""` means: if the secret is missing, use an empty text
    // instead of crashing.
    Google({
      clientId: process.env.AUTH_GOOGLE_ID ?? "",
      clientSecret: process.env.AUTH_GOOGLE_SECRET ?? "",
    }),
  ],

  // -------------------------------------------------------------------------
  // CALLBACKS: small functions NextAuth calls at key moments, letting us add
  // our own custom logic. A "callback" is a function you hand to a library and
  // say "you call this back for me when the right moment arrives" — like leaving
  // your phone number so someone rings you when your table is ready. They run in
  // this order during a login.
  // -------------------------------------------------------------------------
  callbacks: {
    // Runs right after a provider approves a login. Returning true allows the
    // login to continue; false would block it.
    async signIn({ user, account }) {
      if (!user?.email) return false; // no email = we can't proceed

      // Special case for Google: the very first time someone uses Google to
      // log in, they have no record in our database yet, so we create one.
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

    // Runs whenever the JWT "wristband" is created or refreshed. We copy a
    // couple of extra fields (id and role) onto the token so we can read them
    // later without a database trip. (`user` is only present at login time.)
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? token.role;
      }
      return token;
    },

    // Runs whenever the app asks for the current session (e.g. to show the
    // logged-in user's name). We copy id and role from the token onto the
    // session object so our pages and API routes can use them.
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

  // -------------------------------------------------------------------------
  // SESSION SETTINGS
  // -------------------------------------------------------------------------
  session: {
    strategy: "jwt",          // use the wristband approach described above
    maxAge: 60 * 60 * 24 * 7, // stay logged in for 7 days (seconds × ... )
  },

  // The secret is a private key used to digitally "sign" the wristband so
  // nobody can forge or tamper with it. It lives in an env variable.
  secret: process.env.AUTH_SECRET,
});
