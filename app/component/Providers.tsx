// ===========================================================================
// Providers.tsx — Makes login info available everywhere in the app
// ===========================================================================
//
// 'use client' (the line below) marks this as a "Client Component": code that
// runs in the user's BROWSER, not just on the server. Anything interactive —
// buttons, hooks like useState, login state — must run on the client.
//
// WHAT IS A "PROVIDER"?
// In React, a Provider wraps your whole app and shares some data with every
// component inside it, so you don't have to pass that data down by hand through
// every level. Here, SessionProvider shares the current login session, which
// lets any component call `useSession()` to ask "who is logged in?".
//
// This component is wrapped around everything in app/layout.tsx.
// ===========================================================================

'use client';

import { SessionProvider } from 'next-auth/react';
import React from 'react';

// `children` is whatever this component wraps around — in our case, the entire
// page. We simply place it inside SessionProvider so the login session flows
// down to all of it.
export default function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
