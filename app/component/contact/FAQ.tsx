'use client'

import { useState } from 'react'

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(0)

  const faqs = [
    {
      question: 'How quickly will Avento respond?',
      answer: 'Most enquiries receive a response within 24 hours.'
    },
    {
      question: 'Can I partner with Avento?',
      answer: 'Absolutely. We welcome fleet owners and strategic partners.'
    },
    {
      question: 'Do you offer business solutions?',
      answer: 'Yes. Enterprise mobility solutions are available.'
    },
    {
      question: 'Can I suggest new features?',
      answer: 'Definitely. Many improvements come directly from riders.'
    }
  ]

  return (
    <section className="py-24">

      <div className="mx-auto max-w-4xl px-6">

        <p className="mb-4 text-center uppercase tracking-[0.4em] text-zinc-500">
          FAQ
        </p>

        <h2 className="mb-16 text-center text-5xl font-black">
          Frequently Asked Questions
        </h2>

        <div className="space-y-4">

          {faqs.map((faq, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]"
            >

              <button
                onClick={() =>
                  setOpen(open === index ? null : index)
                }
                className="flex w-full items-center justify-between p-6 text-left"
              >
                <span className="font-semibold">
                  {faq.question}
                </span>

                <span className="text-2xl">
                  {open === index ? '−' : '+'}
                </span>
              </button>

              {open === index && (
                <div className="px-6 pb-6 text-zinc-400">
                  {faq.answer}
                </div>
              )}

            </div>
          ))}

        </div>

      </div>

    </section>
  )
}