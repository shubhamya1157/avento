import { Mail, Phone, MapPin } from "lucide-react";

export default function ContactCards() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-24">
      <div className="grid gap-6 md:grid-cols-3">

        <a
          href="mailto:support@avento.in"
          className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 transition hover:border-white/30"
        >
          <Mail size={32} />
          <h3 className="mt-5 text-2xl font-bold">Email Us</h3>
          <p className="mt-3 text-zinc-400">
            support@avento.in
          </p>
        </a>

        <a
          href="tel:+918619815840"
          className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 transition hover:border-white/30"
        >
          <Phone size={32} />
          <h3 className="mt-5 text-2xl font-bold">Call Us</h3>
          <p className="mt-3 text-zinc-400">
            +91 86198 15840
          </p>
        </a>

        <a
          href="https://maps.google.com/?q=Mumbai,Maharashtra"
          target="_blank"
          className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 transition hover:border-white/30"
        >
          <MapPin size={32} />
          <h3 className="mt-5 text-2xl font-bold">Headquarters</h3>
          <p className="mt-3 text-zinc-400">
            Mumbai, Maharashtra
          </p>
        </a>

      </div>
    </section>
  );
}