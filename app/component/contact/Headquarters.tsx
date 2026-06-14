import { MapPin, Clock, Building2, ArrowUpRight } from "lucide-react";

export default function Headquarters() {
  return (
    <section className="relative overflow-hidden py-24">

      {/* Background Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05),transparent_70%)]" />

      {/* Giant Background Text */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
        <h1 className="select-none text-[18rem] font-black text-white/[0.02]">
          MUMBAI
        </h1>
      </div>

      <div className="relative mx-auto max-w-7xl px-6">

        {/* Heading */}
        <div className="mb-16 text-center">

          <p className="mb-4 uppercase tracking-[0.5em] text-zinc-500">
            Headquarters
          </p>

          <h2 className="text-5xl font-black md:text-7xl">
            Mumbai, India
          </h2>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-400">
            Building the future of mobility,
            one unforgettable journey at a time.
          </p>

        </div>

        {/* Cards */}
        <div className="grid gap-8 lg:grid-cols-2">

          {/* Left Card */}
          <div
            className="
              relative
              overflow-hidden
              rounded-3xl
              border
              border-white/10
              bg-white/[0.03]
              p-10
              backdrop-blur-xl
            "
          >

            {/* Card Glow */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_50%)]" />

            <div className="relative">

              <div className="mb-8 flex items-center gap-4">
                <Building2 size={32} />

                <h3 className="text-3xl font-bold">
                  Avento Headquarters
                </h3>
              </div>

              <div className="space-y-8">

                <div className="flex items-start gap-4">

                  <MapPin
                    size={22}
                    className="mt-1 text-zinc-400"
                  />

                  <div>

                    <p className="font-semibold">
                      Location
                    </p>

                    <p className="text-zinc-400">
                      Mumbai, Maharashtra, India
                    </p>

                  </div>

                </div>

                <div className="flex items-start gap-4">

                  <Clock
                    size={22}
                    className="mt-1 text-zinc-400"
                  />

                  <div>

                    <p className="font-semibold">
                      Working Hours
                    </p>

                    <p className="text-zinc-400">
                      Monday - Saturday
                      <br />
                      9:00 AM - 7:00 PM
                    </p>

                  </div>

                </div>

              </div>

            </div>

          </div>

          {/* Right Card */}
          <a
            href="https://maps.google.com/?q=Mumbai,Maharashtra"
            target="_blank"
            rel="noopener noreferrer"
            className="
              group
              relative
              overflow-hidden
              rounded-3xl
              border
              border-white/10
              bg-white/[0.03]
              p-10
              backdrop-blur-xl
              transition-all
              duration-500
              hover:border-white/30
              hover:scale-[1.02]
            "
          >

            {/* Glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

            <div className="relative flex h-full flex-col items-center justify-center text-center">

              <MapPin
                size={70}
                className="transition duration-500 group-hover:scale-110"
              />

              <h3 className="mt-8 text-4xl font-bold">
                Mumbai
              </h3>

              <p className="mt-3 text-zinc-400">
                View Headquarters Location
              </p>

              <div className="mt-8 flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-zinc-300">

                Open In Maps

                <ArrowUpRight
                  size={16}
                  className="transition group-hover:translate-x-1 group-hover:-translate-y-1"
                />

              </div>

            </div>

          </a>

        </div>

        {/* Bottom Quote */}
        <div className="mt-20 text-center">

          <p className="mx-auto max-w-3xl text-2xl font-medium text-zinc-300 md:text-3xl">
            "Every destination begins with a journey.
            Every journey begins with a choice."
          </p>

          <p className="mt-4 text-zinc-500">
            — Avento Mobility
          </p>

        </div>

      </div>

    </section>
  );
}