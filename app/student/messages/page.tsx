"use client";
import React, { useState } from "react";
import { MessageSquare, Send, Sparkles } from "lucide-react";

export default function StudentMessagesPage() {
  const [messages, setMessages] = useState([
    { sender: "AI Matchmaker Agent", text: "Hello! I am your AI matchmaking agent. Looking for a specialized math or science tutor today?", time: "10:00 AM" },
    { sender: "Dr. Sarah Jenkins", text: "Looking forward to our upcoming physics calculus session!", time: "Yesterday" },
  ]);
  const [input, setInput] = useState("");

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setMessages([...messages, { sender: "You", text: input, time: "Just now" }]);
    setInput("");
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <span className="text-amber-500 text-xs font-semibold tracking-widest uppercase">Communication Hub</span>
        <h1 className="text-3xl font-serif font-bold text-white mt-1">Messages & AI Matchmaker</h1>
        <p className="text-stone-400 text-sm font-light mt-1">Chat with assigned tutors or get instant recommendations from our AI matchmaking agent.</p>
      </div>

      <div className="bg-stone-900 border border-stone-800 rounded-2xl shadow-xl flex flex-col h-[600px] overflow-hidden">
        <div className="p-4 bg-stone-950 border-b border-stone-800 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-white text-sm">Biruh Tutors AI & Messaging</h3>
            <span className="text-[10px] text-amber-400">Online & Active</span>
          </div>
        </div>

        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          {messages.map((m, idx) => (
            <div key={idx} className={`flex flex-col ${m.sender === "You" ? "items-end" : "items-start"}`}>
              <span className="text-[10px] text-stone-500 mb-1">{m.sender} • {m.time}</span>
              <div className={`p-4 rounded-2xl text-sm max-w-md ${
                m.sender === "You"
                  ? "bg-amber-500 text-stone-950 font-medium rounded-tr-none"
                  : "bg-stone-950 border border-stone-800 text-stone-200 rounded-tl-none"
              }`}>
                {m.text}
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleSend} className="p-4 bg-stone-950 border-t border-stone-800 flex gap-3">
          <input
            type="text"
            placeholder="Type message or ask AI matchmaker..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 bg-stone-900 border border-stone-800 rounded-xl px-4 py-3 text-sm text-stone-200 focus:outline-none focus:border-amber-500"
          />
          <button type="submit" className="px-5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl transition flex items-center justify-center">
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
