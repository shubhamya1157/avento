export default function Footer() {
  return (
    <footer className="border-t border-white/10 py-12">
      <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row justify-between gap-6">

        <div>
          <h2 className="text-2xl font-black tracking-[0.3em]">
            AVENTO
          </h2>

          <p className="mt-2 text-zinc-500">
            Where Every Journey Tells A Story.
          </p>
        </div>

        <div>
          <p>support@avento.in</p>
          <p>+91 86198 15840</p>
          <p className="text-zinc-500">
            Mumbai, Maharashtra
          </p>
        </div>

      </div>
    </footer>
  );
}