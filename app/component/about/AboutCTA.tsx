"use client";

import { motion } from "framer-motion";
import { ArrowRight, MessageSquare } from "lucide-react";
import Link from "next/link";

export default function AboutCTA() {
  return (
    <section className="bg-black text-white py-28 px-6 md:px-12 lg:px-24 relative overflow-hidden">
      {/* Background Radial Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_0%,transparent_70%)] pointer-events-none" />

      <div className="max-w-5xl mx-auto text-center relative z-10 space-y-10">
        
        {/* Accent Diamond */}
        <div className="flex justify-center">
          <div className="h-10 w-px bg-gradient-to-b from-transparent to-white" />
        </div>

        {/* Small Tagline */}
        <span className="uppercase tracking-[0.4em] text-zinc-500 text-xs font-bold block">
          Start Your Journey
        </span>

        {/* Main Header */}
        <h2 className="text-4xl sm:text-6xl font-black tracking-tight uppercase leading-none max-w-4xl mx-auto">
          READY TO EXPERIENCE
          <br />
          <span className="bg-gradient-to-r from-white via-zinc-300 to-zinc-600 bg-clip-text text-transparent">
            THE AVENTO DIFFERENCE?
          </span>
        </h2>

        {/* Supporting description */}
        <p className="max-w-lg mx-auto text-sm text-zinc-400 leading-relaxed font-light">
          Whether you are looking for executive business transport, weekend thrills, 
          or custom luxury travel solutions—we have the ideal vehicle waiting.
        </p>

        {/* Dual Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-6">
          <Link
            href="/vehicles"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-xs font-bold text-black hover:bg-zinc-200 transition-all duration-300 hover:scale-105"
          >
            Explore Fleet
            <ArrowRight size={14} />
          </Link>
          
          <Link
            href="/contact"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-8 py-4 text-xs font-bold text-white hover:bg-white/10 transition-all duration-300 hover:scale-105"
          >
            Contact Concierge
            <MessageSquare size={14} className="text-zinc-400" />
          </Link>
        </div>

      </div>
    </section>
  );
}