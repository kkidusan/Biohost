"use client";
// app/admin/sessions/page.tsx
import React, { useState, useEffect } from "react";
import { Users, Search, ShieldCheck, CheckCircle, XCircle, Award, BookOpen, UserCheck, Calendar, Loader2, ExternalLink, X, Ban, Trash2, Edit3 } from "lucide-react";
import { db } from "../../firebaseconfig";
import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc } from "firebase/firestore";

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
  status: "Pending" | "Confirmed" | "Completed" | "Cancelled";
  escrowStatus: "Held in Escrow" | "Released to Tutor" | "Refunded";
  learningMode: "Online" | "In-Person";
}

interface TransactionReceipt {
  id: string;
  studentName: string;
  studentEmail: string;
  packageName: string;
  amount: number;
  receiptUrl: string;
  status: "Pending" | "Approved" | "Rejected";
  createdAt: string;
}

interface StudentRequest {
  id: string;
  name: string;
  subject: string;
  gradeLevel: string;
  budgetMax: number;
  learningMode: "Online" | "In-Person" | "Both";
  location: string;
  description: string;
  urgency: "Immediate" | "This Week" | "Flexible";
}

interface Tutor {
  id: string;
  name: string;
  email: string;
  subject: string;
  gradeLevel: string;
  hourlyRate: number;
  status: "Active" | "Suspended";
  availability: string[];
}

export default function SessionsQualityPage() {
  const [activeTab, setActiveTab] = useState<"paid-students" | "assign-tutors">("paid-students");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [transactions, setTransactions] = useState<TransactionReceipt[]>([]);
  const [requests, setRequests] = useState<StudentRequest[]>([]);
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [selectedTutors, setSelectedTutors] = useState<{ [requestId: string]: string }>({});

  // Track assigned transaction IDs
  const [assignedTxIds, setAssignedTxIds] = useState<string[]>([]);

  // Modal state for assigning tutor to a paid student
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [currentStudentTx, setCurrentStudentTx] = useState<TransactionReceipt | null>(null);

  // Edit / Re-assign Booking Modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [currentBooking, setCurrentBooking] = useState<Booking | null>(null);
  const [editTimeSlot, setEditTimeSlot] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editTutorId, setEditTutorId] = useState("");

  useEffect(() => {
    const fetchDatabaseData = async () => {
      try {
        setLoading(true);

        // 1. Fetch bookings from Firestore
        const bookingsSnapshot = await getDocs(collection(db, "bookings"));
        const bList: Booking[] = [];
        const assignedNames: string[] = [];
        bookingsSnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          bList.push({
            id: docSnap.id,
            tutorId: data.tutorId || "",
            tutorName: data.tutorName || "Tutor",
            studentName: data.studentName || "Student",
            studentEmail: data.studentEmail || "",
            subject: data.subject || "General",
            date: data.date || new Date().toISOString().split("T")[0],
            timeSlot: data.timeSlot || "Mon 3:00 PM",
            amount: data.amount || 45,
            status: data.status || "Confirmed",
            escrowStatus: data.escrowStatus || "Held in Escrow",
            learningMode: data.learningMode || "Online",
          });
          if (data.studentName) {
            assignedNames.push(data.studentName);
          }
        });
        setBookings(bList);

        // 1.5 Fetch transactions / paid student receipts from Firestore
        const txSnapshot = await getDocs(collection(db, "transactions"));
        const txList: TransactionReceipt[] = [];
        const assignedIds: string[] = [];
        txSnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const txId = docSnap.id;
          const sName = data.studentName || "Student";
          txList.push({
            id: txId,
            studentName: sName,
            studentEmail: data.studentEmail || "",
            packageName: data.packageName || "Package",
            amount: data.amount || 0,
            receiptUrl: data.receiptUrl || "",
            status: data.status || "Pending",
            createdAt: data.createdAt || "",
          });
          if (assignedNames.includes(sName)) {
            assignedIds.push(txId);
          }
        });
        txList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setTransactions(txList);
        setAssignedTxIds(assignedIds);

        // 2. Fetch student requests from Firestore
        const reqSnapshot = await getDocs(collection(db, "studentRequests"));
        const rList: StudentRequest[] = [];
        reqSnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          rList.push({
            id: docSnap.id,
            name: data.name || "Student",
            subject: data.subject || "Mathematics",
            gradeLevel: data.gradeLevel || "High School",
            budgetMax: data.budgetMax || 40,
            learningMode: data.learningMode || "Online",
            location: data.location || "Online",
            description: data.description || "Looking for a tutor",
            urgency: data.urgency || "Flexible",
          });
        });
        setRequests(rList);

        // 3. Fetch tutors from customers collection where role === "tutor"
        const custSnapshot = await getDocs(collection(db, "customers"));
        const tList: Tutor[] = [];
        custSnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.role === "tutor") {
            tList.push({
              id: docSnap.id,
              name: data.fullName || data.name || "Tutor",
              email: data.email || "",
              subject: data.subject || "Mathematics",
              gradeLevel: data.gradeLevel || "All Levels",
              hourlyRate: data.hourlyRate || 40,
              status: data.status || "Active",
              availability: data.availability || ["Mon 3:00 PM", "Wed 4:00 PM"],
            });
          }
        });
        setTutors(tList);

      } catch (err) {
        console.error("Error fetching sessions data from database:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDatabaseData();
  }, []);

  const handleAssignTutor = async (requestId: string, tutorId: string) => {
    const tutor = tutors.find(t => t.id === tutorId);
    const req = requests.find(r => r.id === requestId);
    if (!tutor || !req) return;

    try {
      const newBookingId = `b-${Date.now()}`;
      const newBooking: Booking = {
        id: newBookingId,
        tutorId: tutor.id,
        tutorName: tutor.name,
        studentName: req.name,
        studentEmail: `${req.name.toLowerCase().replace(/\s+/g, '.')}@student.com`,
        subject: req.subject,
        date: new Date().toISOString().split("T")[0],
        timeSlot: tutor.availability?.[0] || "Mon 3:00 PM",
        amount: req.budgetMax || 45,
        status: "Confirmed",
        escrowStatus: "Held in Escrow",
        learningMode: req.learningMode === "Both" ? "Online" : req.learningMode
      };

      await setDoc(doc(db, "bookings", newBookingId), newBooking);
      setBookings([newBooking, ...bookings]);
      alert(`Successfully assigned ${tutor.name} to ${req.name} for ${req.subject} and saved to database!`);
    } catch (err) {
      console.error("Error assigning tutor in database:", err);
      alert("Failed to assign tutor in database.");
    }
  };

  const handleAssignTutorToPaidStudent = async (tutor: Tutor) => {
    if (!currentStudentTx) return;

    try {
      const newBookingId = `b-${Date.now()}`;
      const newBooking: Booking = {
        id: newBookingId,
        tutorId: tutor.id,
        tutorName: tutor.name,
        studentName: currentStudentTx.studentName,
        studentEmail: currentStudentTx.studentEmail,
        subject: currentStudentTx.packageName,
        date: new Date().toISOString().split("T")[0],
        timeSlot: tutor.availability?.[0] || "Mon 3:00 PM",
        amount: currentStudentTx.amount || 45,
        status: "Confirmed",
        escrowStatus: "Held in Escrow",
        learningMode: "Online"
      };

      await setDoc(doc(db, "bookings", newBookingId), newBooking);
      setBookings([newBooking, ...bookings]);
      setAssignedTxIds([...assignedTxIds, currentStudentTx.id]);
      alert(`Successfully assigned ${tutor.name} to paid student ${currentStudentTx.studentName}! Saved to database.`);
      setAssignModalOpen(false);
      setCurrentStudentTx(null);
      setActiveTab("assign-tutors");
    } catch (err) {
      console.error("Error assigning tutor to paid student:", err);
      alert("Failed to assign tutor.");
    }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    if (!confirm("Are you sure you want to delete this assignment/booking?")) return;
    try {
      await deleteDoc(doc(db, "bookings", bookingId));
      setBookings(bookings.filter(b => b.id !== bookingId));
      alert("Booking assignment successfully deleted.");
    } catch (err) {
      console.error("Error deleting booking:", err);
      alert("Failed to delete booking.");
    }
  };

  const handleUpdateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBooking) return;

    const selectedTutor = tutors.find(t => t.id === editTutorId);
    const updatedTutorName = selectedTutor ? selectedTutor.name : currentBooking.tutorName;
    const updatedTutorId = selectedTutor ? selectedTutor.id : currentBooking.tutorId;

    try {
      await updateDoc(doc(db, "bookings", currentBooking.id), {
        tutorId: updatedTutorId,
        tutorName: updatedTutorName,
        date: editDate,
        timeSlot: editTimeSlot,
      });
      setBookings(bookings.map(b => b.id === currentBooking.id ? { 
        ...b, 
        tutorId: updatedTutorId, 
        tutorName: updatedTutorName, 
        date: editDate, 
        timeSlot: editTimeSlot 
      } : b));
      alert("Booking & Tutor re-assignment successfully updated!");
      setEditModalOpen(false);
      setCurrentBooking(null);
    } catch (err) {
      console.error("Error updating booking:", err);
      alert("Failed to update booking.");
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
    <div className="max-w-7xl mx-auto space-y-6 text-xs">
      {/* Tabs Navigation Bar */}
      <div className="flex border-b border-stone-800 gap-8 text-xs px-1">
        <button
          onClick={() => setActiveTab("paid-students")}
          className={`pb-3 font-medium transition cursor-pointer bg-transparent border-none ${
            activeTab === "paid-students"
              ? "text-amber-400 border-b-2 border-amber-500 font-semibold text-sm"
              : "text-stone-400 hover:text-stone-200"
          }`}
        >
          Paid Students ({transactions.length})
        </button>
        <button
          onClick={() => setActiveTab("assign-tutors")}
          className={`pb-3 font-medium transition cursor-pointer bg-transparent border-none ${
            activeTab === "assign-tutors"
              ? "text-amber-400 border-b-2 border-amber-500 font-semibold text-sm"
              : "text-stone-400 hover:text-stone-200"
          }`}
        >
          Assign Tutors & QA ({bookings.length})
        </button>
      </div>

      {/* Paid Students Table */}
      {activeTab === "paid-students" && (
        <div className="bg-stone-900 border border-stone-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="px-6 py-4 bg-stone-950 font-serif font-bold text-sm text-white flex items-center gap-2 border-b border-stone-800">
            <Users className="w-4 h-4 text-amber-500" /> Paid Student Subscriptions & Receipt Records ({transactions.length})
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-300">
              <thead className="bg-stone-950/50 uppercase tracking-wider text-stone-400 border-b border-stone-800">
                <tr>
                  <th className="py-3 px-6">Student Name</th>
                  <th className="py-3 px-6">Email</th>
                  <th className="py-3 px-6">Package Name</th>
                  <th className="py-3 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-stone-500">No paid student records found in database.</td>
                  </tr>
                ) : (
                  transactions.map((tx) => {
                    const isAssigned = assignedTxIds.includes(tx.id);
                    return (
                      <tr key={tx.id} className="hover:bg-stone-950/40">
                        <td className="py-4 px-6 font-semibold text-white text-sm">{tx.studentName}</td>
                        <td className="py-4 px-6 text-stone-300">{tx.studentEmail}</td>
                        <td className="py-4 px-6 text-amber-400 font-medium">{tx.packageName}</td>
                        <td className="py-4 px-6 text-right">
                          {isAssigned ? (
                            <span className="px-3.5 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-xl text-[11px] font-bold">
                              Assigned ✓
                            </span>
                          ) : (
                            <button
                              onClick={() => {
                                setCurrentStudentTx(tx);
                                setAssignModalOpen(true);
                              }}
                              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-xl text-[11px] font-bold shadow transition cursor-pointer"
                            >
                              Assign Tutor
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Assign Tutors & QA (Bookings) Table */}
      {activeTab === "assign-tutors" && (
        <div className="bg-stone-900 border border-stone-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="px-6 py-4 bg-stone-950 font-serif font-bold text-sm text-white flex items-center gap-2 border-b border-stone-800">
            <UserCheck className="w-4 h-4 text-amber-500" /> Assigned Students & Tutors QA Directory ({bookings.length})
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-300">
              <thead className="bg-stone-950/50 uppercase tracking-wider text-stone-400 border-b border-stone-800">
                <tr>
                  <th className="py-3 px-6">Student Name</th>
                  <th className="py-3 px-6">Assigned Tutor</th>
                  <th className="py-3 px-6">Subject & Slot</th>
                  <th className="py-3 px-6 text-right">QA Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800">
                {bookings.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-stone-500">No tutor assignments or student bookings found in database yet. Assign a tutor from the Paid Students tab!</td>
                  </tr>
                ) : (
                  bookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-stone-950/40">
                      <td className="py-4 px-6 font-semibold text-white text-sm">
                        {booking.studentName}
                        <span className="block text-[11px] text-stone-400 font-normal">{booking.studentEmail}</span>
                      </td>
                      <td className="py-4 px-6 text-stone-200 font-medium">{booking.tutorName}</td>
                      <td className="py-4 px-6 text-stone-400">
                        <span className="text-stone-200 font-medium">{booking.subject}</span>
                        <span className="block text-[11px] font-mono text-stone-500 mt-0.5">{booking.date} ({booking.timeSlot})</span>
                      </td>
                      <td className="py-4 px-6 text-right space-x-2">
                        <button
                          onClick={() => {
                            setCurrentBooking(booking);
                            setEditDate(booking.date);
                            setEditTimeSlot(booking.timeSlot);
                            setEditTutorId(booking.tutorId);
                            setEditModalOpen(true);
                          }}
                          className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 transition cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Re-assign / Edit
                        </button>
                        <button
                          onClick={() => handleDeleteBooking(booking.id)}
                          className="px-3 py-1.5 bg-red-600/10 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Card Listing All Tutors when Assign is clicked for a paid student */}
      {assignModalOpen && currentStudentTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl relative space-y-6 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => {
                setAssignModalOpen(false);
                setCurrentStudentTx(null);
              }}
              className="absolute top-6 right-6 text-stone-400 hover:text-white p-1 rounded-lg bg-stone-950 border border-stone-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-amber-500 text-xs font-semibold tracking-widest uppercase">Tutor Assignment Directory</span>
              <h2 className="text-2xl font-serif font-bold text-white mt-1">Assign Expert Tutor to {currentStudentTx.studentName}</h2>
              <p className="text-stone-400 text-xs font-light mt-0.5">Package: <strong className="text-amber-400">{currentStudentTx.packageName}</strong> (${currentStudentTx.amount})</p>
            </div>

            <div className="bg-stone-950 border border-stone-800 rounded-2xl shadow-xl overflow-hidden">
              <div className="px-6 py-4 bg-stone-950 font-serif font-bold text-sm text-white flex items-center gap-2 border-b border-stone-800">
                <ShieldCheck className="w-4 h-4 text-amber-500" /> Registered Tutors Directory ({tutors.length})
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-stone-300">
                  <thead className="bg-stone-950/50 uppercase tracking-wider text-stone-400 border-b border-stone-800">
                    <tr>
                      <th className="py-3 px-6">Tutor Name</th>
                      <th className="py-3 px-6">Email</th>
                      <th className="py-3 px-6">Subject & Grade</th>
                      <th className="py-3 px-6">Status</th>
                      <th className="py-3 px-6 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800">
                    {tutors.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-stone-500">No tutors found in database.</td>
                      </tr>
                    ) : (
                      tutors.map((tutor) => (
                        <tr key={tutor.id} className="hover:bg-stone-950/40">
                          <td className="py-4 px-6 font-semibold text-white text-sm">{tutor.name}</td>
                          <td className="py-4 px-6 text-stone-300 font-mono">{tutor.email}</td>
                          <td className="py-4 px-6 text-stone-400 font-mono">{tutor.subject} (${tutor.hourlyRate}/hr)</td>
                          <td className="py-4 px-6">
                            <span className={`px-2.5 py-0.5 rounded-full font-semibold text-[11px] ${
                              tutor.status === "Active" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" :
                              "bg-red-500/10 text-red-400 border border-red-500/30"
                            }`}>
                              {tutor.status}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <button
                              onClick={() => handleAssignTutorToPaidStudent(tutor)}
                              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-xl text-[11px] font-bold shadow transition cursor-pointer"
                            >
                              Assign This Tutor
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit / Re-assign Booking Modal */}
      {editModalOpen && currentBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative space-y-6">
            <button
              onClick={() => {
                setEditModalOpen(false);
                setCurrentBooking(null);
              }}
              className="absolute top-6 right-6 text-stone-400 hover:text-white p-1 rounded-lg bg-stone-950 border border-stone-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-amber-500 text-xs font-semibold tracking-widest uppercase">Re-assign & Edit</span>
              <h2 className="text-2xl font-serif font-bold text-white mt-1">Re-assign Tutor & Schedule</h2>
              <p className="text-stone-400 text-xs font-light mt-0.5">Student: {currentBooking.studentName}</p>
            </div>

            <form onSubmit={handleUpdateBooking} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-stone-300">Select Tutor (Re-assign)</label>
                <select
                  value={editTutorId}
                  onChange={(e) => setEditTutorId(e.target.value)}
                  className="w-full p-3 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                  required
                >
                  <option value="">Select Tutor...</option>
                  {tutors.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.subject} - ${t.hourlyRate}/hr)
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-stone-300">Session Date</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full p-3 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-stone-300">Time Slot</label>
                <input
                  type="text"
                  value={editTimeSlot}
                  onChange={(e) => setEditTimeSlot(e.target.value)}
                  placeholder="e.g. Mon 3:00 PM"
                  className="w-full p-3 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditModalOpen(false);
                    setCurrentBooking(null);
                  }}
                  className="px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-xl text-xs font-bold transition shadow"
                >
                  Save & Re-assign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
