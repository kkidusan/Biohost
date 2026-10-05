"use client";
// app/students/page.tsx
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { db } from "../firebaseconfig";
import { collection, getDocs } from "firebase/firestore";
import { Search, MapPin, DollarSign, BookOpen, Clock, ChevronRight, CheckCircle2, Users, Loader2, Calendar } from "lucide-react";

interface ScheduleRule {
  day: string;
  timeSlot: string;
}

interface StudentItem {
  id: string;
  name: string;
  email: string;
  subject: string;
  subjects?: string[];
  schedules?: ScheduleRule[];
  gradeLevel: string;
  budgetMax: number;
  learningMode: "Online" | "In-Person" | "Both";
  location: string;
  description: string;
  urgency: "Immediate" | "This Week" | "Flexible";
  postedDate: string;
  avatar: string;
  enrolledCourses?: number;
  status?: string;
}

export default function StudentsPage() {
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("All");
  const [selectedGrade, setSelectedGrade] = useState("All");
  const [selectedMode, setSelectedMode] = useState("All");
  const [contactedId, setContactedId] = useState<string | null>(null);

  const subjects = ["All", "Mathematics", "Science", "English & Literature", "Computer Science", "History"];
  const grades = ["All", "Elementary", "Middle / High School", "High School / College"];
  const modes = ["All", "Online", "In-Person", "Both"];

  useEffect(() => {
    const fetchStudentsFromDb = async () => {
      try {
        setLoading(true);
        const list: StudentItem[] = [];

        // 1. Fetch from customers collection where role === "student"
        try {
          const custSnap = await getDocs(collection(db, "customers"));
          custSnap.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.role === "student" || !data.role) {
              list.push({
                id: docSnap.id,
                name: data.fullName || data.name || "Registered Student",
                email: data.email || "",
                subject: data.subject || (data.subjects?.[0] ?? "General Tutoring"),
                subjects: data.subjects && Array.isArray(data.subjects) ? data.subjects : [data.subject || "General Tutoring"],
                schedules: data.schedules && Array.isArray(data.schedules) ? data.schedules : [],
                gradeLevel: data.gradeLevel || "High School / College",
                budgetMax: data.budgetMax || data.budget || 45,
                learningMode: data.learningMode || "Online",
                location: data.location || "Remote / Online",
                description: data.description || data.bio || "Registered student seeking tutoring support and academic mentorship.",
                urgency: data.urgency || "Immediate",
                postedDate: data.postedDate || data.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0],
                avatar: data.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
                enrolledCourses: data.enrolledCourses || 1,
                status: data.status || "Active",
              });
            }
          });
        } catch (e) {
          console.error("Error fetching customers collection:", e);
        }

        // 2. Also fetch from studentRequests collection if available
        try {
          const reqSnap = await getDocs(collection(db, "studentRequests"));
          reqSnap.forEach((docSnap) => {
            const data = docSnap.data();
            const exists = list.some(item => item.id === docSnap.id || (item.email && item.email === data.email));
            if (!exists) {
              list.push({
                id: docSnap.id,
                name: data.name || data.fullName || "Student Request",
                email: data.email || "",
                subject: data.subject || "General",
                subjects: data.subjects && Array.isArray(data.subjects) ? data.subjects : [data.subject || "General"],
                schedules: data.schedules && Array.isArray(data.schedules) ? data.schedules : [],
                gradeLevel: data.gradeLevel || "High School",
                budgetMax: data.budgetMax || 40,
                learningMode: data.learningMode || "Online",
                location: data.location || "Online",
                description: data.description || "Seeking tutoring assistance.",
                urgency: data.urgency || "This Week",
                postedDate: data.postedDate || new Date().toISOString().split('T')[0],
                avatar: data.avatar || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200",
                status: "Active",
              });
            }
          });
        } catch (e) {
          console.error("Error fetching studentRequests collection:", e);
        }

        setStudents(list);
      } catch (err) {
        console.error("Error fetching students from database:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStudentsFromDb();
  }, []);

  const filteredStudents = students.filter((req) => {
    const matchesSearch = req.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          req.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          req.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          req.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          req.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = selectedSubject === "All" || req.subject === selectedSubject;
    const matchesGrade = selectedGrade === "All" || req.gradeLevel.includes(selectedGrade);
    const matchesMode = selectedMode === "All" || req.learningMode === selectedMode || req.learningMode === "Both";

    return matchesSearch && matchesSubject && matchesGrade && matchesMode;
  });

  const handleConnect = (id: string) => {
    setContactedId(id);
    setTimeout(() => setContactedId(null), 3000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 font-sans selection:bg-amber-500 selection:text-stone-950 py-16 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Search and Filters Bar */}
        <div className="mb-8 bg-stone-900 border border-stone-800 rounded-2xl p-3 shadow-xl">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 text-xs font-semibold shrink-0">
              <Users className="w-3.5 h-3.5" /> Students ({students.length})
            </div>

            <div className="relative min-w-[140px] flex-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-stone-400">
                <Search className="w-3 h-3 text-amber-500" />
              </span>
              <input
                type="text"
                placeholder="Search students..."
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

        {/* Student Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStudents.map((req) => (
            <div key={req.id} className="bg-stone-900 border border-stone-800 rounded-xl p-4 shadow-lg hover:border-amber-500/50 transition flex flex-col justify-between space-y-3">
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <img src={req.avatar} alt={req.name} className="w-10 h-10 rounded-full object-cover border border-amber-500/30" />
                    <div>
                      <h3 className="font-serif font-bold text-sm text-white">{req.name}</h3>
                      <span className="text-[11px] text-stone-400 block">{req.gradeLevel}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2.5 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] font-bold rounded-full">
                      Up to ${req.budgetMax}/hr
                    </span>
                    <span className="block text-[9px] text-stone-500 mt-0.5">{req.postedDate}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-md bg-stone-950 border border-stone-800 text-[11px] text-amber-400 font-medium">
                    {req.subject}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-stone-950 border border-stone-800 text-[11px] text-stone-300 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-amber-500" /> {req.location} ({req.learningMode})
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-stone-950 border border-stone-800 text-[11px] text-stone-300 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-500" /> {req.urgency}
                  </span>
                </div>

                <p className="text-xs text-stone-300 font-light leading-relaxed line-clamp-2">
                  {req.description}
                </p>

                {/* Complete Subjects & Schedule Section */}
                <div className="bg-stone-950 border border-stone-800 rounded-lg p-2.5 space-y-2 text-[11px]">
                  <div className="space-y-1">
                    <span className="text-[9px] uppercase tracking-wider text-stone-400 font-semibold flex items-center gap-1">
                      <BookOpen className="w-3 h-3 text-amber-500" /> Subjects ({req.subjects?.length || 1})
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {req.subjects?.length ? (
                        req.subjects.map((s, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-stone-900 border border-stone-800 rounded text-[10px] text-amber-400 font-medium">
                            {s}
                          </span>
                        ))
                      ) : (
                        <span className="px-2 py-0.5 bg-stone-900 border border-stone-800 rounded text-[10px] text-amber-400 font-medium">
                          {req.subject}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1 pt-1.5 border-t border-stone-800">
                    <span className="text-[9px] uppercase tracking-wider text-stone-400 font-semibold flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-amber-500" /> Schedule Slots
                    </span>
                    <div className="space-y-1 max-h-24 overflow-y-auto">
                      {req.schedules?.length ? (
                        req.schedules.map((sch, idx) => (
                          <div key={idx} className="px-2 py-1 bg-stone-900 border border-stone-800 rounded flex justify-between items-center text-[10px] font-mono text-stone-300">
                            <span className="text-white font-semibold">{sch.day}</span>
                            <span className="text-amber-400">{sch.timeSlot}</span>
                          </div>
                        ))
                      ) : (
                        <div className="px-2 py-1 bg-stone-900 border border-stone-800 rounded text-stone-400 font-mono text-[10px]">
                          Flexible / By Agreement
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-stone-800 flex items-center justify-between">
                <span className="text-[11px] text-stone-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" /> Verified
                </span>
                <button
                  onClick={() => handleConnect(req.id)}
                  className={`px-3.5 py-2 rounded-lg font-semibold text-xs transition flex items-center gap-1 cursor-pointer ${
                    contactedId === req.id
                      ? "bg-green-600 text-white"
                      : "bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-md shadow-amber-500/20"
                  }`}
                >
                  {contactedId === req.id ? (
                    <>Connected!</>
                  ) : (
                    <>
                      <span>Connect</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredStudents.length === 0 && (
          <div className="text-center py-20 bg-stone-900 border border-stone-800 rounded-2xl shadow-xl">
            <Users className="w-12 h-12 text-stone-600 mx-auto mb-4" />
            <p className="text-stone-400 text-base">No registered students found matching your search filters.</p>
            <button
              onClick={() => { setSearchQuery(""); setSelectedSubject("All"); setSelectedGrade("All"); setSelectedMode("All"); }}
              className="mt-6 px-6 py-2.5 bg-amber-500 text-stone-950 rounded-xl text-sm font-bold hover:bg-amber-400 transition cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
