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
// The floating help chat bubble, shown on every page (see ChatWidget.tsx).
import ChatWidget from './ChatWidget';
// Keeps signed-in admins inside the admin panel, off the public site.
import AdminGate from './AdminGate';

// `children` is a special prop: it's whatever JSX you put BETWEEN this
// component's opening and closing tags. In our case that's the entire page.
// The part after the colon — { children: React.ReactNode } — is TypeScript
// describing the input: "children is React.ReactNode", meaning any drawable
// content (text, tags, other components). It's just a safety label.
// We simply place children inside SessionProvider so the login session flows
// down to all of it. The { } around children switch from JSX into JavaScript so
// we can drop the value in.
export default function Providers({ children }: { children: React.ReactNode }) {
  // We render the page (children) plus the floating ChatWidget side by side
  // inside the SessionProvider, so the widget can also read the login session
  // and shows up on every page of the app.
  return (
    <SessionProvider>
      {/* AdminGate decides whether to show the page or bounce an admin back to
          the panel; it wraps children so the public page can be swapped out. */}
      <AdminGate>{children}</AdminGate>
      <ChatWidget />
    </SessionProvider>
  );
}
