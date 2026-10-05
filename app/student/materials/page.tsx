"use client";
import React from "react";
import { BookOpen, Download, FileText } from "lucide-react";

export default function StudentMaterialsPage() {
  const materials = [
    { title: "Advanced Calculus Formula Sheet", subject: "Mathematics", tutor: "Dr. Sarah Jenkins", date: "May 20, 2026" },
    { title: "Organic Chemistry Reaction Pathways", subject: "Science", tutor: "Prof. Michael Vance", date: "May 18, 2026" },
    { title: "Shakespearean Literature Essay Guide", subject: "English", tutor: "Elena Rostova", date: "May 15, 2026" },
  ];

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <span className="text-amber-500 text-xs font-semibold tracking-widest uppercase">Learning Hub</span>
        <h1 className="text-3xl font-serif font-bold text-white mt-1">Assignments & Materials</h1>
        <p className="text-stone-400 text-sm font-light mt-1">Access shared study guides, homework templates, and teacher feedback.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {materials.map((mat, i) => (
          <div key={i} className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <FileText className="w-5 h-5" />
              </div>
              <span className="text-xs px-2.5 py-1 bg-stone-950 text-amber-400 border border-stone-800 rounded-full font-medium">
                {mat.subject}
              </span>
            </div>
            <div>
              <h3 className="font-serif font-bold text-white text-lg">{mat.title}</h3>
              <p className="text-xs text-stone-400 mt-1">Tutor: {mat.tutor} • {mat.date}</p>
            </div>
            <button
              onClick={() => alert("Downloading study material...")}
              className="w-full py-3 bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold rounded-xl text-xs transition flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4 text-amber-500" /> Download PDF / Notes
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
