// ===========================================================================
// about/page.tsx — The "/about" page
// ===========================================================================
//
// This whole page is presentational: it just displays text and images, with no
// data fetching and almost no interactivity. It's built from five small
// section components defined right here in the file (AboutHero, WhyAvento,
// StatsSection, VisionSection, AboutCTA), then stacked together at the bottom
// in the exported AboutPage.
//
// Defining each section as its own little function keeps the markup organised
// and easy to scan. The bulk of each section is Tailwind CSS classes (inside
// className="...") that handle layout, colours, spacing, and animations.
// ===========================================================================

import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  Shield,
  Clock,
  CalendarRange,
  MessageSquare,
} from "lucide-react";
import Nav from "@/app/component/Nav";
import Footer from "@/app/component/Footer";

// Section 1: AboutHero — the big intro banner with the headline and a photo.
function AboutHero() {
  return (
    <section className="relative flex items-center overflow-hidden bg-black pt-36 pb-20">
      {/* Premium Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:30px_30px] pointer-events-none" />

      {/* Radial Gradient Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-white/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[300px] h-[300px] rounded-full bg-zinc-800/10 blur-[90px] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 lg:px-24 w-full grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">

        {/* Left Side: Text Content */}
        <div className="lg:col-span-6 space-y-7 text-left">

          {/* Heading */}
          <h1 className="text-5xl sm:text-7xl font-black tracking-tight leading-[0.95] uppercase text-white">
            WE REDEFINE
            <br />
            <span className="bg-gradient-to-r from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent">
              THE WAY YOU MOVE.
            </span>
          </h1>

          {/* Description */}
          <p className="max-w-xl text-lg text-zinc-400 leading-relaxed font-light">
            Avento was built on a simple premise: mobility should be a premium, seamless, and inspiring experience. We connect sophisticated drivers with world-class vehicles.
          </p>

          {/* CTA */}
          <div className="pt-2">
            <Link
              href="/vehicles"
              className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-xs font-bold text-black hover:bg-zinc-200 transition-all duration-300 hover:scale-105"
            >
              Explore Collection
              <ArrowRight size={14} />
            </Link>
          </div>

        </div>

        {/* Right Side: Visual Glass Card */}
        <div className="lg:col-span-6 relative group">
          {/* Ambient glow — warm red tone echoing the car */}
          <div className="absolute -inset-2 rounded-[28px] bg-gradient-to-tr from-red-900/40 via-white/5 to-zinc-900 blur-xl opacity-40 transition duration-1000 group-hover:opacity-70" />

          <div className="relative rounded-3xl border border-white/10 bg-zinc-950/40 p-3 backdrop-blur-xl overflow-hidden">
            {/* The Image Container */}
            <div className="relative h-[360px] sm:h-[460px] lg:h-[540px] w-full rounded-2xl overflow-hidden">
              <img
                src="/about-hero.jpg"
                alt="Red BMW M4 — the Avento collection"
                className="h-full w-full object-cover object-center transition-transform duration-[1200ms] ease-out group-hover:scale-110"
              />

              {/* Cinematic gradient layers */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/10" />

              {/* Cinematic corner framing */}
              <div className="absolute left-4 top-4 h-8 w-8 rounded-tl-lg border-l-2 border-t-2 border-white/40 transition-all duration-500 group-hover:h-10 group-hover:w-10" />
              <div className="absolute right-4 top-4 h-8 w-8 rounded-tr-lg border-r-2 border-t-2 border-white/40 transition-all duration-500 group-hover:h-10 group-hover:w-10" />
              <div className="absolute bottom-4 right-4 h-8 w-8 rounded-br-lg border-b-2 border-r-2 border-white/40 transition-all duration-500 group-hover:h-10 group-hover:w-10" />

              {/* Caption */}
              <div className="absolute bottom-7 left-7 space-y-2.5">
                <div className="h-0.5 w-10 bg-gradient-to-r from-red-500 to-white/60" />
                <h3 className="text-xl font-bold tracking-wide text-white">
                  THE AVENTO EXPERIENCE
                </h3>
                <p className="text-[11px] font-light text-zinc-300">
                  Raw performance, refined for the modern road.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}

// Section 2: WhyAvento — four benefit cards. The card contents live in an
// array, and we loop over it to draw the cards (instead of repeating markup).
function WhyAvento() {
  const cards = [
    {
      icon: Clock,
      tag: "60s Checkout",
      title: "Zero Delay Booking",
      desc: "Reserve your premium ride in under 60 seconds with our optimized digital onboarding process.",
    },
    {
      icon: Sparkles,
      tag: "Curated Fleet",
      title: "Exquisite Selection",
      desc: "Access a handpicked fleet of high-end, professionally maintained luxury and sports vehicles.",
    },
    {
      icon: Shield,
      tag: "Full Coverage",
      title: "Guaranteed Trust",
      desc: "Every booking includes comprehensive coverage and real-time GPS tracking for total peace of mind.",
    },
    {
      icon: CalendarRange,
      tag: "Flexible Terms",
      title: "Fluid Scheduling",
      desc: "Adapt your rental period dynamically. Enjoy daily, weekly, or customized long-term executive options.",
    },
  ];

  return (
    <section className="relative overflow-hidden bg-black text-white py-28 px-6 md:px-12 lg:px-24 border-t border-white/5">
      {/* Ambient background text */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none select-none overflow-hidden">
        <h2 className="text-[16rem] md:text-[22rem] font-black text-white/[0.01] whitespace-nowrap tracking-widest">
          AVENTO
        </h2>
      </div>

      <div className="relative max-w-7xl mx-auto z-10">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-6">
          <div className="space-y-4">
            <span className="uppercase tracking-[0.5em] text-zinc-500 text-xs font-bold block">
              Why Avento
            </span>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight uppercase">
              FREEDOM SHOULDN&apos;T
              <br />
              WAIT FOR PERMISSION.
            </h2>
          </div>
          <p className="max-w-md text-zinc-400 text-sm md:text-base leading-relaxed font-light">
            We exist to remove the friction between you and the open road.
            Transportation should feel inspiring, not complicated.
          </p>
        </div>

        {/* Benefits Grid — one card per item in the `cards` array above. */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {cards.map((card, i) => {
            // Pull the icon component out of the data so we can render it as a
            // tag below. (A capitalised name like `Icon` is required for JSX to
            // treat it as a component rather than a plain HTML tag.)
            const Icon = card.icon;
            return (
              <div
                key={i}
                className="group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-zinc-900/60 to-zinc-950/30 p-8 backdrop-blur-md transition-all duration-500 hover:-translate-y-2 hover:border-white/25"
              >
                {/* Hover glow */}
                <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/[0.05] blur-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                {/* Animated top accent line */}
                <div className="absolute left-0 top-0 h-px w-0 bg-gradient-to-r from-white/70 to-transparent transition-all duration-500 group-hover:w-full" />

                {/* Oversized index number */}
                <span className="pointer-events-none absolute right-5 top-4 text-6xl font-black leading-none text-white/[0.04] transition-colors duration-500 group-hover:text-white/[0.08]">
                  0{i + 1}
                </span>

                {/* Icon */}
                <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-white/15 to-white/[0.02] text-white transition-all duration-500 group-hover:scale-110 group-hover:border-white/25">
                  <Icon size={22} />
                </div>

                <h3 className="relative mt-8 text-lg font-bold tracking-wide text-white">
                  {card.title}
                </h3>

                <p className="relative mt-3 text-xs leading-relaxed text-zinc-500 transition-colors duration-300 group-hover:text-zinc-300">
                  {card.desc}
                </p>

                {/* Footer tag */}
                <div className="relative mt-7 flex items-center gap-2.5 text-[10px] font-bold uppercase tracking-widest text-zinc-600 transition-colors duration-300 group-hover:text-white">
                  <span className="h-px w-6 bg-current transition-all duration-500 group-hover:w-9" />
                  {card.tag}
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}

// Section 3: StatsSection — four big headline numbers (10K+ rides, etc.),
// again driven by an array and a loop.
function StatsSection() {
  const stats = [
    {
      value: "10K+",
      label: "RIDES COMPLETED",
      desc: "Delivering exceptional journeys across major cities.",
    },
    {
      value: "500+",
      label: "VEHICLES",
      desc: "Curated selection of performance and luxury cars.",
    },
    {
      value: "24/7",
      label: "SUPPORT",
      desc: "Round-the-clock concierge support at your service.",
    },
    {
      value: "100%",
      label: "TRUST",
      desc: "Transparent rates, verified fleet, and secure booking.",
    },
  ];

  return (
    <section className="bg-black text-white px-6 md:px-12 lg:px-24 py-28 relative overflow-hidden">
      {/* Background Radial Glow */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-white/[0.02] blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Top Accent Line */}
        <div className="h-px w-full bg-white/10 mb-20" />

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, idx) => (
            <div
              key={idx}
              className="group relative rounded-3xl border border-white/5 bg-zinc-950/30 p-8 backdrop-blur-md overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:border-white/15"
            >
              {/* Subtle hover glow circle in each card */}
              <div className="absolute -right-16 -top-16 h-32 w-32 rounded-full bg-white/[0.01] blur-2xl group-hover:bg-white/[0.04] transition-all duration-500 pointer-events-none" />

              {/* Decorative Corner Anchor lines */}
              <div className="absolute top-0 right-0 h-4 w-px bg-white/10 group-hover:h-8 transition-all duration-300" />
              <div className="absolute top-0 right-0 w-4 h-px bg-white/10 group-hover:w-8 transition-all duration-300" />

              <h2 className="text-6xl md:text-7xl font-black leading-none bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent group-hover:to-white transition-all duration-500">
                {stat.value}
              </h2>

              <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400 group-hover:text-white transition-colors duration-300">
                {stat.label}
              </p>

              <p className="mt-3 text-xs text-zinc-500 leading-relaxed font-light group-hover:text-zinc-400 transition-colors duration-300">
                {stat.desc}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}

// Section 4: VisionSection — two large image "pillars" (luxury & performance).
function VisionSection() {
  const pillars = [
    {
      label: "ELEGANT LUXURY",
      title: "Refinement In Motion",
      desc: "Plush interiors, sophisticated technology, and silent strength. Crafted for those who appreciate the journey as much as the destination.",
      img: "/about-luxury.jpg",
    },
    {
      label: "RAW PERFORMANCE",
      title: "Engineered Thrills",
      desc: "Precision handling, athletic dynamics, and signature exhaust notes. Designed to satisfy your hunger for adrenaline on the asphalt.",
      img: "/about-performance.jpg",
    },
  ];

  return (
    <section className="bg-black text-white px-6 md:px-12 lg:px-24 py-28 relative overflow-hidden">
      {/* Top Divider */}
      <div className="h-px bg-white/10 mb-20" />

      <div className="max-w-7xl mx-auto">
        
        {/* Section Title */}
        <div className="max-w-3xl mb-20 space-y-6">
          <span className="uppercase tracking-[0.5em] text-zinc-500 text-xs font-bold block">
            Our Vision
          </span>
          <h2 className="text-5xl md:text-7xl font-black leading-[0.95] tracking-tight uppercase">
            WE DON&apos;T JUST
            <br />
            MOVE PEOPLE.
            <br />
            <span className="bg-gradient-to-r from-zinc-500 via-zinc-400 to-zinc-300 bg-clip-text text-transparent">
              WE MOVE POSSIBILITIES.
            </span>
          </h2>
          <p className="text-zinc-400 text-sm md:text-base leading-relaxed font-light max-w-xl">
            Avento is built to make every journey feel effortless, premium, and unforgettable. 
            We are creating a future where world-class mobility is immediately accessible.
          </p>
        </div>

        {/* Dual Pillar Visual Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-16">
          {pillars.map((pillar, index) => (
            <div
              key={index}
              className="group relative rounded-[32px] border border-white/5 bg-zinc-950/40 p-4 backdrop-blur-md overflow-hidden flex flex-col h-[520px] justify-between transition-colors duration-500 hover:border-white/10"
            >
              {/* Pillar Image Background */}
              <div className="absolute inset-0 z-0 overflow-hidden rounded-[28px]">
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-700 scale-100 group-hover:scale-[1.03]"
                  style={{ backgroundImage: `url('${pillar.img}')` }}
                />
                {/* Cinematic Overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors duration-500" />
              </div>

              {/* Top Row: Label */}
              <div className="relative z-10 p-4 flex justify-between items-center">
                <span className="text-[10px] tracking-[0.2em] font-bold text-zinc-400 bg-black/45 px-3 py-1.5 rounded-full border border-white/5">
                  {pillar.label}
                </span>
              </div>

              {/* Bottom Row: Content */}
              <div className="relative z-10 p-4 md:p-8 space-y-4">
                <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white">
                  {pillar.title}
                </h3>
                <p className="text-xs text-zinc-300 leading-relaxed font-light max-w-md">
                  {pillar.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}

// Section 5: AboutCTA — the closing "call to action" with two buttons that
// send the visitor to the vehicles and contact pages. (CTA = Call To Action:
// the part that invites the user to take the next step.)
function AboutCTA() {
  return (
    <section className="bg-black text-white py-28 px-6 md:px-12 lg:px-24 relative overflow-hidden">
      {/* Background Radial Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_0%,transparent_70%)] pointer-events-none" />

      <div className="max-w-5xl mx-auto text-center relative z-10 space-y-10">
        
        {/* Accent Diamond */}
        <div className="flex justify-center">
          <div className="h-10 w-px bg-gradient-to-b from-transparent to-white" />
        </div>

        {/* Small Tagline */}
        <span className="uppercase tracking-[0.4em] text-zinc-500 text-xs font-bold block">
          Start Your Journey
        </span>

        {/* Main Header */}
        <h2 className="text-4xl sm:text-6xl font-black tracking-tight uppercase leading-none max-w-4xl mx-auto">
          READY TO EXPERIENCE
          <br />
          <span className="bg-gradient-to-r from-white via-zinc-300 to-zinc-600 bg-clip-text text-transparent">
            THE AVENTO DIFFERENCE?
          </span>
        </h2>

        {/* Supporting description */}
        <p className="max-w-lg mx-auto text-sm text-zinc-400 leading-relaxed font-light">
          Whether you are looking for executive business transport, weekend thrills, 
          or custom luxury travel solutions—we have the ideal vehicle waiting.
        </p>

        {/* Dual Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-6">
          <Link
            href="/vehicles"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-xs font-bold text-black hover:bg-zinc-200 transition-all duration-300 hover:scale-105"
          >
            Explore Collection
            <ArrowRight size={14} />
          </Link>
          
          <Link
            href="/contact"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-8 py-4 text-xs font-bold text-white hover:bg-white/10 transition-all duration-300 hover:scale-105"
          >
            Connect Now
            <MessageSquare size={14} className="text-zinc-400" />
          </Link>
        </div>

      </div>
    </section>
  );
}

// The page itself: stack the navigation bar, the five sections in order, and
// the footer. This is the component Next.js actually renders for "/about".
export default function AboutPage() {
  return (
    <>
      <Nav />

      <main className="bg-black text-white">
        <AboutHero />
        <WhyAvento />
        <StatsSection />
        <VisionSection />
        <AboutCTA />
      </main>

      <Footer />
    </>
  );
}