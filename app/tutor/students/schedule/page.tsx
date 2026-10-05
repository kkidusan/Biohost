"use client";
// app/tutor/students/schedule/page.tsx
import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Calendar, Video, Clock, Check, ArrowLeft, Loader2, Play, Send, ShieldCheck, X } from "lucide-react";
import { db } from "../../../firebaseconfig";
import { doc, getDoc, setDoc, addDoc, collection, onSnapshot } from "firebase/firestore";
import { useAuth } from "../../../context/AuthContext";

function ScheduleContent() {
  const searchParams = useSearchParams();
  const studentId = searchParams.get("id") || "1";
  const studentName = searchParams.get("name") || "Student";
  const subject = searchParams.get("subject") || "General Tutoring";

  const { user } = useAuth();
  const [completedDays, setCompletedDays] = useState<{ [day: number]: boolean }>({});
  const [loading, setLoading] = useState(true);

  // Attendance Request Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [pinCode, setPinCode] = useState("");
  const [selectedDay, setZSelectedDay] = useState(1);

  useEffect(() => {
    // Real-time Firestore sync for package progress
    const progDocRef = doc(db, "packageProgress", studentId);
    const unsubscribe = onSnapshot(progDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.completedDays) {
          setCompletedDays(data.completedDays);
        }
      }
      setLoading(false);
    }, (err) => {
      console.error("Error syncing progress in real-time:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [studentId]);

  const handleDayClick = (dayNum: number) => {
    if (completedDays[dayNum]) {
      alert(`Day ${dayNum} is already verified and marked as completed.`);
      return;
    }
    // Sequential validation
    if (dayNum > 1 && !completedDays[dayNum - 1]) {
      alert(`Please complete Day ${dayNum - 1} first before requesting attendance for Day ${dayNum}.`);
      return;
    }

    setZSelectedDay(dayNum);
    setPinCode("");
    setModalOpen(true);
  };

  const handleSendAttendanceRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "attendanceRequests"), {
        studentId,
        studentName,
        tutorName: user?.fullName || "Tutor",
        dayNum: selectedDay,
        pin: pinCode || "1234",
        status: "Pending",
        createdAt: new Date().toISOString(),
      });
      alert(`Attendance request for Day ${selectedDay} successfully sent to ${studentName}!`);
      setModalOpen(false);
    } catch (err) {
      console.error("Error sending attendance request:", err);
      alert("Failed to send attendance request.");
    }
  };

  const completedCount = Object.values(completedDays).filter(Boolean).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto text-xs relative">
      <div className="flex items-center justify-between border-b border-stone-800 pb-4">
        <div>
          <Link href="/tutor/students" className="inline-flex items-center gap-1 text-amber-400 hover:underline text-[11px]">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Students Directory
          </Link>
        </div>
      </div>

      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h3 className="font-serif font-bold text-white text-sm">90-Day Package Daily Progress Tracker ({studentName})</h3>
            <p className="text-stone-400 text-[11px]">Click any active day box below to instantly send an attendance verification request to the student.</p>
          </div>
          <span className="text-amber-400 font-mono text-xs font-bold bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/30">
            Completed: {completedCount} / 90 Days
          </span>
        </div>

        <div className="bg-stone-950 p-4 rounded-xl border border-stone-800">
          <div className="grid grid-cols-10 sm:grid-cols-15 md:grid-cols-18 lg:grid-cols-20 gap-2">
            {Array.from({ length: 90 }, (_, i) => i + 1).map((dayNum) => {
              const isDone = !!completedDays[dayNum];
              const isDisabled = dayNum > 1 && !completedDays[dayNum - 1] && !isDone;

              return (
                <button
                  key={dayNum}
                  disabled={isDisabled}
                  onClick={() => handleDayClick(dayNum)}
                  title={`Day ${dayNum} ${isDone ? "(Completed)" : isDisabled ? "(Locked)" : "(Click to Send Attendance Request)"}`}
                  className={`h-9 rounded-lg border font-mono text-[11px] font-bold transition flex flex-col items-center justify-center ${
                    isDone
                      ? "bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-md shadow-emerald-500/10 cursor-pointer"
                      : isDisabled
                      ? "bg-stone-950 border-stone-900 text-stone-700 opacity-40 cursor-not-allowed"
                      : "bg-stone-900 border-stone-800 text-amber-400 hover:border-amber-500 hover:bg-amber-500/10 cursor-pointer"
                  }`}
                >
                  <span>{dayNum}</span>
                  {isDone && <Check className="w-3 h-3 text-emerald-400" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Centered Attendance Verification Modal Card */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative space-y-6">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-6 right-6 text-stone-400 hover:text-white p-1 rounded-lg bg-stone-950 border border-stone-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-amber-500 text-xs font-semibold tracking-widest uppercase">Attendance Verification</span>
              <h2 className="text-2xl font-serif font-bold text-white mt-1">Send Request to {studentName}</h2>
              <p className="text-stone-400 text-xs font-light mt-0.5">Requesting attendance confirmation for <strong className="text-amber-400">Day {selectedDay}</strong>.</p>
            </div>

            <form onSubmit={handleSendAttendanceRequest} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-stone-300">Selected Day Number</label>
                <input
                  type="number"
                  value={selectedDay}
                  readOnly
                  className="w-full p-3 bg-stone-950 border border-stone-800 rounded-xl text-xs text-amber-400 font-mono font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-stone-300">4-Digit Verification PIN (Optional)</label>
                <input
                  type="text"
                  maxLength={4}
                  placeholder="e.g. 4829"
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value)}
                  className="w-full p-3 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-200 focus:outline-none focus:border-amber-500 font-mono tracking-widest text-center text-base"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-xl text-xs font-bold transition shadow cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" /> Send Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TutorStudentSchedulePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    }>
      <ScheduleContent />
    </Suspense>
  );
}
