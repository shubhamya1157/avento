export default function StatsSection() {
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