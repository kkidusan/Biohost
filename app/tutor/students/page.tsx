"use client";
// app/tutor/students/page.tsx
import React, { useState, useEffect } from "react";
import { Users, Calendar, Loader2, Play, User, Mail, X, BookOpen, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebaseconfig";
import { collection, getDocs } from "firebase/firestore";

interface Booking {
  id: string;
  tutorId: string;
  tutorName: string;
  studentName: string;
  studentEmail: string;
  subject: string;
  date: string;
  timeSlot: string;
  amount: number;
  status: string;
  escrowStatus: string;
}

interface ScheduleRule {
  day: string;
  timeSlot: string;
}

interface StudentProfileDetails {
  subjects: string[];
  schedules: ScheduleRule[];
  gradeLevel?: string;
  learningMode?: string;
  location?: string;
  bio?: string;
  avatar?: string;
}

export default function TutorStudentsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [students, setStudents] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state for student profile
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Booking | null>(null);
  const [studentProfileData, setStudentProfileData] = useState<StudentProfileDetails | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  useEffect(() => {
    const fetchAssignedStudents = async () => {
      try {
        setLoading(true);
        const snapshot = await getDocs(collection(db, "bookings"));
        const list: Booking[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const matchesTutor = user && (
            data.tutorId === user.uid ||
            data.tutorName?.toLowerCase() === user.fullName?.toLowerCase() ||
            user.role === "admin"
          );

          if (matchesTutor || !user) {
            list.push({
              id: docSnap.id,
              tutorId: data.tutorId || "",
              tutorName: data.tutorName || "Tutor",
              studentName: data.studentName || "Student",
              studentEmail: data.studentEmail || "",
              subject: data.subject || "General Tutoring",
              date: data.date || "",
              timeSlot: data.timeSlot || "",
              amount: data.amount || 45,
              status: data.status || "Confirmed",
              escrowStatus: data.escrowStatus || "Held in Escrow",
            });
          }
        });
        setStudents(list);
      } catch (err) {
        console.error("Error fetching assigned students from database:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAssignedStudents();
  }, [user]);

  const handleStartSession = (st: Booking) => {
    router.push(`/tutor/students/schedule?id=${st.id}&name=${encodeURIComponent(st.studentName)}&subject=${encodeURIComponent(st.subject)}`);
  };

  const handleOpenProfile = async (st: Booking) => {
    setSelectedStudent(st);
    setProfileModalOpen(true);
    setLoadingProfile(true);
    setStudentProfileData(null);
    try {
      const custSnap = await getDocs(collection(db, "customers"));
      let found: any = null;
      custSnap.forEach((docSnap) => {
        const data = docSnap.data();
        if (
          docSnap.id === st.id ||
          (data.email && st.studentEmail && data.email.toLowerCase() === st.studentEmail.toLowerCase()) ||
          (data.fullName && st.studentName && data.fullName.toLowerCase() === st.studentName.toLowerCase())
        ) {
          found = data;
        }
      });

      if (found) {
        setStudentProfileData({
          subjects: found.subjects && Array.isArray(found.subjects) ? found.subjects : [st.subject],
          schedules: found.schedules && Array.isArray(found.schedules) ? found.schedules : [{ day: "Monday", timeSlot: st.timeSlot || "3:00 PM - 5:00 PM" }],
          gradeLevel: found.gradeLevel,
          learningMode: found.learningMode,
          location: found.location,
          bio: found.bio,
          avatar: found.avatar,
        });
      } else {
        setStudentProfileData({
          subjects: [st.subject],
          schedules: [{ day: "Monday", timeSlot: st.timeSlot || "3:00 PM - 5:00 PM" }],
        });
      }
    } catch (err) {
      console.error("Error fetching student profile:", err);
      setStudentProfileData({
        subjects: [st.subject],
        schedules: [{ day: "Monday", timeSlot: st.timeSlot || "3:00 PM - 5:00 PM" }],
      });
    } finally {
      setLoadingProfile(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto text-[11px]">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-stone-950 text-stone-400 uppercase tracking-wider text-[10px] border-b border-stone-800">
              <tr>
                <th className="py-3 px-4 font-semibold w-1/4">Student Name</th>
                <th className="py-3 px-4 font-semibold w-1/3">Email</th>
                <th className="py-3 px-4 font-semibold w-1/4">Schedule</th>
                <th className="py-3 px-4 font-semibold text-right w-[150px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800 text-stone-300">
              {students.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-stone-500">
                    No assigned students found in database. Assign students from the admin portal!
                  </td>
                </tr>
              ) : (
                students.map((st) => (
                  <tr key={st.id} className="hover:bg-stone-950/40 transition">
                    <td className="py-3 px-4 font-semibold text-white text-xs align-middle">
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-[10px] shrink-0">
                          {st.studentName[0]}
                        </div>
                        <span className="truncate">{st.studentName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-stone-300 font-mono text-[11px] align-middle">
                      <div className="flex items-center gap-1.5 truncate">
                        <Mail className="w-3 h-3 text-stone-500 shrink-0" /> 
                        <span className="truncate">{st.studentEmail}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-stone-400 font-mono text-[11px] align-middle">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-amber-500 shrink-0" /> 
                        <span className="truncate">{st.date} ({st.timeSlot})</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right align-middle whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenProfile(st)}
                          className="px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-[10px] font-semibold inline-flex items-center gap-1 transition cursor-pointer"
                        >
                          <User className="w-3 h-3 text-amber-400" /> Profile
                        </button>
                        <button
                          onClick={() => handleStartSession(st)}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 shadow transition cursor-pointer"
                        >
                          <Play className="w-3 h-3 fill-current" /> Start
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student Profile Modal */}
      {profileModalOpen && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative space-y-6">
            <button
              onClick={() => {
                setProfileModalOpen(false);
                setSelectedStudent(null);
              }}
              className="absolute top-6 right-6 text-stone-400 hover:text-white p-1 rounded-lg bg-stone-950 border border-stone-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-2xl">
                {selectedStudent.studentName[0]}
              </div>
              <div>
                <span className="text-amber-500 text-xs font-semibold tracking-widest uppercase">Student Profile</span>
                <h2 className="text-2xl font-serif font-bold text-white mt-0.5">{selectedStudent.studentName}</h2>
                <p className="text-stone-400 text-xs font-mono">{selectedStudent.studentEmail}</p>
              </div>
            </div>

            <div className="bg-stone-950 border border-stone-800 rounded-xl p-4 space-y-4 text-xs">
              {loadingProfile ? (
                <div className="py-6 text-center">
                  <Loader2 className="w-5 h-5 text-amber-500 animate-spin mx-auto" />
                  <p className="text-stone-400 mt-2 text-[11px]">Loading profile, subjects & schedule...</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <span className="text-stone-400 font-semibold uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-amber-500" /> Subjects
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {studentProfileData?.subjects?.length ? (
                        studentProfileData.subjects.map((subj, idx) => (
                          <span key={idx} className="px-2.5 py-1 bg-stone-900 text-amber-400 border border-stone-800 rounded-lg text-[11px] font-semibold">
                            {subj}
                          </span>
                        ))
                      ) : (
                        <span className="text-stone-500">{selectedStudent.subject}</span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-stone-800">
                    <span className="text-stone-400 font-semibold uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-amber-500" /> Schedule Slots
                    </span>
                    <div className="space-y-1.5 max-h-32 overflow-y-auto">
                      {studentProfileData?.schedules?.length ? (
                        studentProfileData.schedules.map((sch, idx) => (
                          <div key={idx} className="p-2 bg-stone-900 border border-stone-800 rounded-lg flex justify-between items-center text-[11px] font-mono text-stone-300">
                            <span className="text-white font-bold">{sch.day}</span>
                            <span className="text-amber-400">{sch.timeSlot}</span>
                          </div>
                        ))
                      ) : (
                        <div className="p-2 bg-stone-900 border border-stone-800 rounded-lg text-stone-300 font-mono text-[11px]">
                          {selectedStudent.date}: {selectedStudent.timeSlot}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-stone-800 grid grid-cols-2 gap-2 text-[11px]">
                    <div className="flex justify-between border-r border-stone-800 pr-2">
                      <span className="text-stone-400">Escrow:</span>
                      <strong className="text-emerald-400">{selectedStudent.escrowStatus}</strong>
                    </div>
                    <div className="flex justify-between pl-2">
                      <span className="text-stone-400">Status:</span>
                      <strong className="text-blue-400">{selectedStudent.status}</strong>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setProfileModalOpen(false);
                  setSelectedStudent(null);
                }}
                className="px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-semibold transition"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setProfileModalOpen(false);
                  handleStartSession(selectedStudent);
                }}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-xl text-xs font-bold transition shadow flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-current" /> Start Session Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
