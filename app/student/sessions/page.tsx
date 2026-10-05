"use client";
// app/student/sessions/page.tsx
import React, { useState, useEffect } from "react";
import { Loader2, Check } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebaseconfig";
import { doc, getDoc, onSnapshot } from "firebase/firestore";

export default function StudentSessionsPage() {
  const { user } = useAuth();
  const [completedDays, setCompletedDays] = useState<{ [day: number]: boolean }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    // Fetch initial progress
    const fetchProgress = async () => {
      try {
        const progDocRef = doc(db, "packageProgress", user.uid);
        const progSnap = await getDoc(progDocRef);
        if (progSnap.exists()) {
          const data = progSnap.data();
          if (data.completedDays) {
            setCompletedDays(data.completedDays);
          }
        }
      } catch (err) {
        console.error("Error fetching progress:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProgress();

    // Real-time listener for progress updates
    const progDocRef = doc(db, "packageProgress", user.uid);
    const unsubscribe = onSnapshot(progDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.completedDays) {
          setCompletedDays(data.completedDays);
        }
      }
    });

    return () => unsubscribe();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full px-4 sm:px-6 lg:px-8 mx-auto text-xs">
      <div>
        <span className="text-amber-500 text-[10px] font-semibold tracking-widest uppercase">Student Hub</span>
        <h1 className="text-2xl font-serif font-bold text-white mt-0.5">My Timetable & 90-Day Progress</h1>
        <p className="text-stone-400 text-xs font-light mt-0.5">
          View your verified daily attendance and package progress synced live with your tutor.
        </p>
      </div>

      <div className="space-y-6 w-full">
        <div className="bg-stone-900 border border-stone-800 rounded-xl p-6 shadow-xl space-y-4 w-full">
          <div className="bg-stone-950 p-4 rounded-xl border border-stone-800 w-full">
            <div className="grid grid-cols-10 sm:grid-cols-15 md:grid-cols-18 lg:grid-cols-20 gap-2">
              {Array.from({ length: 90 }, (_, i) => i + 1).map((dayNum) => {
                const isDone = !!completedDays[dayNum];
                return (
                  <div
                    key={dayNum}
                    className={`h-9 rounded-lg border font-mono text-[11px] font-bold transition flex flex-col items-center justify-center ${
                      isDone
                        ? "bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-md shadow-emerald-500/10"
                        : "bg-stone-900 border-stone-800 text-stone-600"
                    }`}
                  >
                    <span>{dayNum}</span>
                    {isDone && <Check className="w-3 h-3 text-emerald-400" />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
