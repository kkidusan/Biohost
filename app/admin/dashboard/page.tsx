"use client";
// app/admin/dashboard/page.tsx
import React, { useState } from "react";
import Link from "next/link";
import { initialVerifications, initialBookings, VerificationRequest, Booking } from "../../lib/platformData";
import { ShieldCheck, CheckCircle, XCircle, DollarSign, Lock, Users, Video, BookOpen, TrendingUp, Award } from "lucide-react";

export default function AdminDashboard() {
  const [verifications, setVerifications] = useState<VerificationRequest[]>(initialVerifications);
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);

  const totalEscrow = bookings.filter(b => b.escrowStatus === "Held in Escrow").reduce((acc, b) => acc + b.amount, 0);
  const platformCommission = totalEscrow * 0.1;
  const activeSessions = bookings.filter(b => b.status === "Confirmed").length;
  const totalStudents = 1420;
  const activeTutors = 284;
  const successfulMatches = 3890;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-amber-500 text-xs font-semibold tracking-widest uppercase">System Overview</span>
          <h1 className="text-3xl font-serif font-bold text-white mt-1">Admin & Agent Dashboard</h1>
          <p className="text-stone-400 text-sm font-light mt-1">Real-time telemetry of platform performance, escrow holds, and matchmaker agent status.</p>
        </div>
        <Link href="/admin/matchmaker" className="px-5 py-2.5 bg-amber-500 text-stone-950 rounded-full text-sm font-bold hover:bg-amber-400 transition shadow-lg shadow-amber-500/20">
          Matchmaker Queue →
        </Link>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-stone-900 border border-stone-800 p-6 rounded-2xl shadow-xl space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs uppercase tracking-wider text-stone-400 font-semibold">Total Students</span>
            <Users className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-3xl font-serif font-bold text-amber-400">{totalStudents.toLocaleString()}</p>
          <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> +12% this month
          </p>
        </div>

        <div className="bg-stone-900 border border-stone-800 p-6 rounded-2xl shadow-xl space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs uppercase tracking-wider text-stone-400 font-semibold">Active Tutors</span>
            <BookOpen className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-3xl font-serif font-bold text-amber-400">{activeTutors}</p>
          <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> {verifications.filter(v => v.status === "Pending").length} pending review
          </p>
        </div>

        <div className="bg-stone-900 border border-stone-800 p-6 rounded-2xl shadow-xl space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs uppercase tracking-wider text-stone-400 font-semibold">Successful Matches</span>
            <Award className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-3xl font-serif font-bold text-amber-400">{successfulMatches.toLocaleString()}</p>
          <p className="text-[11px] text-stone-400 font-medium">99.4% satisfaction rate</p>
        </div>

        <div className="bg-stone-900 border border-stone-800 p-6 rounded-2xl shadow-xl space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs uppercase tracking-wider text-stone-400 font-semibold">Platform Revenue (10%)</span>
            <DollarSign className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-3xl font-serif font-bold text-emerald-400">${platformCommission.toFixed(2)}</p>
          <p className="text-[11px] text-stone-400 font-medium">Escrow Pool: ${totalEscrow}.00</p>
        </div>
      </div>

      {/* Live Sessions & Agent Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-stone-900 border border-stone-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="px-6 py-5 border-b border-stone-800 font-serif font-bold text-xl text-white flex items-center justify-between">
            <span>Active Live Sessions ({activeSessions})</span>
            <Video className="w-5 h-5 text-amber-500 animate-pulse" />
          </div>
          <div className="divide-y divide-stone-800">
            {bookings.slice(0, 3).map((booking) => (
              <div key={booking.id} className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-serif font-bold text-base text-white">{booking.studentName} → {booking.tutorName}</h3>
                    <span className="text-xs px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-semibold">
                      {booking.subject}
                    </span>
                  </div>
                  <p className="text-xs text-stone-400 font-mono">Date: {booking.date} ({booking.timeSlot})</p>
                </div>
                <span className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-semibold">
                  Live Classroom Active
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Agent Actions */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl shadow-xl p-6 space-y-6">
          <h2 className="font-serif font-bold text-xl text-white">Matchmaker AI Status</h2>
          <div className="space-y-4">
            <div className="p-4 bg-stone-950 border border-stone-800 rounded-xl space-y-1">
              <span className="text-xs text-stone-400 uppercase font-semibold">Algorithm Engine</span>
              <p className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span> Active & Autopilot
              </p>
            </div>
            <div className="p-4 bg-stone-950 border border-stone-800 rounded-xl space-y-1">
              <span className="text-xs text-stone-400 uppercase font-semibold">Pending Matches in Queue</span>
              <p className="text-2xl font-serif font-bold text-amber-400">14 Students</p>
            </div>
            <Link
              href="/admin/matchmaker"
              className="block w-full text-center py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-sm transition shadow-lg shadow-amber-500/20"
            >
              Review Queue
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
