import { Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function AboutHero() {
  return (
    <section className="relative min-h-[75vh] flex items-center justify-center overflow-hidden bg-black pt-32 pb-16">
      {/* Premium Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:30px_30px] pointer-events-none" />

      {/* Radial Gradient Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-white/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[300px] h-[300px] rounded-full bg-zinc-800/10 blur-[90px] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 lg:px-24 w-full grid lg:grid-cols-12 gap-12 items-center">
        
        {/* Left Side: Text Content */}
        <div className="lg:col-span-7 space-y-8 text-left">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 backdrop-blur-md">
            <Sparkles size={12} className="text-zinc-400" />
            <span className="text-xs font-semibold tracking-wider text-zinc-300 uppercase">
              The Avento Story
            </span>
          </div>

          {/* Heading */}
          <div className="space-y-4">
            <h1 className="text-5xl sm:text-7xl font-black tracking-tight leading-[0.95] uppercase text-white">
              WE REDEFINE
              <br />
              <span className="bg-gradient-to-r from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent">
                THE WAY YOU MOVE.
              </span>
            </h1>
          </div>

          {/* Description */}
          <p className="max-w-xl text-lg text-zinc-400 leading-relaxed font-light">
            Avento was built on a simple premise: mobility should be a premium, seamless, and inspiring experience. We connect sophisticated drivers with world-class vehicles.
          </p>

          {/* Quick Stats Summary / CTA */}
          <div className="flex flex-wrap items-center gap-6 pt-4">
            <Link
              href="/vehicles"
              className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-xs font-bold text-black hover:bg-zinc-200 transition-all duration-300 hover:scale-105"
            >
              Explore Fleet
              <ArrowRight size={14} />
            </Link>
            <div className="flex gap-8 border-l border-white/10 pl-6 py-2">
              <div>
                <p className="text-xl font-bold text-white">99.8%</p>
                <p className="text-[10px] tracking-wider text-zinc-500 uppercase">Satisfaction</p>
              </div>
              <div>
                <p className="text-xl font-bold text-white">24h</p>
                <p className="text-[10px] tracking-wider text-zinc-500 uppercase">Guaranteed Booking</p>
              </div>
            </div>
          </div>

        </div>

        {/* Right Side: Visual Glass Card */}
        <div className="lg:col-span-5 relative group">
          {/* Outer glow aura */}
          <div className="absolute -inset-1 bg-gradient-to-r from-zinc-700 via-white/10 to-zinc-900 rounded-3xl blur opacity-30 group-hover:opacity-40 transition duration-1000" />
          
          <div className="relative rounded-3xl border border-white/10 bg-zinc-950/40 p-3 backdrop-blur-xl overflow-hidden">
            {/* The Image Container */}
            <div className="relative h-80 sm:h-96 w-full rounded-2xl overflow-hidden">
              <img
                src="/about-hero.jpg"
                alt="Luxury Sports Sedan Showcase"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6">
                <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-zinc-400 bg-black/45 px-2.5 py-1 rounded-md backdrop-blur-sm border border-white/5">
                  FEATURED VEHICLE
                </span>
                <h3 className="text-lg font-bold text-white mt-2">
                  THE AVENTO EXPERIENCE
                </h3>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}