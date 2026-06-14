import { Shield, Sparkles, Clock, CalendarRange } from "lucide-react";

export default function WhyAvento() {
  const cards = [
    {
      icon: Clock,
      title: "Zero Delay Booking",
      desc: "Reserve your premium ride in under 60 seconds with our optimized digital onboarding process.",
    },
    {
      icon: Sparkles,
      title: "Exquisite Selection",
      desc: "Access a handpicked fleet of high-end, professionally maintained luxury and sports vehicles.",
    },
    {
      icon: Shield,
      title: "Guaranteed Trust",
      desc: "Every booking includes comprehensive coverage and real-time GPS tracking for total peace of mind.",
    },
    {
      icon: CalendarRange,
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
              FREEDOM SHOULDN'T
              <br />
              WAIT FOR PERMISSION.
            </h2>
          </div>
          <p className="max-w-md text-zinc-400 text-sm md:text-base leading-relaxed font-light">
            We exist to remove the friction between you and the open road.
            Transportation should feel inspiring, not complicated.
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {cards.map((card, i) => {
            const Icon = card.icon;
            return (
              <div
                key={i}
                className="group rounded-3xl border border-white/5 bg-zinc-900/10 p-8 backdrop-blur-md transition-all duration-300 hover:-translate-y-2 hover:border-white/20"
              >
                {/* Icon Circle */}
                <div className="h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center text-zinc-400 group-hover:text-white group-hover:bg-white/10 transition-all duration-300">
                  <Icon size={20} />
                </div>

                <h3 className="mt-8 text-lg font-bold text-white tracking-wide">
                  {card.title}
                </h3>
                
                <p className="mt-3 text-xs text-zinc-500 leading-relaxed group-hover:text-zinc-400 transition-colors duration-300">
                  {card.desc}
                </p>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}