// ===========================================================================
// types.d.ts — Adds a `role` field to NextAuth's built-in "User" type
// ===========================================================================
//
// Like global.d.ts, this is a declaration file (types only, no running code).
// NextAuth has a built-in `User` type, but it doesn't include our custom
// `role` field. The augmentation below tells TypeScript that a NextAuth `User`
// also has a `role`, so reading `user.role` in app/auth.ts is type-safe.
//
// IMPORTANT DETAIL: the interface MUST be named `User` with a capital U to
// match NextAuth's real interface. (An earlier version wrote `user` lowercase,
// which silently created a brand-new, unrelated interface and did nothing.)
//
// `role?` is OPTIONAL (the `?`) on purpose: a freshly-created Google user might
// not have a role set at the type level, and the session callback in auth.ts
// may copy across an undefined role. Marking it optional keeps those usages
// type-safe instead of forcing a value that isn't always present.
// ===========================================================================

declare module "next-auth" {
  interface User {
    role?: string;
  }
}

// The empty export makes this file a module so the `declare module` above is
// treated as an augmentation of next-auth rather than a global script.
export {};
