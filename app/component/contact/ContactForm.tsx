export default function ContactForm() {
  return (
    <section className="relative py-28">

      <div className="mx-auto max-w-7xl px-6">

        <div className="grid gap-16 lg:grid-cols-2">

          {/* Left */}

          <div>

            <p className="mb-4 uppercase tracking-[0.4em] text-zinc-500">
              Start The Conversation
            </p>

            <h2 className="text-5xl md:text-7xl font-black leading-none">
              Let's Build
              <br />
              Something Great.
            </h2>

            <p className="mt-8 max-w-lg text-lg text-zinc-400 leading-8">
              Questions, feedback, partnerships,
              or simply want to know more about Avento?

              We're listening.
            </p>

          </div>

          {/* Right */}

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-xl">

            <form className="space-y-5">

              <input
                type="text"
                placeholder="Full Name"
                className="w-full rounded-xl border border-white/10 bg-black/50 p-4 outline-none focus:border-white/30"
              />

              <input
                type="email"
                placeholder="Email Address"
                className="w-full rounded-xl border border-white/10 bg-black/50 p-4 outline-none focus:border-white/30"
              />

              <input
                type="tel"
                placeholder="Phone Number"
                className="w-full rounded-xl border border-white/10 bg-black/50 p-4 outline-none focus:border-white/30"
              />

              <input
                type="text"
                placeholder="Subject"
                className="w-full rounded-xl border border-white/10 bg-black/50 p-4 outline-none focus:border-white/30"
              />

              <textarea
                rows={6}
                placeholder="Your Message"
                className="w-full rounded-xl border border-white/10 bg-black/50 p-4 outline-none focus:border-white/30"
              />

              <button
                className="w-full rounded-xl bg-white py-4 font-semibold text-black transition hover:scale-[1.02]"
              >
                Send Message →
              </button>

            </form>

          </div>

        </div>

      </div>

    </section>
  )
}