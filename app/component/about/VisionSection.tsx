export default function VisionSection() {
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
            WE DON'T JUST
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