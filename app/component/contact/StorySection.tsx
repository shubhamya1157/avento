export default function StorySection() {
  return (
    <section className="relative overflow-hidden border-t border-white/10 py-32">

      {/* Background Word */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <h1 className="select-none text-[14rem] md:text-[20rem] font-black text-white/[0.02]">
          FREEDOM
        </h1>
      </div>

      <div className="relative mx-auto max-w-6xl px-6">

        {/* Label */}
        <div className="text-center">
          <p className="mb-10 text-sm uppercase tracking-[0.6em] text-zinc-500">
            OUR PHILOSOPHY
          </p>
        </div>

        {/* Main Statement */}
        <div className="text-center">

          <h2 className="text-5xl md:text-8xl font-black leading-[0.95]">

            We Don't Rent

            <br />

            Vehicles.

          </h2>

          <h3 className="mt-6 text-4xl md:text-7xl font-black text-zinc-500">

            We Create Freedom.

          </h3>

        </div>

        {/* Divider */}
        <div className="mx-auto mt-14 h-px w-32 bg-gradient-to-r from-transparent via-white/30 to-transparent" />

        {/* Supporting Text */}
        <div className="mx-auto mt-14 max-w-3xl text-center">

          <p className="text-xl md:text-2xl leading-relaxed text-zinc-300">

            Every booking is more than transportation.

            It is the spontaneous road trip,
            the sunrise drive,
            the unexpected adventure,
            and the memories waiting beyond the horizon.

          </p>

        </div>

        {/* Quote Card */}
        <div className="mx-auto mt-20 max-w-4xl">

          <div className="
            rounded-[32px]
            border
            border-white/10
            bg-white/[0.03]
            p-10
            backdrop-blur-xl
          ">

            <p className="text-sm uppercase tracking-[0.5em] text-zinc-500">
              AVENTO
            </p>

            <h4 className="mt-6 text-3xl md:text-5xl font-bold leading-tight">

              “The best stories
              are never planned.”

            </h4>

            <p className="mt-6 text-lg text-zinc-400">

              They begin with a road,
              a destination,
              and the freedom to choose your own path.

            </p>

          </div>

        </div>

      </div>

    </section>
  );
}