"use client";
// app/admin/matchmaker/page.tsx
import React, { useState } from "react";
import { Cpu, CheckCircle2, XCircle, UserCheck, ArrowRight, Sparkles } from "lucide-react";

interface MatchRecommendation {
  id: string;
  studentName: string;
  studentEmail: string;
  subject: string;
  matchedTutor: string;
  confidenceScore: number;
  reason: string;
  status: "Pending" | "Approved" | "Overridden";
}

export default function MatchmakerPage() {
  const [recommendations, setRecommendations] = useState<MatchRecommendation[]>([
    {
      id: "m-1",
      studentName: "Amina Yusuf",
      studentEmail: "amina@example.com",
      subject: "Advanced Mathematics",
      matchedTutor: "Dr. Samuel Kebede",
      confidenceScore: 98,
      reason: "Matched based on shared schedule availability (Wed 3 PM) and calculus specialization history.",
      status: "Pending",
    },
    {
      id: "m-2",
      studentName: "Dawit Mamo",
      studentEmail: "dawit@example.com",
      subject: "Physics & Mechanics",
      matchedTutor: "Dr. Elena Vance",
      confidenceScore: 94,
      reason: "High student rating match + matching time zone preference.",
      status: "Pending",
    },
    {
      id: "m-3",
      studentName: "Hanna Bekele",
      studentEmail: "hanna@example.com",
      subject: "Organic Chemistry",
      matchedTutor: "Prof. Marcus Thorne",
      confidenceScore: 91,
      reason: "Subject competency score 9.8/10.",
      status: "Pending",
    },
  ]);

  const handleApprove = (id: string) => {
    setRecommendations(recommendations.map(r => r.id === id ? { ...r, status: "Approved" } : r));
  };

  const handleOverride = (id: string) => {
    const newTutor = prompt("Enter manual override tutor name:");
    if (!newTutor) return;
    setRecommendations(recommendations.map(r => r.id === id ? { ...r, matchedTutor: newTutor, status: "Overridden" } : r));
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-amber-500 text-xs font-semibold tracking-widest uppercase">Matchmaker Agent</span>
          <h1 className="text-3xl font-serif font-bold text-white mt-1">AI Recommendation & Pairing Queue</h1>
          <p className="text-stone-400 text-sm font-light mt-1">Review automated algorithmic match pairings or execute manual tutor overrides.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-stone-900 border border-stone-800 rounded-xl text-xs font-mono text-amber-400">
          <Cpu className="w-4 h-4 text-amber-500 animate-spin" /> Neural Match Engine v2.4
        </div>
      </div>

      <div className="bg-stone-900 border border-stone-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="px-6 py-5 border-b border-stone-800 font-serif font-bold text-xl text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-500" /> Pending AI Recommendations
        </div>
        <div className="divide-y divide-stone-800">
          {recommendations.map((item) => (
            <div key={item.id} className="p-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              <div className="space-y-2 max-w-2xl">
                <div className="flex items-center gap-3">
                  <h3 className="font-serif font-bold text-lg text-white">{item.studentName}</h3>
                  <span className="text-xs px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-semibold">
                    {item.subject}
                  </span>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                    item.status === "Approved" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" :
                    item.status === "Overridden" ? "bg-purple-500/10 text-purple-400 border border-purple-500/30" :
                    "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                  }`}>
                    {item.status} ({item.confidenceScore}% Match)
                  </span>
                </div>
                <p className="text-xs text-stone-300 font-light flex items-center gap-2">
                  <span>Student Email: <strong className="text-stone-100">{item.studentEmail}</strong></span>
                  <span>→</span>
                  <span>Suggested Tutor: <strong className="text-amber-400 font-serif">{item.matchedTutor}</strong></span>
                </p>
                <p className="text-xs text-stone-400 italic bg-stone-950 p-3 rounded-xl border border-stone-800">
                  🤖 "{item.reason}"
                </p>
              </div>

              {item.status === "Pending" && (
                <div className="flex items-center gap-3 w-full lg:w-auto">
                  <button
                    onClick={() => handleApprove(item.id)}
                    className="flex-1 lg:flex-none px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Approve Pairing
                  </button>
                  <button
                    onClick={() => handleOverride(item.id)}
                    className="flex-1 lg:flex-none px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                  >
                    <UserCheck className="w-4 h-4 text-amber-500" /> Manual Override
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
