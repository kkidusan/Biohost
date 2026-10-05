"use client";
import React from "react";
import { BookOpen, Upload, FileText } from "lucide-react";

export default function TutorResourcesPage() {
  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <span className="text-amber-500 text-xs font-semibold tracking-widest uppercase">Teaching Tools</span>
        <h1 className="text-3xl font-serif font-bold text-white mt-1">Teaching Resources</h1>
        <p className="text-stone-400 text-sm font-light mt-1">Upload lesson materials, homework templates, and shared drives for students.</p>
      </div>

      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-8 shadow-xl space-y-6">
        <div className="border-2 border-dashed border-stone-800 rounded-xl p-8 text-center space-y-3 hover:border-amber-500/50 transition cursor-pointer">
          <Upload className="w-10 h-10 text-amber-500 mx-auto" />
          <h3 className="font-serif font-bold text-white text-base">Upload Lesson Material</h3>
          <p className="text-xs text-stone-400">Drag and drop PDFs, worksheets, or video links here</p>
        </div>
      </div>
    </div>
  );
}
