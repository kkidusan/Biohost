// app/student/layout.tsx
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebaseconfig";
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc, setDoc } from "firebase/firestore";
import {
  LayoutDashboard,
  Calendar,
  User,
  MessageSquare,
  BookOpen,
  CreditCard,
  Settings,
  Loader2,
  BellRing,
  Check,
  ShieldCheck
} from "lucide-react";

interface AttendanceRequest {
  id: string;
  studentId: string;
  studentName: string;
  tutorName: string;
  dayNum: number;
  pin: string;
  status: string;
}

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, user, loading } = useAuth();
  const pathname = usePathname();

  const [pendingRequests, setPendingRequests] = useState<AttendanceRequest[]>([]);
  const [enteringPin, setEnteringPin] = useState<{ [reqId: string]: string }>({});

  useEffect(() => {
    if (!loading) {
      if (!isLoggedIn) {
        window.location.href = "/login";
      } else if (user?.role === "tutor") {
        window.location.href = "/tutor/dashboard";
      }
    }
  }, [loading, isLoggedIn, user]);

  // Real-time listener for pending attendance requests in student layout
  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, "attendanceRequests"),
      where("status", "==", "Pending")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: AttendanceRequest[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (
          data.studentId === user.uid ||
          data.studentEmail === user.email ||
          data.studentName?.toLowerCase() === user.fullName?.toLowerCase()
        ) {
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
    }, (err) => {
      console.error("Error listening to attendance requests:", err);
    });

    return () => unsubscribe();
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

      // 2. Mark day as completed in packageProgress using req.studentId (booking id)
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

      // Also update for user.uid
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
      alert(`Successfully accepted attendance for Day ${req.dayNum}!`);
    } catch (err) {
      console.error("Error accepting attendance:", err);
      alert("Failed to accept attendance.");
    }
  };

  const sidebarLinks = [
    { name: "Overview", href: "/student/dashboard", icon: LayoutDashboard },
    { name: "My Schedules", href: "/student/sessions", icon: Calendar },
    { name: "Profile", href: "/student/profile", icon: User },
    { name: "Messages & AI", href: "/student/messages", icon: MessageSquare },
    { name: "Materials", href: "/student/materials", icon: BookOpen },
    { name: "Payments & Wallet", href: "/student/billing", icon: CreditCard },
    { name: "Settings", href: "/student/settings", icon: Settings },
  ];

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-stone-950 text-stone-100 flex overflow-hidden relative">
      {/* Left Sidebar - Independent Scrolling */}
      <aside className="w-64 bg-stone-900 border-r border-stone-800 p-6 hidden lg:flex flex-col justify-between shrink-0 sticky top-0 h-[calc(100vh-5rem)] overflow-y-auto">
        <div className="space-y-6">
          <nav className="space-y-1 pt-2">
            {sidebarLinks.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${
                    isActive
                      ? "bg-amber-500 text-stone-950 font-bold shadow-lg shadow-amber-500/20"
                      : "text-stone-300 hover:bg-stone-800 hover:text-white"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-stone-950" : "text-amber-500"}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="pt-6 border-t border-stone-800 text-xs text-stone-500">
          Biruh Tutors Escrow Hub
        </div>
      </aside>

      {/* Main Content Area - Independent Scrolling */}
      <main className="flex-1 p-6 md:p-10 h-[calc(100vh-5rem)] overflow-y-auto relative">
        {loading ? (
          <div className="absolute inset-0 bg-stone-950 flex items-center justify-center z-50">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          </div>
        ) : null}
        {children}
      </main>

      {/* Global Real-time Attendance Verification Modal Popup (Covers all student pages) */}
      {pendingRequests.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-stone-900 border border-amber-500/50 rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                <BellRing className="w-6 h-6 animate-bounce" />
              </div>
              <div>
                <span className="text-amber-500 text-[10px] font-semibold tracking-widest uppercase">Action Required</span>
                <h2 className="text-2xl font-serif font-bold text-white mt-0.5">Attendance Verification</h2>
              </div>
            </div>

            <div className="space-y-4">
              {pendingRequests.map((req) => (
                <div key={req.id} className="bg-stone-950 p-5 rounded-xl border border-stone-800 space-y-4">
                  <p className="text-xs text-stone-300">
                    Your tutor <strong className="text-amber-400 font-semibold">{req.tutorName}</strong> has sent an attendance confirmation request for <strong className="text-emerald-400">Day {req.dayNum}</strong>.
                  </p>

                  <div className="space-y-2 pt-2 border-t border-stone-800">
                    <label className="block text-xs font-semibold text-stone-300">Enter 4-Digit PIN provided by Tutor</label>
                    <div className="flex gap-3">
                      <input
                        type="text"
                        maxLength={4}
                        placeholder="PIN"
                        value={enteringPin[req.id] || ""}
                        onChange={(e) => setEnteringPin({ ...enteringPin, [req.id]: e.target.value })}
                        className="w-32 px-4 py-3 bg-stone-900 border border-stone-800 rounded-xl text-sm text-stone-200 font-mono tracking-widest text-center focus:outline-none focus:border-amber-500"
                      />
                      <button
                        onClick={() => handleAcceptAttendance(req)}
                        className="flex-1 px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <ShieldCheck className="w-4 h-4" /> Accept Attendance
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
