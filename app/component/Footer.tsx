// ===========================================================================
// Footer.tsx — The footer shown at the bottom of every page
// ===========================================================================
//
// The footer holds the newsletter sign-up bar, four columns of links (brand,
// directory, categories, contact), the social icons, and the copyright line.
// It's almost all presentational (styling + links). A few notes:
//   - Social icons are drawn as inline <svg> shapes (hand-drawn paths).
//   - `target="_blank"` opens links in a new tab; `rel="noopener noreferrer"`
//     is a safety/privacy best-practice that goes with external new-tab links.
//   - The newsletter form's onSubmit just calls preventDefault() — it stops the
//     page reload but doesn't send anywhere yet (no backend wired up for it).
// ===========================================================================

// 'use client' = this runs in the visitor's browser. (See Providers.tsx for the
// full explanation.) The footer needs it because the newsletter form reacts to
// a click.
'use client';

// "import" borrows tools made elsewhere.
import Link from "next/link";                 // Next.js's fast in-app link, for internal pages
import { Mail, Phone, MapPin } from "lucide-react"; // ready-made icon shapes

// A "component" is a reusable piece of screen written as a function returning
// markup. This one is the whole page footer.
export default function Footer() {
  // new Date() makes an object holding the current date and time; .getFullYear()
  // pulls just the year out of it (e.g. 2026). We store it so the copyright text
  // below always shows this year on its own.
  // Compute the current year so the copyright text updates itself every year
  // instead of being hard-coded.
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative bg-zinc-950 border-t border-white/5 text-zinc-400 py-20 px-6 md:px-12 lg:px-24 overflow-hidden">
      {/* Ambient Glow */}
      <div className="absolute -bottom-24 left-1/3 h-[300px] w-[600px] rounded-full bg-white/[0.02] blur-[120px] pointer-events-none" />
      <div className="absolute -top-24 -left-24 h-[300px] w-[300px] rounded-full bg-white/[0.01] blur-[120px] pointer-events-none" />

      {/* Top Horizontal Newsletter CTA Banner — a "subscribe with your email"
          strip. The form is decorative for now (see note at top of file). */}
      <div className="mx-auto max-w-7xl border-b border-white/5 pb-12 mb-12 flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
        <div className="max-w-md space-y-2 text-center md:text-left">
          <h3 className="font-bold text-white text-lg tracking-tight">SUBSCRIBE TO AVENTO ELITE</h3>
          <p className="text-xs text-zinc-500 leading-relaxed">Get private fleet availability updates, special weekend offers, and new luxury release announcements.</p>
        </div>
        {/* A <form> groups inputs that get "submitted" together. onSubmit runs
            when the user presses Subscribe. `e` is the event (the click itself);
            e.preventDefault() cancels the browser's default action of reloading
            the page, so nothing jumps. Right now it does nothing else — there's
            no backend wired up to actually save the email yet. */}
        <form onSubmit={(e) => e.preventDefault()} className="flex gap-3 w-full max-w-md">
          <div className="relative flex-1">
            <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            {/* <input> is a typed-in field. type="email" hints it expects an
                email; placeholder is the faint hint text; `required` stops
                submission if it's left empty. */}
            <input
              type="email"
              placeholder="Enter your email address"
              required
              className="w-full rounded-xl border border-white/5 bg-white/5 py-3 pl-9 pr-4 text-xs text-white placeholder-zinc-600 outline-none focus:border-white/20 focus:bg-white/[0.08] transition-all"
            />
          </div>
          <button
            type="submit"
            className="flex h-[40px] px-6 items-center justify-center rounded-xl bg-white text-xs font-bold text-black hover:bg-zinc-200 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
          >
            Subscribe
          </button>
        </form>
      </div>

      {/* Main Grid */}
      <div className="mx-auto max-w-7xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 relative z-10">
        
        {/* Brand column */}
        <div className="space-y-6">
          <Link href="/">
            <h2 className="cursor-pointer bg-gradient-to-r from-white via-zinc-200 to-zinc-500 bg-clip-text text-2xl font-black tracking-[0.3em] text-transparent">
              AVENTO
            </h2>
          </Link>
          <p className="text-xs leading-relaxed text-zinc-500 max-w-xs">
            A curated collection of elite luxury vehicles, delivering seamless booking experiences and unforgettable journeys wherever the road leads.
          </p>
          {/* The social icons. These use plain <a> tags (not <Link>) because
              they point OUTSIDE our app to other websites. <Link> is for jumping
              between our own pages; <a> is the standard web link for everything
              else. Each <svg> below is a tiny hand-drawn icon shape. */}
          <div className="flex gap-3 pt-2">
            <a href="https://linkedin.com/in/shubhamya1157" target="_blank" rel="noopener noreferrer" className="h-9 w-9 rounded-xl border border-white/5 bg-white/5 flex items-center justify-center text-zinc-500 hover:text-white hover:border-white/20 hover:scale-105 transition-all duration-300" aria-label="LinkedIn">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
                <rect x="2" y="9" width="4" height="12"></rect>
                <circle cx="4" cy="4" r="2"></circle>
              </svg>
            </a>
            <a href="https://github.com/shubhamya1157" target="_blank" rel="noopener noreferrer" className="h-9 w-9 rounded-xl border border-white/5 bg-white/5 flex items-center justify-center text-zinc-500 hover:text-white hover:border-white/20 hover:scale-105 transition-all duration-300" aria-label="GitHub">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
              </svg>
            </a>
            <a href="https://x.com/shubhamya1157" target="_blank" rel="noopener noreferrer" className="h-9 w-9 rounded-xl border border-white/5 bg-white/5 flex items-center justify-center text-zinc-500 hover:text-white hover:border-white/20 hover:scale-105 transition-all duration-300" aria-label="X">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4l11.733 16h4.267l-11.733 -16z"></path>
                <path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772"></path>
              </svg>
            </a>
            <a href="mailto:support@avento.com" className="h-9 w-9 rounded-xl border border-white/5 bg-white/5 flex items-center justify-center text-zinc-500 hover:text-white hover:border-white/20 hover:scale-105 transition-all duration-300" aria-label="Email">
              <Mail className="h-4 w-4" />
            </a>
            <a href="https://instagram.com/shubhamya1157" target="_blank" rel="noopener noreferrer" className="h-9 w-9 rounded-xl border border-white/5 bg-white/5 flex items-center justify-center text-zinc-500 hover:text-white hover:border-white/20 hover:scale-105 transition-all duration-300" aria-label="Instagram">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
              </svg>
            </a>
          </div>
        </div>

        {/* Directory links */}
        <div className="space-y-6">
          <h4 className="font-bold text-white uppercase tracking-wider text-xs">Avento Directory</h4>
          <ul className="space-y-3 text-xs text-zinc-500">
            <li>
              <Link href="/" className="hover:text-white transition-colors duration-300">Home Dashboard</Link>
            </li>
            <li>
              <Link href="/vehicles" className="hover:text-white transition-colors duration-300">Fleet Vehicles</Link>
            </li>
            <li>
              <Link href="/about" className="hover:text-white transition-colors duration-300">About The Brand</Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-white transition-colors duration-300">Contact / FAQ</Link>
            </li>
          </ul>
        </div>

        {/* Fleet types links */}
        <div className="space-y-6">
          <h4 className="font-bold text-white uppercase tracking-wider text-xs">Our Categories</h4>
          <ul className="space-y-3 text-xs text-zinc-500">
            <li>
              <Link href="/vehicles?type=car" className="hover:text-white transition-colors duration-300">Elite Luxury Cars</Link>
            </li>
            <li>
              <Link href="/vehicles?type=bike" className="hover:text-white transition-colors duration-300">Cruiser & Super-Bikes</Link>
            </li>
            <li>
              <Link href="/vehicles?type=suv" className="hover:text-white transition-colors duration-300">Offroad & Luxury SUVs</Link>
            </li>
          </ul>
        </div>

        {/* Clickable Contacts Column */}
        <div className="space-y-6">
          <h4 className="font-bold text-white uppercase tracking-wider text-xs">Get In Touch</h4>
          <div className="space-y-4 text-xs text-zinc-500">
            <a
              href="https://maps.google.com/?q=Mumbai,Maharashtra"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 hover:text-white transition-all duration-300 group"
            >
              <MapPin size={16} className="text-zinc-500 group-hover:text-white transition-all duration-300 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-zinc-400 group-hover:text-white transition-colors">Avento India HQ</p>
                <p className="mt-0.5">Mumbai, Maharashtra, India</p>
              </div>
            </a>
            {/* "tel:" links open the phone dialer on a mobile device.
                (Similarly, "mailto:" links below open the user's email app.) */}
            <a
              href="tel:+918619815840"
              className="flex items-start gap-3 hover:text-white transition-all duration-300 group"
            >
              <Phone size={16} className="text-zinc-500 group-hover:text-white transition-all duration-300 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-zinc-400 group-hover:text-white transition-colors">Call Support</p>
                <p className="mt-0.5">+91 86198 15840</p>
              </div>
            </a>
            <a
              href="mailto:support@avento.com"
              className="flex items-start gap-3 hover:text-white transition-all duration-300 group"
            >
              <Mail size={16} className="text-zinc-500 group-hover:text-white transition-all duration-300 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-zinc-400 group-hover:text-white transition-colors">Email Support</p>
                <p className="mt-0.5">support@avento.com</p>
              </div>
            </a>
          </div>
        </div>

      </div>

      <div className="mx-auto max-w-7xl mt-16 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-600 gap-4 relative z-10">
        <p>© {currentYear} Avento Inc. All rights reserved.</p>
        {/* These point to real in-app pages now, so they use <Link> (fast
            client navigation) instead of an href="#" that just jumped to top. */}
        <div className="flex gap-6">
          <Link href="/terms" className="hover:text-zinc-400 transition-colors duration-300">Terms of Service</Link>
          <Link href="/privacy" className="hover:text-zinc-400 transition-colors duration-300">Privacy Policy</Link>
          <Link href="/rental-terms" className="hover:text-zinc-400 transition-colors duration-300">Rental Terms</Link>
        </div>
      </div>
    </footer>
  );
}
