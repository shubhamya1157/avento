// ===========================================================================
// LegalPage.tsx — One shared layout for our legal/policy pages
// ===========================================================================
//
// Terms of Service, Privacy Policy and Rental Terms all look the SAME: a premium
// header (a little kicker label, a big title, a one-line intro, and a "last
// updated" date) followed by a column of headed text sections. Rather than
// rebuild that three times, each of those pages just hands this component its
// own words and we render them identically.
//
// It's a SERVER component (no 'use client' line) because it's pure text — there
// is nothing interactive here. It still renders the shared <Nav> and <Footer>
// so the page feels like the rest of the site.
//
// Props (the inputs each page hands in):
//   - eyebrow:  the small spaced-out label above the title (e.g. "Legal")
//   - title:    the big page heading (e.g. "Terms of Service")
//   - intro:    a short sentence under the title describing the page
//   - updated:  a human "last updated" date string (e.g. "June 22, 2026")
//   - sections: the body — a list of { heading, body } where `body` is an array
//               of paragraphs (each string becomes its own <p>).
// ===========================================================================

import Nav from "@/app/component/Nav";
import Footer from "@/app/component/Footer";

// The shape of one section of the document: a sub-heading plus one or more
// paragraphs of text underneath it.
export interface LegalSection {
  heading: string;
  body: string[];
}

export default function LegalPage({
  eyebrow,
  title,
  intro,
  updated,
  sections,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  updated: string;
  sections: LegalSection[];
}) {
  return (
    <>
      <Nav />

      <main className="relative min-h-screen bg-black text-white">
        {/* Faint premium grid backdrop, echoing the About/Home pages. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:30px_30px]" />
        <div className="pointer-events-none absolute left-1/2 top-24 h-[300px] w-[500px] -translate-x-1/2 rounded-full bg-white/5 blur-[120px]" />

        <div className="relative z-10 mx-auto max-w-3xl px-6 pb-28 pt-36 md:px-8">
          {/* ---- Header ---- */}
          <header className="space-y-4 border-b border-white/10 pb-12">
            <span className="block text-xs font-bold uppercase tracking-[0.4em] text-zinc-500">
              {eyebrow}
            </span>
            <h1 className="text-4xl font-black uppercase tracking-tight md:text-5xl">{title}</h1>
            <p className="max-w-xl text-sm font-light leading-relaxed text-zinc-400">{intro}</p>
            <p className="text-xs text-zinc-600">Last updated: {updated}</p>
          </header>

          {/* ---- Body sections ----
              We loop over the sections this page passed in and draw each one as
              a numbered heading followed by its paragraphs. `i` is the section's
              position (0,1,2,…); we show it as "01", "02" for a tidy premium feel. */}
          <div className="mt-14 space-y-12">
            {sections.map((section, i) => (
              <section key={section.heading} className="space-y-4">
                <h2 className="flex items-baseline gap-3 text-lg font-bold tracking-tight text-white">
                  <span className="text-xs font-black text-zinc-600">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {section.heading}
                </h2>
                {/* One <p> per paragraph string in this section's body. */}
                {section.body.map((paragraph, p) => (
                  <p key={p} className="text-sm font-light leading-relaxed text-zinc-400">
                    {paragraph}
                  </p>
                ))}
              </section>
            ))}
          </div>

          {/* ---- Foot note ---- */}
          <p className="mt-16 border-t border-white/10 pt-8 text-xs leading-relaxed text-zinc-600">
            Questions about this document? Reach our team at{" "}
            <a href="mailto:support@avento.com" className="text-zinc-400 underline-offset-2 hover:text-white hover:underline">
              support@avento.com
            </a>
            .
          </p>
        </div>
      </main>

      <Footer />
    </>
  );
}
