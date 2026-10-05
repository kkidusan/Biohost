"use client";
// app/tutor/dashboard/page.tsx
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { initialTutors, initialBookings, Tutor, Booking } from "../../lib/platformData";
import { Calendar, Clock, DollarSign, CheckCircle, ShieldCheck, User, Edit3, Plus, Loader2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export default function TutorDashboard() {
  const { isLoggedIn, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace("/login");
    } else if (user?.role === "student") {
      router.replace("/student/dashboard");
    }
  }, [isLoggedIn, user, router]);

  const [tutor, setTutor] = useState<Tutor>(initialTutors[0]);
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [newSlot, setNewSlot] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  if (!isLoggedIn || user?.role === "student") {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditing(false);
    alert("Profile and rates updated successfully!");
  };

  const handleDeclineBooking = (id: string) => {
    setBookings(bookings.map(b => b.id === id ? { ...b, status: "Cancelled", escrowStatus: "Refunded" } : b));
  };

  const handleAddSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSlot) return;
    setTutor({ ...tutor, availability: [...tutor.availability, newSlot] });
    setNewSlot("");
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 font-sans selection:bg-amber-500 selection:text-stone-950 py-10 px-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-amber-500 text-xs font-semibold tracking-widest uppercase">Tutor Portal</span>
            <h1 className="text-3xl font-serif font-bold text-white mt-1">Welcome, {user?.fullName || tutor.name}</h1>
            <p className="text-stone-400 text-sm font-light mt-1">Manage your professional profile, rates, schedule, and incoming bookings.</p>
          </div>
          <Link href="/tutors" className="px-5 py-2.5 bg-amber-500 text-stone-950 rounded-full text-sm font-bold hover:bg-amber-400 transition shadow-lg shadow-amber-500/20">
            View Public Profile
          </Link>
        </div>

        {/* Profile & Rates Management */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl shadow-xl p-8 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-serif font-bold text-white flex items-center gap-2">
              <User className="w-5 h-5 text-amber-500" /> Tutor Profile & Rates
            </h2>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border border-stone-700"
            >
              <Edit3 className="w-4 h-4 text-amber-500" /> {isEditing ? "Cancel" : "Edit Profile"}
            </button>
          </div>

          {isEditing ? (
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-stone-400 font-semibold mb-1">Hourly Rate ($)</label>
                  <input
                    type="number"
                    value={tutor.hourlyRate}
                    onChange={(e) => setTutor({ ...tutor, hourlyRate: Number(e.target.value) })}
                    className="w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-sm text-stone-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-stone-400 font-semibold mb-1">Monthly Rate ($)</label>
                  <input
                    type="number"
                    value={tutor.monthlyRate}
                    onChange={(e) => setTutor({ ...tutor, monthlyRate: Number(e.target.value) })}
                    className="w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-sm text-stone-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-stone-400 font-semibold mb-1">Bio</label>
                <textarea
                  rows={3}
                  value={tutor.bio}
                  onChange={(e) => setTutor({ ...tutor, bio: e.target.value })}
                  className="w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-sm text-stone-200 focus:outline-none focus:border-amber-500"
                />
              </div>
              <button type="submit" className="px-6 py-3 bg-amber-500 text-stone-950 font-bold rounded-xl text-sm hover:bg-amber-400 transition">
                Save Changes
              </button>
            </form>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm bg-stone-950 p-6 rounded-xl border border-stone-800">
              <div>
                <span className="text-stone-400 text-xs uppercase tracking-wider">Full Name</span>
                <p className="font-bold text-base text-white mt-1">{tutor.name}</p>
              </div>
              <div>
                <span className="text-stone-400 text-xs uppercase tracking-wider">Subject & Grade</span>
                <p className="font-bold text-base text-white mt-1">{tutor.subject} ({tutor.gradeLevel})</p>
              </div>
              <div>
                <span className="text-stone-400 text-xs uppercase tracking-wider">Teaching Rates</span>
                <p className="font-bold text-base text-amber-400 mt-1">${tutor.hourlyRate}/hr | ${tutor.monthlyRate}/mo</p>
              </div>
            </div>
          )}
        </div>

        {/* Interactive Availability Calendar */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl shadow-xl p-8 space-y-6">
          <h2 className="text-xl font-serif font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-amber-500" /> Interactive Availability Schedule
          </h2>
          <div className="flex flex-wrap gap-3">
            {tutor.availability.map((slot, index) => (
              <span key={index} className="px-4 py-2 bg-stone-950 text-amber-400 border border-stone-800 rounded-xl text-xs font-semibold flex items-center gap-2 font-mono">
                <Clock className="w-3.5 h-3.5 text-amber-500" /> {slot}
              </span>
            ))}
          </div>

          <form onSubmit={handleAddSlot} className="flex gap-3 max-w-md pt-2">
            <input
              type="text"
              placeholder="e.g. Wed 3:00 PM"
              value={newSlot}
              onChange={(e) => setNewSlot(e.target.value)}
              className="flex-1 px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-sm text-stone-200 focus:outline-none focus:border-amber-500"
            />
            <button type="submit" className="px-5 py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-sm flex items-center gap-1.5 transition shadow-lg shadow-amber-500/20">
              <Plus className="w-4 h-4" /> Add Slot
            </button>
          </form>
        </div>

        {/* Incoming Booking Requests */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="px-6 py-5 border-b border-stone-800 font-serif font-bold text-xl text-white">
            Incoming Booking Requests & Escrow Status
          </div>
          <div className="divide-y divide-stone-800">
            {bookings.map((booking) => (
              <div key={booking.id} className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-3">
                    <h3 className="font-serif font-bold text-lg text-white">{booking.studentName} ({booking.studentEmail})</h3>
                    <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
                      booking.status === "Confirmed" ? "bg-amber-500/10 text-amber-400 border border-amber-500/30" :
                      booking.status === "Cancelled" ? "bg-red-500/10 text-red-400 border border-red-500/30" :
                      "bg-blue-500/10 text-blue-400 border border-blue-500/30"
                    }`}>
                      {booking.status}
                    </span>
                  </div>
                  <p className="text-xs text-stone-300 font-light">
                    Subject: <strong className="text-stone-100">{booking.subject}</strong> | Time: <strong className="text-stone-100 font-mono">{booking.date} at {booking.timeSlot}</strong>
                  </p>
                  <p className="text-xs font-semibold text-amber-400">Payment: ${booking.amount}.00 ({booking.escrowStatus})</p>
                </div>

                {booking.status === "Confirmed" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDeclineBooking(booking.id)}
                      className="px-4 py-2.5 bg-stone-800 hover:bg-red-950 text-stone-300 hover:text-red-400 border border-stone-700 rounded-xl text-xs font-semibold transition"
                    >
                      Cancel Booking
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
