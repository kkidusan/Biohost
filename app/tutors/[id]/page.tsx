"use client";
// app/tutors/[id]/page.tsx
import React, { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { initialTutors, initialBookings, Tutor, Booking } from "../../lib/platformData";
import { Star, MapPin, BookOpen, ShieldCheck, Calendar, Clock, DollarSign, CheckCircle, Lock, ChevronRight, Phone } from "lucide-react";

export default function TutorDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const tutor = initialTutors.find((t) => t.id === id) || initialTutors[0];

  const [selectedSlot, setSelectedSlot] = useState(tutor.availability[0] || "");
  const [bookingMode, setBookingMode] = useState<"Online" | "In-Person">("Online");
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [bookingRef, setBookingRef] = useState("");

  const handleBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName || !studentEmail || !selectedSlot) {
      alert("Please fill in all booking details.");
      return;
    }
    const ref = "BH-" + Math.floor(100000 + Math.random() * 900000);
    setBookingRef(ref);

    const newBooking: Booking = {
      id: "b_" + Date.now(),
      tutorId: tutor.id,
      tutorName: tutor.name,
      studentName,
      studentEmail,
      subject: tutor.subject,
      date: new Date().toISOString().split("T")[0],
      timeSlot: selectedSlot,
      amount: tutor.hourlyRate,
      status: "Confirmed",
      escrowStatus: "Held in Escrow",
      learningMode: bookingMode,
    };
    initialBookings.push(newBooking);
    setIsSuccess(true);
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 font-sans selection:bg-amber-500 selection:text-stone-950 py-10 px-6">
      <div className="max-w-5xl mx-auto space-y-8">
        <Link href="/tutors" className="text-sm text-amber-400 hover:underline inline-flex items-center gap-1 font-medium">
          ← Back to Tutor Search
        </Link>

        {isSuccess ? (
          <div className="bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl p-8 md:p-12 text-center space-y-6">
            <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-serif font-bold text-white">Session Booked & Secured in Escrow!</h2>
              <p className="text-stone-300 text-sm max-w-xl mx-auto">
                Your session with <strong>{tutor.name}</strong> for <strong>{selectedSlot}</strong> has been confirmed. Funds are safely held in escrow until the lesson is successfully completed.
              </p>
            </div>
            <div className="bg-stone-950 p-6 rounded-xl border border-stone-800 text-left space-y-2 text-xs max-w-md mx-auto">
              <div className="flex justify-between">
                <span className="text-stone-400">Booking Reference:</span>
                <span className="text-amber-400 font-bold font-mono">{bookingRef}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Tutor:</span>
                <span className="text-stone-200 font-semibold">{tutor.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Subject:</span>
                <span className="text-stone-200 font-semibold">{tutor.subject}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Time Slot:</span>
                <span className="text-stone-200 font-semibold">{selectedSlot}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Escrow Amount:</span>
                <span className="text-amber-400 font-bold">${tutor.hourlyRate}.00</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
              <Link href="/student/dashboard" className="px-6 py-3 bg-amber-500 text-stone-950 rounded-xl font-bold hover:bg-amber-400 transition text-sm">
                Go to Student Portal
              </Link>
              <Link href="/tutors" className="px-6 py-3 bg-stone-800 text-stone-200 rounded-xl font-semibold hover:bg-stone-700 transition text-sm">
                Find More Tutors
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left 2 Cols: Tutor Profile & Reviews */}
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-stone-900 border border-stone-800 rounded-2xl shadow-xl p-8 space-y-6">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                  <img src={tutor.avatar} alt={tutor.name} className="w-28 h-28 rounded-full object-cover border-4 border-amber-500 shadow-xl" />
                  <div className="text-center sm:text-left space-y-2">
                    <div className="flex items-center justify-center sm:justify-start gap-2">
                      <h1 className="text-3xl font-serif font-bold text-white">{tutor.name}</h1>
                      {tutor.verified && <span title="Verified ID & Credentials"><ShieldCheck className="w-6 h-6 text-amber-400" /></span>}
                    </div>
                    <p className="text-amber-400 font-semibold">{tutor.subject} Expert</p>
                    <div className="flex items-center justify-center sm:justify-start gap-4 text-xs text-stone-400">
                      <span className="flex items-center gap-1 font-semibold text-amber-400">
                        <Star className="w-4 h-4 fill-amber-400" /> {tutor.rating} ({tutor.reviewCount} reviews)
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4 text-amber-500" /> {tutor.location}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-stone-800 pt-6 space-y-6">
                  <div>
                    <h3 className="text-lg font-serif font-bold text-white mb-2">About Me</h3>
                    <p className="text-stone-300 text-sm font-light leading-relaxed">{tutor.bio}</p>
                  </div>
                  <div>
                    <h3 className="text-lg font-serif font-bold text-white mb-2">Educational Credentials</h3>
                    <p className="text-stone-300 text-sm bg-stone-950 p-4 rounded-xl border border-stone-800 flex items-center gap-3">
                      <BookOpen className="w-5 h-5 text-amber-500 shrink-0" /> {tutor.credentials}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-lg font-serif font-bold text-white mb-2">Teaching Experience</h3>
                    <p className="text-stone-300 text-sm font-light">{tutor.experience}</p>
                  </div>
                </div>
              </div>

              {/* Student Reviews */}
              <div className="bg-stone-900 border border-stone-800 rounded-2xl shadow-xl p-8 space-y-6">
                <h3 className="text-xl font-serif font-bold text-white">Student & Parent Reviews</h3>
                <div className="space-y-4">
                  <div className="p-5 bg-stone-950 rounded-xl border border-stone-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-stone-200">Jessica Miller (Parent)</span>
                      <div className="flex text-amber-400"><Star className="w-3.5 h-3.5 fill-amber-400" /><Star className="w-3.5 h-3.5 fill-amber-400" /><Star className="w-3.5 h-3.5 fill-amber-400" /><Star className="w-3.5 h-3.5 fill-amber-400" /><Star className="w-3.5 h-3.5 fill-amber-400" /></div>
                    </div>
                    <p className="text-xs text-stone-400 font-light">
                      "Absolute lifesaver! My son improved his math grade from a C to an A within 2 months. Highly professional and patient."
                    </p>
                  </div>
                  <div className="p-5 bg-stone-950 rounded-xl border border-stone-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-stone-200">David K. (Student)</span>
                      <div className="flex text-amber-400"><Star className="w-3.5 h-3.5 fill-amber-400" /><Star className="w-3.5 h-3.5 fill-amber-400" /><Star className="w-3.5 h-3.5 fill-amber-400" /><Star className="w-3.5 h-3.5 fill-amber-400" /><Star className="w-3.5 h-3.5 fill-amber-400" /></div>
                    </div>
                    <p className="text-xs text-stone-400 font-light">
                      "Explains complex concepts so clearly. The online whiteboard sessions are super effective."
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Col: Booking Widget */}
            <div className="space-y-6">
              <div className="bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl p-6 sticky top-10 space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-3xl font-serif font-bold text-amber-400">${tutor.hourlyRate}</span>
                    <span className="text-xs text-stone-400"> / hour</span>
                  </div>
                  <span className="text-xs px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 font-semibold rounded-full">
                    Escrow Protected
                  </span>
                </div>

                <form onSubmit={handleBooking} className="space-y-4">
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-stone-400 font-semibold mb-1">Your Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="John Doe"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      className="w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-sm text-stone-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-stone-400 font-semibold mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="john@example.com"
                      value={studentEmail}
                      onChange={(e) => setStudentEmail(e.target.value)}
                      className="w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-sm text-stone-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-stone-400 font-semibold mb-1">Learning Mode</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setBookingMode("Online")}
                        className={`py-2.5 text-xs font-semibold rounded-xl border transition ${bookingMode === "Online" ? "bg-amber-500 text-stone-950 border-amber-500 font-bold" : "bg-stone-950 text-stone-400 border-stone-800 hover:text-white"}`}
                      >
                        Online
                      </button>
                      <button
                        type="button"
                        onClick={() => setBookingMode("In-Person")}
                        className={`py-2.5 text-xs font-semibold rounded-xl border transition ${bookingMode === "In-Person" ? "bg-amber-500 text-stone-950 border-amber-500 font-bold" : "bg-stone-950 text-stone-400 border-stone-800 hover:text-white"}`}
                      >
                        In-Person
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-stone-400 font-semibold mb-1">Available Time Slot</label>
                    <select
                      value={selectedSlot}
                      onChange={(e) => setSelectedSlot(e.target.value)}
                      className="w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-sm text-stone-200 focus:outline-none focus:border-amber-500"
                    >
                      {tutor.availability.map((slot) => (
                        <option key={slot} value={slot}>{slot}</option>
                      ))}
                    </select>
                  </div>

                  <div className="p-4 bg-stone-950 rounded-xl border border-stone-800 text-xs space-y-2">
                    <div className="flex justify-between font-medium text-stone-300">
                      <span>Hourly Fee</span>
                      <span>${tutor.hourlyRate}.00</span>
                    </div>
                    <div className="flex justify-between text-stone-500">
                      <span>Platform Escrow Fee</span>
                      <span>$0.00</span>
                    </div>
                    <div className="border-t border-stone-800 pt-2 flex justify-between font-bold text-sm text-white">
                      <span>Total Secure Payment</span>
                      <span className="text-amber-400">${tutor.hourlyRate}.00</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 text-sm"
                  >
                    <Lock className="w-4 h-4" /> Book & Pay Securely in Escrow
                  </button>

                  <p className="text-[10px] text-center text-stone-500 leading-relaxed">
                    Funds are held safely in escrow and only released after successful lesson completion. Direct support: +211 920 500 155.
                  </p>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
