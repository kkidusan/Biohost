"use client";
// app/tutors/page.tsx
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { initialTutors, Tutor } from "../lib/platformData";
import { Search, Star, MapPin, BookOpen, DollarSign, ShieldCheck, ChevronRight, Calendar, Loader2 } from "lucide-react";
import { db } from "../firebaseconfig";
import { collection, getDocs } from "firebase/firestore";

export default function TutorsPage() {
  const [tutors, setTutors] = useState<Tutor[]>(initialTutors);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("All");
  const [selectedGrade, setSelectedGrade] = useState("All");
  const [selectedMode, setSelectedMode] = useState("All");

  const subjects = ["All", "Mathematics", "Science", "English & Literature", "History", "Computer Science"];
  const grades = ["All", "Elementary", "Middle School", "High School / College"];
  const modes = ["All", "Online", "In-Person", "Both"];

  useEffect(() => {
    const fetchTutorsFromDb = async () => {
      try {
        setLoading(true);
        const list: Tutor[] = [...initialTutors];
        const custSnap = await getDocs(collection(db, "customers"));
        custSnap.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.role === "tutor") {
            const exists = list.some(t => t.id === docSnap.id || t.email === data.email);
            if (!exists) {
              list.push({
                id: docSnap.id,
                name: data.fullName || data.name || "Expert Tutor",
                email: data.email || "",
                subject: data.subject || "Mathematics",
                gradeLevel: data.gradeLevel || "High School / College",
                hourlyRate: data.hourlyRate || 45,
                monthlyRate: data.monthlyRate || 350,
                learningMode: data.learningMode || "Both",
                location: data.location || "Remote / Online",
                credentials: data.credentials || "Verified Academic Tutor",
                experience: data.experience || "5+ Years Teaching Experience",
                bio: data.bio || data.credentials || "Experienced mentor dedicated to academic excellence.",
                avatar: data.avatar || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200",
                rating: 4.9,
                reviewCount: 24,
                verified: true,
                availabilityStr: data.availabilityStr || "Mon, Wed, Fri",
              } as any);
            }
          }
        });
        setTutors(list);
      } catch (err) {
        console.error("Error fetching tutors from db:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTutorsFromDb();
  }, []);

  const filteredTutors = tutors.filter((tutor) => {
    const matchesSearch = tutor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          tutor.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          tutor.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = selectedSubject === "All" || tutor.subject === selectedSubject;
    const matchesGrade = selectedGrade === "All" || tutor.gradeLevel.includes(selectedGrade);
    const matchesMode = selectedMode === "All" || tutor.learningMode === selectedMode || tutor.learningMode === "Both";

    return matchesSearch && matchesSubject && matchesGrade && matchesMode;
  });

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 font-sans selection:bg-amber-500 selection:text-stone-950 py-16 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Search and Filters Bar */}
        <div className="mb-8 bg-stone-900 border border-stone-800 rounded-2xl p-3 shadow-xl">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 text-xs font-semibold shrink-0">
              <ShieldCheck className="w-3.5 h-3.5" /> Expert Tutors ({tutors.length})
            </div>

            <div className="relative min-w-[140px] flex-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-stone-400">
                <Search className="w-3 h-3 text-amber-500" />
              </span>
              <input
                type="text"
                placeholder="Search tutors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-2.5 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="min-w-[120px]">
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full py-2 px-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-200 focus:outline-none focus:border-amber-500"
              >
                {subjects.map((sub) => (
                  <option key={sub} value={sub}>{sub === "All" ? "Subject" : sub}</option>
                ))}
              </select>
            </div>

            <div className="min-w-[110px]">
              <select
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="w-full py-2 px-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-200 focus:outline-none focus:border-amber-500"
              >
                {grades.map((grade) => (
                  <option key={grade} value={grade}>{grade === "All" ? "Grade" : grade}</option>
                ))}
              </select>
            </div>

            <div className="min-w-[100px]">
              <select
                value={selectedMode}
                onChange={(e) => setSelectedMode(e.target.value)}
                className="w-full py-2 px-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-200 focus:outline-none focus:border-amber-500"
              >
                {modes.map((mode) => (
                  <option key={mode} value={mode}>{mode === "All" ? "Mode" : mode}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Tutors Grid (Minimized & Compact Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTutors.map((tutor: any) => (
            <div key={tutor.id} className="bg-stone-900 border border-stone-800 rounded-xl p-4 shadow-lg hover:border-amber-500/50 transition flex flex-col justify-between space-y-3">
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <img src={tutor.avatar} alt={tutor.name} className="w-10 h-10 rounded-full object-cover border border-amber-500/30" />
                    <div>
                      <div className="flex items-center gap-1">
                        <h3 className="font-serif font-bold text-sm text-white">{tutor.name}</h3>
                        {tutor.verified && <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />}
                      </div>
                      <span className="text-[11px] text-stone-400 block">{tutor.gradeLevel}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2.5 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] font-bold rounded-full">
                      ${tutor.hourlyRate}/hr
                    </span>
                    <span className="block text-[9px] text-stone-500 mt-0.5 font-mono">${tutor.monthlyRate}/mo</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-md bg-stone-950 border border-stone-800 text-[11px] text-amber-400 font-medium">
                    {tutor.subject}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-stone-950 border border-stone-800 text-[11px] text-stone-300 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-amber-500" /> {tutor.location} ({tutor.learningMode})
                  </span>
                </div>

                <p className="text-xs text-stone-300 font-light leading-relaxed line-clamp-2">
                  {tutor.bio}
                </p>

                {/* Complete Availability / Schedule Section */}
                <div className="bg-stone-950 border border-stone-800 rounded-lg p-2.5 space-y-1.5 text-[11px]">
                  <span className="text-[9px] uppercase tracking-wider text-stone-400 font-semibold flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-amber-500" /> Availability & Schedule
                  </span>
                  <div className="px-2 py-1 bg-stone-900 border border-stone-800 rounded text-stone-300 font-mono text-[10px]">
                    {tutor.availabilityStr || "Mon - Sat (Flexible)"}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-stone-800 flex items-center justify-between">
                <span className="flex items-center gap-1 font-semibold text-amber-400 text-xs">
                  <Star className="w-3.5 h-3.5 fill-amber-400" /> {tutor.rating} ({tutor.reviewCount})
                </span>
                <Link
                  href={`/tutors/${tutor.id}`}
                  className="px-3.5 py-2 bg-stone-800 hover:bg-amber-500 hover:text-stone-950 text-stone-200 font-semibold text-xs rounded-lg transition flex items-center gap-1"
                >
                  <span>Book</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>

        {filteredTutors.length === 0 && (
          <div className="text-center py-20 bg-stone-900 border border-stone-800 rounded-2xl shadow-xl">
            <p className="text-stone-400 text-base">No expert tutors found matching your criteria.</p>
            <button
              onClick={() => { setSearchQuery(""); setSelectedSubject("All"); setSelectedGrade("All"); setSelectedMode("All"); }}
              className="mt-6 px-6 py-2.5 bg-amber-500 text-stone-950 rounded-xl text-sm font-bold hover:bg-amber-400 transition"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
