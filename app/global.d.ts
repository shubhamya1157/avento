// ===========================================================================
// global.d.ts — Teaching TypeScript about our EXTRA login fields
// ===========================================================================
//
// A ".d.ts" file is a "declaration file": it contains ONLY type information, no
// running code. Its job is to describe shapes to TypeScript.
//
// WHY THIS FILE EXISTS:
// NextAuth ships with its own built-in types for the session and the JWT token.
// But in app/auth.ts we added two custom fields — `id` and `role` — onto both.
// Out of the box, TypeScript doesn't know about those, so it would complain
// when we read `session.user.id`. The "module augmentation" below tells
// TypeScript: "the existing next-auth types also include these extra fields."
// ===========================================================================

import type { DefaultSession } from "next-auth";

// Augment (extend) the "Session" type from next-auth so its `user` object also
// carries our optional `id` and `role`. `& { ... }` means "the original fields
// PLUS these new ones". The `?` marks them optional.
declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id?: string;
      role?: string;
    };
  }
}

// Do the same for the JWT token type (the login "wristband"), since we stash
// `id` and `role` on it inside the jwt callback in app/auth.ts.
declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
  }
}

// An empty export makes this file a "module", which is required for the
// `declare module` augmentations above to be picked up correctly.
export {};
