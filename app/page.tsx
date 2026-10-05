"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Users,
  MapPin,
  Phone,
  Mail,
  Star,
  Wifi,
  Coffee,
  Tv,
  Bath,
  CheckCircle,
  Menu,
  X,
  ChevronRight,
  Sparkles,
  Utensils,
  Shield,
  BookOpen,
  Search,
  Lock,
  Clock,
  Video
} from "lucide-react";
import { initialTutors } from "./lib/platformData";

export default function Home() {
  const [subjectQuery, setSubjectQuery] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("All");

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 font-sans selection:bg-amber-500 selection:text-stone-950">
      {/* Hero Section */}
      <section className="relative min-h-[85vh] flex items-center justify-center text-center px-6 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=2000&q=85"
            alt="BioHost Tutors"
            className="w-full h-full object-cover object-center filter brightness-40 scale-105 animate-pulse duration-[10000ms]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/50 to-black/70" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto space-y-6 mt-12">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif font-bold tracking-tight text-white leading-tight">
            Connect With Expert Tutors, <span className="text-amber-500 italic">Elevate Learning</span>
          </h1>
          <p className="text-stone-300 text-lg md:text-xl max-w-2xl mx-auto font-light leading-relaxed">
            Biruh Tutors is the premier integration agent connecting elite professional tutors with ambitious students. Secure escrow bookings, 1-on-1 mentorship, and guaranteed academic excellence.
          </p>

          {/* Quick Search & Filter Bar */}
          <div className="mt-10 bg-stone-900/90 backdrop-blur-md border border-stone-800 p-4 md:p-6 rounded-2xl shadow-2xl max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
            <div>
              <label className="block text-xs uppercase tracking-wider text-stone-400 font-semibold mb-1.5 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-amber-500" /> Subject or Tutor
              </label>
              <input
                type="text"
                placeholder="e.g. Mathematics, Physics..."
                value={subjectQuery}
                onChange={(e) => setSubjectQuery(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2.5 text-sm text-stone-200 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-stone-400 font-semibold mb-1.5 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-amber-500" /> Grade Level
              </label>
              <select
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2.5 text-sm text-stone-200 focus:outline-none focus:border-amber-500"
              >
                <option value="All">All Levels</option>
                <option value="Elementary">Elementary</option>
                <option value="Middle School">Middle School</option>
                <option value="High School / College">High School / College</option>
              </select>
            </div>
            <div className="flex items-end">
              <Link
                href={`/tutors?search=${encodeURIComponent(subjectQuery)}`}
                className="w-full bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold py-2.5 px-4 rounded-lg transition text-center shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 text-sm"
              >
                <span>Find Expert Tutors</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Tutors Section */}
      <section className="py-24 px-6 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
          <span className="text-amber-500 text-xs font-semibold tracking-widest uppercase">Elite Mentors</span>
          <h2 className="text-3xl md:text-5xl font-serif font-bold text-white">Featured Expert Tutors</h2>
          <p className="text-stone-400 font-light">
            Verified academic leaders ready to guide students toward exceptional results.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {initialTutors.slice(0, 3).map((tutor) => (
            <div
              key={tutor.id}
              className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-xl hover:border-amber-500/50 transition group flex flex-col justify-between"
            >
              <div>
                <div className="relative h-64 overflow-hidden">
                  <img
                    src={tutor.avatar}
                    alt={tutor.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  />
                  <div className="absolute top-4 right-4 bg-stone-950/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-amber-400 border border-stone-700">
                    ${tutor.hourlyRate} <span className="text-stone-400 font-normal">/ hour</span>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between text-xs text-stone-400 font-medium">
                    <span className="bg-amber-500/10 text-amber-400 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                      {tutor.subject}
                    </span>
                    <span className="flex items-center gap-1 text-amber-400 font-semibold">
                      <Star className="w-3.5 h-3.5 fill-amber-400" /> {tutor.rating}
                    </span>
                  </div>
                  <h3 className="text-xl font-serif font-bold text-white group-hover:text-amber-400 transition">
                    {tutor.name}
                  </h3>
                  <p className="text-stone-400 text-sm font-light line-clamp-2">
                    {tutor.bio}
                  </p>
                  <div className="text-xs text-stone-500 pt-2 border-t border-stone-800 flex justify-between">
                    <span>{tutor.location}</span>
                    <span>{tutor.learningMode}</span>
                  </div>
                </div>
              </div>
              <div className="p-6 pt-0">
                <Link
                  href={`/tutors/${tutor.id}`}
                  className="w-full py-3 bg-stone-800 hover:bg-amber-500 hover:text-stone-950 text-stone-200 font-semibold text-sm rounded-xl transition flex items-center justify-center gap-2"
                >
                  <span>View Profile & Book Session</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link
            href="/tutors"
            className="inline-flex items-center gap-2 px-8 py-4 bg-stone-900 border border-stone-800 hover:border-amber-500 text-stone-200 font-semibold rounded-full transition shadow-xl"
          >
            <span>Browse All Tutors</span>
            <ChevronRight className="w-4 h-4 text-amber-500" />
          </Link>
        </div>
      </section>

      {/* Platform Features */}
      <section className="py-24 px-6 bg-stone-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <span className="text-amber-500 text-xs font-semibold tracking-widest uppercase">Why Choose Biruh Tutors</span>
            <h2 className="text-3xl md:text-5xl font-serif font-bold text-white">Built for Security & Excellence</h2>
            <p className="text-stone-400 font-light">
              Connecting students and tutors through secure escrow payments and verified credentials.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: <Shield className="w-6 h-6 text-amber-500" />,
                title: "Verified Credentials",
                desc: "Every tutor undergoes rigorous ID verification and academic background checks."
              },
              {
                icon: <Lock className="w-6 h-6 text-amber-500" />,
                title: "Escrow Protection",
                desc: "Funds are held securely in escrow and only released after successful lesson completion."
              },
              {
                icon: <Video className="w-6 h-6 text-amber-500" />,
                title: "Virtual Classroom",
                desc: "High-definition video rooms with interactive whiteboards for seamless online sessions."
              },
              {
                icon: <Clock className="w-6 h-6 text-amber-500" />,
                title: "Flexible Scheduling",
                desc: "Real-time calendar slot booking and instant confirmation with 24/7 support."
              },
            ].map((feat, idx) => (
              <div key={idx} className="bg-stone-900 border border-stone-800 p-8 rounded-2xl hover:border-amber-500/40 transition space-y-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                  {feat.icon}
                </div>
                <h3 className="text-xl font-serif font-bold text-white">{feat.title}</h3>
                <p className="text-stone-400 text-sm font-light leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-stone-950 border-t border-stone-900 py-12 px-6 text-stone-400 text-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-stone-950 font-bold text-lg">
              BT
            </div>
            <div>
              <span className="font-serif font-bold text-white tracking-wider block leading-none">BIRUH TUTORS</span>
              <span className="text-[10px] text-stone-500 block mt-1">Tutor & Student Connection Agent</span>
            </div>
          </div>
          <p className="text-xs text-stone-500 text-center">
            © {new Date().getFullYear()} Biruh Tutors. Secure Escrow Tutoring Platform. Phone: +211 920 500 155.
          </p>
          <div className="flex items-center gap-6 text-xs font-medium">
            <Link href="/tutors" className="hover:text-amber-400 transition">Find Tutors</Link>
            <Link href="/student/dashboard" className="hover:text-amber-400 transition">Student Portal</Link>
            <a href="tel:+211920500155" className="text-amber-400 transition">Front Desk</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
