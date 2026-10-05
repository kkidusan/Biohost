"use client";
// app/tutor/calendar/page.tsx
import React, { useState, useEffect } from "react";
import { Calendar as CalendarIcon, Clock, Plus, Check, X, Users, User, Mail, BookOpen } from "lucide-react";
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
  escrowStatus: string;
}

interface StudentProfile {
  id: string;
  fullName: string;
  email: string;
  gradeLevel: string;
  avatar: string;
  schedules: { day: string; timeSlot: string }[];
  subjects: string[];
}

export default function TutorCalendarPage() {
  const { user } = useAuth();
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const currentDateNum = today.getDate();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const currentMonthName = monthNames[currentMonth];
  const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const [activeDay, setActiveDay] = useState<number>(currentDateNum);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [modalOpen, setModalOpen] = useState(false); // Add Activity Modal
  const [detailsModalOpen, setDetailsModalOpen] = useState(false); // Date Details Modal
  const [dayActivities, setDayActivities] = useState<{ [day: number]: string[] }>({
    [currentDateNum]: ["Live tutoring session at 3:00 PM"]
  });
  const [newActivity, setNewActivity] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // 1. Fetch bookings
        const bSnap = await getDocs(collection(db, "bookings"));
        const bList: Booking[] = [];
        bSnap.forEach((docSnap) => {
          const data = docSnap.data();
          const matchesTutor = user && (
            data.tutorId === user.uid ||
            data.tutorName?.toLowerCase() === user.fullName?.toLowerCase() ||
            user.role === "admin"
          );
          if (matchesTutor || !user) {
            bList.push({
              id: docSnap.id,
              tutorId: data.tutorId || "",
              tutorName: data.tutorName || "",
              studentName: data.studentName || "Student",
              studentEmail: data.studentEmail || "",
              subject: data.subject || "General",
              date: data.date || "",
              timeSlot: data.timeSlot || "3:00 PM",
              escrowStatus: data.escrowStatus || "Held in Escrow",
            });
          }
        });
        setBookings(bList);

        // 2. Fetch student profiles (customers where role === "student")
        const custSnap = await getDocs(collection(db, "customers"));
        const sList: StudentProfile[] = [];
        custSnap.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.role === "student") {
            sList.push({
              id: docSnap.id,
              fullName: data.fullName || data.name || "Student",
              email: data.email || "",
              gradeLevel: data.gradeLevel || "High School",
              avatar: data.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
              schedules: data.schedules && Array.isArray(data.schedules) ? data.schedules : [],
              subjects: data.subjects && Array.isArray(data.subjects) ? data.subjects : ["Mathematics"],
            });
          }
        });
        setStudents(sList);

      } catch (err) {
        console.error("Error fetching calendar data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  // Compute day of week name (e.g. "Monday") for activeDay
  const activeDateObj = new Date(currentYear, currentMonth, activeDay);
  const activeDayName = activeDateObj.toLocaleDateString("en-US", { weekday: "long" });
  const activeDateFormatted = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(activeDay).padStart(2, "0")}`;

  const matchedBookings = bookings.filter(b => b.date === activeDateFormatted);
  const matchedStudentSchedules = students.flatMap(st => 
    st.schedules
      .filter(sch => sch.day.toLowerCase() === activeDayName.toLowerCase())
      .map(sch => ({ student: st, timeSlot: sch.timeSlot }))
  );

  const handleDayClick = (dayNum: number) => {
    setActiveDay(dayNum);
    setDetailsModalOpen(true);
  };

  const handleAddActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActivity.trim()) return;
    const currentList = dayActivities[activeDay] || [];
    setDayActivities({
      ...dayActivities,
      [activeDay]: [...currentList, newActivity.trim()]
    });
    setNewActivity("");
    setModalOpen(false);
  };

  const handleRemoveActivity = (index: number) => {
    const currentList = dayActivities[activeDay] || [];
    setDayActivities({
      ...dayActivities,
      [activeDay]: currentList.filter((_, i) => i !== index)
    });
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto text-[11px]">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-xl space-y-3">
        {/* Top Header with Add Activity Button at Top Right */}
        <div className="flex justify-between items-center border-b border-stone-800 pb-2.5">
          <div>
            <h3 className="font-serif font-bold text-white text-xs flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-amber-500" /> {currentMonthName} {currentYear} Master Calendar
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-amber-400 font-mono text-[10px] font-bold bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/30">
              Today: {currentMonthName} {currentDateNum}
            </span>
            <button
              type="button"
              onClick={() => {
                setNewActivity("");
                setModalOpen(true);
              }}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-lg text-[11px] flex items-center gap-1 transition shadow cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add Activity
            </button>
          </div>
        </div>

        <div className="bg-stone-950 p-4 rounded-xl border border-stone-800">
          {/* Compact Monthly Calendar Date Grid */}
          <div className="grid grid-cols-7 sm:grid-cols-10 md:grid-cols-11 gap-1.5">
            {Array.from({ length: daysInCurrentMonth }, (_, i) => i + 1).map((dayNum) => {
              const isSelected = activeDay === dayNum;
              const isToday = currentDateNum === dayNum;
              const dateObj = new Date(currentYear, currentMonth, dayNum);
              const dayName = dateObj.toLocaleDateString("en-US", { weekday: "long" });
              const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
              
              const hasBookings = bookings.some(b => b.date === dateStr);
              const hasStudentSchedules = students.some(st => st.schedules.some(sch => sch.day.toLowerCase() === dayName.toLowerCase()));
              const hasActivities = (dayActivities[dayNum] && dayActivities[dayNum].length > 0) || hasBookings || hasStudentSchedules;

              return (
                <button
                  key={dayNum}
                  onClick={() => handleDayClick(dayNum)}
                  className={`h-10 rounded-lg border font-mono text-[11px] font-bold transition flex flex-col items-center justify-center cursor-pointer relative ${
                    isSelected
                      ? "bg-amber-500 text-stone-950 border-amber-400 shadow-md shadow-amber-500/10 scale-105"
                      : isToday
                      ? "bg-stone-800 border-amber-500 text-amber-400"
                      : hasActivities
                      ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                      : "bg-stone-900 border-stone-800 text-stone-400 hover:border-amber-500/50 hover:text-white"
                  }`}
                >
                  <span className="text-[8px] text-stone-400 uppercase">{currentMonthName.slice(0, 3)}</span>
                  <span className="text-xs font-bold">{dayNum}</span>
                  {hasActivities && <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-emerald-400"></span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Centered Date Details Modal Card (Shown on click of any date box) */}
      {detailsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative space-y-6 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setDetailsModalOpen(false)}
              className="absolute top-6 right-6 text-stone-400 hover:text-white p-1 rounded-lg bg-stone-950 border border-stone-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-amber-500 text-[10px] font-semibold tracking-widest uppercase">Schedule Details</span>
              <h2 className="text-xl font-serif font-bold text-white mt-0.5">
                {currentMonthName} {activeDay}, {currentYear} ({activeDayName})
              </h2>
              <p className="text-stone-400 text-xs font-light mt-0.5">Scheduled students and activities for this date.</p>
            </div>

            <div className="space-y-3">
              {matchedBookings.length === 0 && matchedStudentSchedules.length === 0 && (!dayActivities[activeDay] || dayActivities[activeDay].length === 0) ? (
                <p className="text-stone-500 text-xs italic py-4 text-center">No students or activities scheduled for {activeDayName}, {currentMonthName} {activeDay}.</p>
              ) : (
                <>
                  {/*  */}

                  {/* Student Profile Weekly Schedule Match */}
                  {matchedStudentSchedules.map((item, idx) => (
                    <div key={`ms-${idx}`} className="p-3.5 bg-stone-950 border border-stone-800 rounded-xl flex justify-between items-center gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full overflow-hidden border border-stone-800 shrink-0">
                          <img src={item.student.avatar} alt="Avatar" className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <h5 className="font-serif font-bold text-white text-xs">{item.student.fullName} (Availability)</h5>
                          <p className="text-[10px] text-stone-400 font-mono">{item.student.email} | Grade: {item.student.gradeLevel}</p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-lg font-mono text-[10px] font-semibold">
                        {item.timeSlot}
                      </span>
                    </div>
                  ))}

                  {/* Manual Activities */}
                  {dayActivities[activeDay]?.map((act, index) => (
                    <div key={`act-${index}`} className="p-3 bg-stone-950 border border-stone-800 rounded-xl flex justify-between items-center text-xs font-mono">
                      <span className="text-stone-200 font-medium flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-amber-500" /> {act}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveActivity(index)}
                        className="text-stone-500 hover:text-red-400 transition cursor-pointer text-xs"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setDetailsModalOpen(false)}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Centered Add Activity Modal Card */}
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
              <span className="text-amber-500 text-xs font-semibold tracking-widest uppercase">Schedule Hub</span>
              <h2 className="text-2xl font-serif font-bold text-white mt-1">Add Activity for {currentMonthName} {activeDay}, {currentYear}</h2>
              <p className="text-stone-400 text-xs font-light mt-0.5">Enter lesson details or reminders for this date.</p>
            </div>

            <form onSubmit={handleAddActivity} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-stone-300">Activity / Lesson Description</label>
                <input
                  type="text"
                  placeholder="e.g. Mathematics Tutoring at 3:00 PM"
                  value={newActivity}
                  onChange={(e) => setNewActivity(e.target.value)}
                  className="w-full p-3 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                  required
                  autoFocus
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
                  <Check className="w-4 h-4" /> Save Activity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
