// ===========================================================================
// contact/page.tsx — The "/contact" page: contact info, a form, and FAQs
// ===========================================================================
//
// Like every page.tsx, the folder name ("contact") becomes the web address, so
// this shows at "/contact".
//
// This page lets a visitor send a message and read frequently asked questions.
// It's interactive, so it needs "state". State is a component's MEMORY: values
// the page remembers, and when they change the screen automatically redraws to
// match. (Think of state like the number on a scoreboard — change the number and
// the display updates by itself.) This page remembers:
//   - formState: holds every field of the contact form in one object.
//   - isSubmitting / submitted: control the button spinner and the thank-you
//     screen after sending.
//   - openFaq: which FAQ item is currently expanded (an "accordion" = a list of
//     rows where clicking a row slides its answer open, like a folding ladder).
//
// NOTE: the form doesn't really email anyone yet — handleSubmit just waits 1.5s
// to mimic a network request, then shows the success screen. Wiring it to a
// real backend would be the next step.
// ===========================================================================

// "use client" tells Next.js this page runs in the visitor's BROWSER, not only
// on the server. Pages that remember state or respond to clicks need to be
// "client" components, so any interactive page starts with this line.
"use client";

// useState is a "hook" — a special helper function from React whose name starts
// with "use". This one creates a piece of state (a remembered value) for us.
import { useState } from "react";
import Nav from "@/app/component/Nav";
import Footer from "@/app/component/Footer";
// framer-motion is an animation library. `motion` makes elements that can slide
// and fade; `AnimatePresence` animates them nicely as they appear/disappear.
import { motion, AnimatePresence } from "framer-motion";
// Icon pictures used around the page (email, phone, map pin, etc.).
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  Building2,
  ArrowUpRight,
  Send,
  CheckCircle,
  ChevronDown,
} from "lucide-react";

// "export default" = the one main thing this file hands out; Next.js renders it
// as the /contact page.
export default function ContactPage() {
  // useState gives back a PAIR: [the current value, a function to change it].
  // The "const [a, b] = ..." syntax just names both halves of that pair at once.
  // So formState = the current value; setFormState = the only correct way to
  // change it (changing it via setFormState is what triggers a redraw).
  //
  // All five form fields live together in one state object. To update just one,
  // we spread the old object and overwrite that single key (see the inputs).
  const [formState, setFormState] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  // Two simple true/false memories. useState(false) means "start out false".
  const [isSubmitting, setIsSubmitting] = useState(false); // true while "sending"
  const [submitted, setSubmitted] = useState(false);       // true once sent
  // Which FAQ is open. The "<number | null>" is TypeScript saying this value is
  // either a number (a position/index) OR null (nothing open). It starts at 0,
  // so the first question is open by default.
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // The FAQ content, kept as an array so we can loop over it to draw the list.
  const faqs = [
    {
      question: "How quickly will Avento respond?",
      answer:
        "Our dedicated support team reviews all inquiries promptly. You can expect a response within 24 hours of submission.",
    },
    {
      question: "Can I partner with Avento?",
      answer:
        "Absolutely. We are always looking to expand our premium network. We welcome discussions with fleet owners, luxury automotive brands, and corporate partners.",
    },
    {
      question:
        "Do you offer corporate or long-term rental business solutions?",
      answer:
        "Yes. Avento offers customized corporate accounts, long-term leasing options, and executive mobility solutions tailored to your business needs.",
    },
    {
      question: "What areas do you currently serve?",
      answer:
        "While our primary headquarters is in Mumbai, India, our premium fleet booking and logistics support extend across multiple metropolitan hubs. Contact us to verify delivery in your area.",
    },
  ];

  // Handle the form submission. This runs when the visitor presses "Send".
  // Right now it FAKES a server call: it shows the spinner, waits 1.5 seconds,
  // then switches to the success screen.
  //
  // "async" marks a function that does slow work (like waiting or talking to a
  // server) without freezing the page. Inside an async function, "await" means
  // "pause right here until this finishes, then continue". A "Promise" is a
  // stand-in for a result that isn't ready yet — like a pizza order ticket you
  // hold while the pizza cooks. Here, new Promise + setTimeout makes a promise
  // that finishes after 1500 milliseconds (1.5 seconds), so "await" simply
  // pauses for 1.5s.
  //   - Input: e, the form's submit event (carries info about what happened).
  //   - Output: nothing returned; it just updates state to drive the screen.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // stop the browser's default page reload on submit
    setIsSubmitting(true);   // flip to "sending..." (button shows a busy label)
    // Simulate api submission (pretend we sent the message to a server).
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsSubmitting(false);  // done waiting
    setSubmitted(true);      // show the thank-you screen
  };

  return (
    <>
      <Nav />

      <main className="min-h-screen bg-black text-white pt-32 pb-20 relative overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-1/4 left-1/4 h-[35rem] w-[35rem] rounded-full bg-white/5 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 h-[35rem] w-[35rem] rounded-full bg-white/5 blur-[120px] pointer-events-none" />

        <div className="mx-auto max-w-7xl px-6 md:px-12 lg:px-24 relative z-10">
          {/* Header Hero Section */}
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-20">
            <span className="text-xs uppercase tracking-[0.6em] text-zinc-500 font-bold block">
              Get In Touch
            </span>
            <h1 className="text-5xl sm:text-7xl font-black tracking-tight leading-none bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent">
              LET&apos;S START THE CONVERSATION
            </h1>
            <p className="text-zinc-400 text-sm sm:text-base max-w-lg mx-auto leading-relaxed">
              Every destination begins with a conversation. Share your vision
              with Avento, and together we&apos;ll craft a journey that&apos;s remembered
              long after the road ends.
            </p>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">
            {/* Left Column: Quick Contact & Headquarters Info (5 cols) */}
            <div className="lg:col-span-5 space-y-8 flex flex-col justify-between">
              {/* Quick Contacts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <a
                  href="mailto:shubhamya.1157@gmail.com"
                  className="group rounded-3xl border border-white/5 bg-zinc-900/25 p-6 backdrop-blur-md transition-all duration-300 hover:border-white/10 hover:scale-[1.01]"
                >
                  <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center text-zinc-400 group-hover:text-white transition-colors">
                    <Mail size={18} />
                  </div>
                  <h3 className="mt-4 font-bold text-sm text-white">
                    Email Us
                  </h3>
                  <p className="mt-1 text-xs text-zinc-500 group-hover:text-zinc-400 transition-colors break-words">
                    support@avento.com
                  </p>
                </a>

                <a
                  href="tel:+918619815840"
                  className="group rounded-3xl border border-white/5 bg-zinc-900/25 p-6 backdrop-blur-md transition-all duration-300 hover:border-white/10 hover:scale-[1.01]"
                >
                  <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center text-zinc-400 group-hover:text-white transition-colors">
                    <Phone size={18} />
                  </div>
                  <h3 className="mt-4 font-bold text-sm text-white">Call Us</h3>
                  <p className="mt-1 text-xs text-zinc-500 group-hover:text-zinc-400 transition-colors">
                    +91 86198 15840
                  </p>
                </a>
              </div>

              {/* Headquarters Details Card */}
              <div className="rounded-3xl border border-white/5 bg-zinc-900/25 p-8 backdrop-blur-md space-y-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 h-32 w-32 bg-white/[0.02] rounded-bl-full pointer-events-none" />

                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center text-zinc-400">
                    <Building2 size={18} />
                  </div>
                  <h3 className="font-bold text-lg text-white">
                    Avento India HQ
                  </h3>
                </div>

                <div className="space-y-4 text-xs text-zinc-400">
                  <div className="flex items-start gap-3">
                    <MapPin
                      size={16}
                      className="text-zinc-500 shrink-0 mt-0.5"
                    />
                    <div>
                      <p className="font-semibold text-white">Office Address</p>
                      <p className="mt-0.5">Mumbai, Maharashtra, India</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Clock
                      size={16}
                      className="text-zinc-500 shrink-0 mt-0.5"
                    />
                    <div>
                      <p className="font-semibold text-white">Working Hours</p>
                      <p className="mt-0.5">Monday - Saturday</p>
                      <p className="text-zinc-500">9:00 AM - 7:00 PM IST</p>
                    </div>
                  </div>
                </div>

                <a
                  href="https://maps.google.com/?q=Mumbai,Maharashtra"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between w-full rounded-2xl border border-white/5 bg-white/5 py-4 px-5 text-xs text-white hover:bg-white/10 hover:border-white/10 transition-all group"
                >
                  <span className="font-semibold flex items-center gap-2">
                    <MapPin size={14} className="text-zinc-400" />
                    Open in Google Maps
                  </span>
                  <ArrowUpRight
                    size={14}
                    className="text-zinc-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
                  />
                </a>
              </div>
            </div>

            {/* Right Column: Headquarters Visual Image Card (7 cols) */}
            <div className="lg:col-span-7 h-full">
              <div className="rounded-3xl border border-white/5 bg-zinc-900/25 overflow-hidden backdrop-blur-md group h-full flex flex-col justify-between min-h-[450px] relative">
                <div className="relative flex-grow w-full h-full min-h-[450px]">
                  <img
                    src="/HeadQuater.png"
                    alt="Avento Headquarters"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                  <div className="absolute bottom-6 left-8">
                    <h4 className="text-lg font-bold text-white mt-1">
                      AVENTO MUMBAI HQ
                    </h4>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Send Message Form Section. We show the FORM until `submitted` is
              true, then swap it for a thank-you message (the ternary below).
              A "ternary" is a compact if/else written as: condition ? A : B —
              read it as "if condition then A, otherwise B". Below, the condition
              is !submitted ("not submitted yet"): if true show the form, else (B,
              after the ":" far down) show the success screen. The "!" means
              "not", so !submitted is true while the message has NOT been sent. */}
          <div className="mt-16 max-w-4xl mx-auto">
            <div className="rounded-3xl border border-white/5 bg-zinc-900/25 p-8 md:p-12 backdrop-blur-md relative">
              {!submitted ? (
                <div>
                  <h3 className="text-2xl font-bold mb-2">Send a Message</h3>
                  <p className="text-xs text-zinc-500 mb-8">
                    Fill out the form below and our agents will get back to
                    you shortly.
                  </p>

                  {/* <form>'s onSubmit runs our handleSubmit when the user
                      presses Send (or hits Enter). "onSubmit={...}" wires the
                      event to the function. */}
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">
                          Full Name
                        </label>
                        {/* Each input updates ONE key of formState. The "..."
                            is the "spread" operator: it pours all the existing
                            fields into a fresh object. So
                            { ...formState, name: e.target.value } means: copy
                            every existing field, then overwrite just `name`. We
                            must build a brand-new object (not edit the old one)
                            because that's how React notices a change and redraws.
                            "value=..." keeps the box showing the stored text, and
                            "onChange" fires on every keystroke; e.target.value is
                            whatever the user has typed. The other four inputs
                            follow the exact same pattern. */}
                        <input
                          type="text"
                          required
                          value={formState.name}
                          onChange={(e) =>
                            setFormState({
                              ...formState,
                              name: e.target.value,
                            })
                          }
                          placeholder="e.g. Shubham Yadav"
                          className="w-full rounded-xl border border-white/5 bg-white/5 p-4 text-sm text-white placeholder-zinc-700 outline-none transition-all focus:border-white/20 focus:bg-white/[0.08]"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">
                          Email Address
                        </label>
                        <input
                          type="email"
                          required
                          value={formState.email}
                          onChange={(e) =>
                            setFormState({
                              ...formState,
                              email: e.target.value,
                            })
                          }
                          placeholder="e.g. shubhamya.1157@gmail.com"
                          className="w-full rounded-xl border border-white/5 bg-white/5 p-4 text-sm text-white placeholder-zinc-700 outline-none transition-all focus:border-white/20 focus:bg-white/[0.08]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          value={formState.phone}
                          onChange={(e) =>
                            setFormState({
                              ...formState,
                              phone: e.target.value,
                            })
                          }
                          placeholder="e.g. +91 8619815840"
                          className="w-full rounded-xl border border-white/5 bg-white/5 p-4 text-sm text-white placeholder-zinc-700 outline-none transition-all focus:border-white/20 focus:bg-white/[0.08]"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">
                          Subject
                        </label>
                        <input
                          type="text"
                          required
                          value={formState.subject}
                          onChange={(e) =>
                            setFormState({
                              ...formState,
                              subject: e.target.value,
                            })
                          }
                          placeholder="e.g. Luxury SUV Booking "
                          className="w-full rounded-xl border border-white/5 bg-white/5 p-4 text-sm text-white placeholder-zinc-700 outline-none transition-all focus:border-white/20 focus:bg-white/[0.08]"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">
                        Your Message
                      </label>
                      <textarea
                        rows={6}
                        required
                        value={formState.message}
                        onChange={(e) =>
                          setFormState({
                            ...formState,
                            message: e.target.value,
                          })
                        }
                        placeholder="Share your travel dates, preferred vehicle (e.g. Premium Sedan, Supercar), and any special requirements (e.g. private chauffeur, airport transfer)..."
                        className="w-full rounded-xl border border-white/5 bg-white/5 p-4 text-sm text-white placeholder-zinc-700 outline-none transition-all focus:border-white/20 focus:bg-white/[0.08] resize-none"
                      />
                    </div>

                    {/* "disabled={isSubmitting}" greys out the button (and blocks
                        extra clicks) while the fake send is in progress. */}
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full rounded-xl bg-white py-4.5 text-xs font-bold text-black hover:bg-zinc-200 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2 cursor-pointer mt-6"
                    >
                      {/* Another ternary: while sending, show the text
                          "Sending Message..."; otherwise show "Send Message" plus
                          the little Send icon. */}
                      {isSubmitting ? (
                        "Sending Message..."
                      ) : (
                        <>
                          Send Message
                          <Send size={12} />
                        </>
                      )}
                    </button>
                  </form>
                </div>
              ) : (
                /* The ":" branch of the form/thank-you ternary: this shows once
                   `submitted` is true — the success message and a reset button. */
                <div className="py-16 text-center space-y-4">
                  <div className="mx-auto h-16 w-16 bg-white/10 border border-white/10 rounded-full flex items-center justify-center text-white">
                    <CheckCircle size={32} />
                  </div>
                  <h3 className="text-2xl font-bold text-white">
                    Message Sent Successfully
                  </h3>
                  <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
                    Thank you for reaching out. We have received your message
                    and an Avento representative will get back to you shortly.
                  </p>
                  {/* "Send Another Message": onClick runs this little function,
                      which flips submitted back to false (showing the form again)
                      and blanks out all five fields so it's fresh and empty. */}
                  <button
                    onClick={() => {
                      setSubmitted(false);
                      setFormState({
                        name: "",
                        email: "",
                        phone: "",
                        subject: "",
                        message: "",
                      });
                    }}
                    className="mt-6 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-6 py-2.5 text-xs font-semibold text-white transition"
                  >
                    Send Another Message
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* FAQs Section */}
          <div className="mt-32 max-w-4xl mx-auto">
            <div className="text-center mb-12 space-y-2">
              <span className="text-[10px] uppercase tracking-[0.4em] text-zinc-500 font-bold block">
                Questions
              </span>
              <h2 className="text-3xl sm:text-4xl font-black">
                FREQUENTLY ASKED
              </h2>
            </div>

            {/* The FAQ accordion: loop over `faqs` with .map and draw one
                expandable row each. A row is "open" when its index matches the
                remembered `openFaq` value. */}
            <div className="space-y-4">
              {faqs.map((faq, index) => {
                // isOpen is true only for the row whose position equals openFaq.
                // "===" is an exact "is it equal?" check that returns true/false.
                const isOpen = openFaq === index;
                return (
                  <div
                    key={index}
                    className="overflow-hidden rounded-2xl border border-white/5 bg-zinc-900/20 backdrop-blur-md transition-colors"
                  >
                    {/* Click toggles this row: if it's already open, close it
                        (null); otherwise open this one (its index). */}
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : index)}
                      className="flex w-full items-center justify-between p-5 text-left text-sm font-bold text-white outline-none"
                    >
                      <span>{faq.question}</span>
                      <ChevronDown
                        size={16}
                        className={`text-zinc-500 transition-transform duration-300 ${isOpen ? "rotate-180 text-white" : ""}`}
                      />
                    </button>

                    {/* "isOpen && (...)" is a shortcut: only draw the part after
                        && when isOpen is true. So the answer panel exists only
                        while this row is open. AnimatePresence + motion.div make
                        it smoothly slide open (initial -> animate) and slide shut
                        (exit) instead of popping in and out. */}
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}    /* start: collapsed + invisible */
                          animate={{ height: "auto", opacity: 1 }} /* open: full height + visible */
                          exit={{ height: 0, opacity: 0 }}        /* closing: back to collapsed */
                          transition={{ duration: 0.25 }}         /* take 0.25s */
                        >
                          <div className="px-5 pb-5 pt-1 text-xs text-zinc-400 leading-relaxed border-t border-white/[0.02]">
                            {faq.answer}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
