"use client";
import React, { useState } from "react";
import { initialBookings, Booking } from "../../lib/platformData";
import { Check, X, Clock, ShieldCheck } from "lucide-react";

export default function TutorRequestsPage() {
  const [requests, setRequests] = useState<Booking[]>(initialBookings);

  const handleAccept = (id: string) => {
    setRequests(requests.map(r => r.id === id ? { ...r, status: "Confirmed" } : r));
  };

  const handleDecline = (id: string) => {
    setRequests(requests.map(r => r.id === id ? { ...r, status: "Cancelled" } : r));
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <span className="text-amber-500 text-xs font-semibold tracking-widest uppercase">Bookings</span>
        <h1 className="text-3xl font-serif font-bold text-white mt-1">Incoming Booking Requests</h1>
        <p className="text-stone-400 text-sm font-light mt-1">New student requests from the AI Matchmaker & Algorithm.</p>
      </div>

      <div className="bg-stone-900 border border-stone-800 rounded-2xl shadow-xl overflow-hidden divide-y divide-stone-800">
        {requests.map((req) => (
          <div key={req.id} className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h3 className="font-serif font-bold text-lg text-white">{req.studentName} ({req.studentEmail})</h3>
                <span className="text-xs px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full font-semibold">
                  {req.status}
                </span>
              </div>
              <p className="text-xs text-stone-300 font-light">Subject: <strong className="text-white">{req.subject}</strong></p>
              <p className="text-xs text-stone-400 font-mono">Time: {req.date} at {req.timeSlot}</p>
              <p className="text-xs font-semibold text-amber-400">Escrow Payment: ${req.amount}.00 Secured</p>
            </div>
            {req.status === "Confirmed" && (
              <div className="flex gap-2">
                <button onClick={() => handleDecline(req.id)} className="px-4 py-2 bg-stone-800 hover:bg-red-950 text-red-400 border border-stone-700 rounded-xl text-xs font-semibold transition">
                  Decline
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
