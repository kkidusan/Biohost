"use client";
// app/student/dashboard/page.tsx
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { initialBookings, Booking } from "../../lib/platformData";
import { Calendar, Clock, DollarSign, CheckCircle, Video, ShieldCheck, Loader2, BellRing, Check, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebaseconfig";
import { collection, query, where, getDocs, doc, updateDoc, getDoc, setDoc } from "firebase/firestore";

interface AttendanceRequest {
  id: string;
  studentId: string;
  studentName: string;
  tutorName: string;
  dayNum: number;
  pin: string;
  status: string;
}

export default function StudentDashboard() {
  const { isLoggedIn, user } = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [pendingRequests, setPendingRequests] = useState<AttendanceRequest[]>([]);
  const [enteringPin, setEnteringPin] = useState<{ [reqId: string]: string }>({});

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace("/login");
    } else if (user?.role === "tutor") {
      router.replace("/tutor/dashboard");
    }
  }, [isLoggedIn, user, router]);

  useEffect(() => {
    const fetchAttendanceRequests = async () => {
      if (!user?.uid) return;
      try {
        const q = query(
          collection(db, "attendanceRequests"),
          where("status", "==", "Pending")
        );
        const snapshot = await getDocs(q);
        const list: AttendanceRequest[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.studentId === user.uid || data.studentEmail === user.email || data.studentName?.toLowerCase() === user.fullName?.toLowerCase()) {
            list.push({
              id: docSnap.id,
              studentId: data.studentId,
              studentName: data.studentName,
              tutorName: data.tutorName,
              dayNum: data.dayNum,
              pin: data.pin || "1234",
              status: data.status,
            });
          }
        });
        setPendingRequests(list);
      } catch (err) {
        console.error("Error fetching attendance requests:", err);
      }
    };

    if (user?.uid) {
      fetchAttendanceRequests();
    }
  }, [user]);

  const handleAcceptAttendance = async (req: AttendanceRequest) => {
    const userPin = enteringPin[req.id] || "";
    if (req.pin && req.pin !== "1234" && userPin !== req.pin) {
      alert("Incorrect 4-digit PIN provided. Please check with your tutor.");
      return;
    }

    try {
      // 1. Update attendance request status to Accepted
      await updateDoc(doc(db, "attendanceRequests", req.id), { status: "Accepted" });

      // 2. Mark day as completed in packageProgress using req.studentId (booking id matching tutor schedule page)
      const progDocRef = doc(db, "packageProgress", req.studentId);
      const progSnap = await getDoc(progDocRef);
      let completedDays: { [day: number]: boolean } = {};
      if (progSnap.exists()) {
        completedDays = progSnap.data().completedDays || {};
      }
      completedDays[req.dayNum] = true;

      await setDoc(progDocRef, {
        studentId: req.studentId,
        completedDays,
        updatedAt: new Date().toISOString(),
      });

      // Also update for user.uid just in case
      if (user?.uid) {
        const userProgRef = doc(db, "packageProgress", user.uid);
        const userProgSnap = await getDoc(userProgRef);
        let userCompletedDays: { [day: number]: boolean } = {};
        if (userProgSnap.exists()) {
          userCompletedDays = userProgSnap.data().completedDays || {};
        }
        userCompletedDays[req.dayNum] = true;
        await setDoc(userProgRef, {
          studentId: user.uid,
          completedDays: userCompletedDays,
          updatedAt: new Date().toISOString(),
        });
      }

      setPendingRequests(pendingRequests.filter(r => r.id !== req.id));
      alert(`Successfully accepted attendance for Day ${req.dayNum}! Marked as completed on both tutor and student schedules.`);
    } catch (err) {
      console.error("Error accepting attendance:", err);
      alert("Failed to accept attendance.");
    }
  };

  if (!isLoggedIn || user?.role === "tutor") {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  const handleCancel = (id: string) => {
    setBookings(bookings.map(b => b.id === id ? { ...b, status: "Cancelled", escrowStatus: "Refunded" } : b));
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 font-sans selection:bg-amber-500 selection:text-stone-950 py-10 px-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-amber-500 text-xs font-semibold tracking-widest uppercase">Student Portal</span>
            <h1 className="text-3xl font-serif font-bold text-white mt-1">Welcome, {user?.fullName || "Student"}</h1>
            <p className="text-stone-400 text-sm font-light mt-1">Manage your booked tutoring sessions, escrow protected funds, and virtual classrooms.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/student/sessions" className="px-5 py-2.5 bg-stone-800 text-stone-200 rounded-full text-sm font-semibold hover:bg-stone-700 transition border border-stone-700">
              Timetable & Progress
            </Link>
            <Link href="/tutors" className="px-5 py-2.5 bg-amber-500 text-stone-950 rounded-full text-sm font-bold hover:bg-amber-400 transition shadow-lg shadow-amber-500/20">
              Find New Tutors
            </Link>
          </div>
        </div>

        {/* Pending Attendance Verification Requests Pop-up Banner */}
        {pendingRequests.length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/40 rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in duration-300">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                <BellRing className="w-5 h-5 animate-bounce" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-lg text-white">Attendance Verification Request Pending</h3>
                <p className="text-xs text-stone-300">Your tutor has requested attendance confirmation for your 90-day package progress.</p>
              </div>
            </div>

            <div className="space-y-3">
              {pendingRequests.map((req) => (
                <div key={req.id} className="bg-stone-950/80 p-4 rounded-xl border border-stone-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <p className="text-xs text-white">Tutor <strong className="text-amber-400">{req.tutorName}</strong> requests confirmation for <strong className="text-emerald-400">Day {req.dayNum}</strong>.</p>
                    <p className="text-[10px] text-stone-400 font-mono mt-0.5">Accepting will mark Day {req.dayNum} as completed on your timetable.</p>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <input
                      type="text"
                      maxLength={4}
                      placeholder="Enter PIN"
                      value={enteringPin[req.id] || ""}
                      onChange={(e) => setEnteringPin({ ...enteringPin, [req.id]: e.target.value })}
                      className="w-24 px-3 py-2 bg-stone-900 border border-stone-800 rounded-xl text-xs text-stone-200 font-mono tracking-widest text-center"
                    />
                    <button
                      onClick={() => handleAcceptAttendance(req)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition shadow flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Check className="w-3.5 h-3.5" /> Accept
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-stone-900 border border-stone-800 p-6 rounded-2xl shadow-xl space-y-2">
            <span className="text-xs uppercase tracking-wider text-stone-400 font-semibold">Total Bookings</span>
            <p className="text-4xl font-serif font-bold text-amber-400">{bookings.length}</p>
          </div>
          <div className="bg-stone-900 border border-stone-800 p-6 rounded-2xl shadow-xl space-y-2">
            <span className="text-xs uppercase tracking-wider text-stone-400 font-semibold">Escrow Protected Funds</span>
            <p className="text-4xl font-serif font-bold text-amber-400">
              ${bookings.filter(b => b.escrowStatus === "Held in Escrow").reduce((acc, b) => acc + b.amount, 0)}.00
            </p>
          </div>
          <div className="bg-stone-900 border border-stone-800 p-6 rounded-2xl shadow-xl space-y-2">
            <span className="text-xs uppercase tracking-wider text-stone-400 font-semibold">Completed Lessons</span>
            <p className="text-4xl font-serif font-bold text-amber-400">
              {bookings.filter(b => b.status === "Completed").length}
            </p>
          </div>
        </div>

        {/* Bookings List */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="px-6 py-5 border-b border-stone-800 font-serif font-bold text-xl text-white">
            My Booked Sessions & Escrow Status
          </div>
          <div className="divide-y divide-stone-800">
            {bookings.map((booking) => (
              <div key={booking.id} className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-3">
                    <h3 className="font-serif font-bold text-lg text-white">{booking.tutorName}</h3>
                    <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
                      booking.status === "Confirmed" ? "bg-amber-500/10 text-amber-400 border border-amber-500/30" :
                      booking.status === "Cancelled" ? "bg-red-500/10 text-red-400 border border-red-500/30" :
                      "bg-blue-500/10 text-blue-400 border border-blue-500/30"
                    }`}>
                      {booking.status}
                    </span>
                  </div>
                  <p className="text-xs text-stone-300 font-light">
                    Subject: <strong className="text-stone-100">{booking.subject}</strong> | Mode: <strong className="text-stone-100">{booking.learningMode}</strong>
                  </p>
                  <p className="text-xs text-stone-400 flex items-center gap-2 font-mono">
                    <Calendar className="w-3.5 h-3.5 text-amber-500" /> {booking.date} at {booking.timeSlot}
                  </p>
                </div>

                <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
                  <div className="text-right">
                    <span className="text-lg font-serif font-bold text-amber-400">${booking.amount}.00</span>
                    <p className="text-[10px] text-amber-500/80 font-semibold">{booking.escrowStatus}</p>
                  </div>
                  {booking.status === "Confirmed" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => alert("Launching Secure Virtual Classroom... Connected via Biruh Tutors.")}
                        className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow-lg shadow-amber-500/20"
                      >
                        <Video className="w-4 h-4" /> Join Lesson
                      </button>
                      <button
                        onClick={() => handleCancel(booking.id)}
                        className="px-3.5 py-2.5 bg-stone-800 hover:bg-red-950 text-stone-300 hover:text-red-400 border border-stone-700 rounded-xl text-xs font-semibold transition"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
