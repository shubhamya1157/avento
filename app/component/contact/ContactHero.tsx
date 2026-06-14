export default function ContactHero() {
  return (
    <section className="relative overflow-hidden border-b border-white/10 pt-40 pb-24">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08),transparent_60%)]" />

      <div className="relative mx-auto max-w-7xl px-6 text-center">
        <p className="mb-6 text-sm uppercase tracking-[0.5em] text-zinc-500">
          Contact Avento
        </p>

        <h1 className="text-6xl font-black md:text-8xl">
          Every Road Has
          <br />
          A Story.
        </h1>

        <p className="mx-auto mt-8 max-w-2xl text-lg text-zinc-400">
          Whether it's a question, a partnership, or your next adventure,
          the Avento team is only one message away.
        </p>
      </div>
    </section>
  )
}