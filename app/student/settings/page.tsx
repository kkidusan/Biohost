"use client";
import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { User, Settings, CheckCircle } from "lucide-react";

export default function StudentSettingsPage() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.fullName || "Student");
  const [timezone, setTimezone] = useState("UTC+2 (Juba / Africa)");
  const [learningStyle, setLearningStyle] = useState("Visual & Interactive");

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Settings updated successfully!");
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div>
        <span className="text-amber-500 text-xs font-semibold tracking-widest uppercase">Preferences</span>
        <h1 className="text-3xl font-serif font-bold text-white mt-1">Profile & Settings</h1>
        <p className="text-stone-400 text-sm font-light mt-1">Configure your personal details, learning style, and time zone.</p>
      </div>

      <form onSubmit={handleSave} className="bg-stone-900 border border-stone-800 rounded-2xl p-8 shadow-xl space-y-6">
        <div>
          <label className="block text-xs uppercase tracking-wider text-stone-400 font-semibold mb-1">Full Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-sm text-stone-200 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-stone-400 font-semibold mb-1">Email Address</label>
          <input
            type="email"
            disabled
            value={user?.email || "student@example.com"}
            className="w-full px-4 py-3 bg-stone-950/50 border border-stone-800 rounded-xl text-sm text-stone-500 cursor-not-allowed"
          />
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-stone-400 font-semibold mb-1">Preferred Learning Style</label>
          <select
            value={learningStyle}
            onChange={(e) => setLearningStyle(e.target.value)}
            className="w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-sm text-stone-200 focus:outline-none focus:border-amber-500"
          >
            <option>Visual & Interactive</option>
            <option>Practical & Problem Solving</option>
            <option>Theoretical & Conceptual</option>
          </select>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-stone-400 font-semibold mb-1">Timezone</label>
          <input
            type="text"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-sm text-stone-200 focus:outline-none focus:border-amber-500"
          />
        </div>

        <button
          type="submit"
          className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-sm transition shadow-lg shadow-amber-500/20"
        >
          Save Changes
        </button>
      </form>
    </div>
  );
}
