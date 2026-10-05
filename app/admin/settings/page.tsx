"use client";
// app/admin/settings/page.tsx
import React, { useState } from "react";
import { Settings, Plus, Trash2, Save, Sliders, BookOpen } from "lucide-react";

export default function SystemSettingsPage() {
  const [commissionRate, setCommissionRate] = useState(10);
  const [subjects, setSubjects] = useState<string[]>([
    "Advanced Mathematics",
    "Physics & Mechanics",
    "Organic Chemistry",
    "Computer Science & Python",
    "English Literature",
  ]);
  const [newSubject, setNewSubject] = useState("");

  const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim()) return;
    setSubjects([...subjects, newSubject.trim()]);
    setNewSubject("");
  };

  const handleRemoveSubject = (subj: string) => {
    setSubjects(subjects.filter(s => s !== subj));
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    alert("System settings and pricing rules successfully updated!");
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <span className="text-amber-500 text-xs font-semibold tracking-widest uppercase">Configuration</span>
        <h1 className="text-3xl font-serif font-bold text-white mt-1">System Settings & Catalog Management</h1>
        <p className="text-stone-400 text-sm font-light mt-1">Manage global platform commission rules, subject catalogs, and matchmaking parameters.</p>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-8">
        {/* Pricing & Commission Rules */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl shadow-xl p-8 space-y-6">
          <h2 className="text-xl font-serif font-bold text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-amber-500" /> Platform Financial Rules
          </h2>
          <div className="max-w-md space-y-2">
            <label className="block text-xs uppercase tracking-wider text-stone-400 font-semibold">Platform Commission Rate (%)</label>
            <div className="flex items-center gap-4">
              <input
                type="number"
                value={commissionRate}
                onChange={(e) => setCommissionRate(Number(e.target.value))}
                className="w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-sm text-stone-200 focus:outline-none focus:border-amber-500"
              />
              <span className="text-amber-400 font-bold">%</span>
            </div>
            <p className="text-xs text-stone-500">Default platform cut deducted from escrow held upon lesson completion.</p>
          </div>
        </div>

        {/* Subject Catalog Management */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl shadow-xl p-8 space-y-6">
          <h2 className="text-xl font-serif font-bold text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-500" /> Active Subject Catalog
          </h2>
          <div className="flex flex-wrap gap-3">
            {subjects.map((subj, index) => (
              <span key={index} className="px-4 py-2 bg-stone-950 text-amber-400 border border-stone-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                {subj}
                <button
                  type="button"
                  onClick={() => handleRemoveSubject(subj)}
                  className="text-stone-500 hover:text-red-400 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>

          <div className="flex gap-3 max-w-md pt-2">
            <input
              type="text"
              placeholder="Add new subject..."
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              className="flex-1 px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-sm text-stone-200 focus:outline-none focus:border-amber-500"
            />
            <button
              type="button"
              onClick={handleAddSubject}
              className="px-5 py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-sm flex items-center gap-1.5 transition shadow"
            >
              <Plus className="w-4 h-4" /> Add Subject
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="px-6 py-3.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-sm transition shadow-lg shadow-amber-500/20 flex items-center gap-2"
        >
          <Save className="w-4 h-4" /> Save Configuration Changes
        </button>
      </form>
    </div>
  );
}
