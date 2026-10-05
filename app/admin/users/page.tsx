"use client";
// app/admin/users/page.tsx
import React, { useState, useEffect } from "react";
import { Users, Search, ShieldCheck, Ban, Loader2, Trash2 } from "lucide-react";
import { db } from "../../firebaseconfig";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: "student" | "tutor" | "admin";
  status: "Active" | "Suspended";
  subject?: string;
  gradeLevel?: string;
  enrolledCourses?: number;
}

export default function UsersManagementPage() {
  const [activeTab, setActiveTab] = useState<"tutors" | "students">("tutors");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const [tutorsList, setTutorsList] = useState<UserItem[]>([]);
  const [studentsList, setStudentsList] = useState<UserItem[]>([]);

  useEffect(() => {
    const fetchAllUsers = async () => {
      try {
        setLoading(true);

        const custSnapshot = await getDocs(collection(db, "customers"));
        const tutors: UserItem[] = [];
        const students: UserItem[] = [];

        custSnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const userObj: UserItem = {
            id: docSnap.id,
            name: data.fullName || data.name || "User",
            email: data.email || "",
            role: data.role || "student",
            status: data.status || "Active",
            subject: data.subject || "General",
            gradeLevel: data.gradeLevel || "All Levels",
            enrolledCourses: data.enrolledCourses || 2
          };

          if (userObj.role === "tutor") {
            tutors.push(userObj);
          } else if (userObj.role === "student") {
            students.push(userObj);
          }
        });

        setTutorsList(tutors);
        setStudentsList(students);
      } catch (err) {
        console.error("Error fetching database users:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAllUsers();
  }, []);

  const handleToggleUserStatus = async (id: string, currentStatus: string, roleType: "tutor" | "student") => {
    const newStatus = currentStatus === "Active" ? "Suspended" : "Active";
    try {
      await updateDoc(doc(db, "customers", id), { status: newStatus });
      if (roleType === "tutor") {
        setTutorsList(tutorsList.map(t => t.id === id ? { ...t, status: newStatus as any } : t));
      } else {
        setStudentsList(studentsList.map(s => s.id === id ? { ...s, status: newStatus as any } : s));
      }
    } catch (err) {
      console.error("Error updating user status:", err);
      alert("Failed to update status.");
    }
  };

  const handleDeleteUser = async (id: string, roleType: "tutor" | "student") => {
    if (!confirm("Are you sure you want to completely delete this user? This will remove their account from Firebase Authentication and Firestore database permanently.")) return;

    try {
      const res = await fetch("/api/admin/deleteUser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: id }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete user");
      }

      if (roleType === "tutor") {
        setTutorsList(tutorsList.filter(t => t.id !== id));
      } else {
        setStudentsList(studentsList.filter(s => s.id !== id));
      }
      alert("User account successfully deleted from Authentication and Firestore database.");
    } catch (err: any) {
      console.error("Error deleting user:", err);
      alert(err.message || "Failed to delete user.");
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
          onClick={() => setActiveTab("tutors")}
          className={`pb-3 font-medium transition cursor-pointer bg-transparent border-none ${
            activeTab === "tutors"
              ? "text-amber-400 border-b-2 border-amber-500 font-semibold text-sm"
              : "text-stone-400 hover:text-stone-200"
          }`}
        >
          Tutors Directory ({tutorsList.length})
        </button>
        <button
          onClick={() => setActiveTab("students")}
          className={`pb-3 font-medium transition cursor-pointer bg-transparent border-none ${
            activeTab === "students"
              ? "text-amber-400 border-b-2 border-amber-500 font-semibold text-sm"
              : "text-stone-400 hover:text-stone-200"
          }`}
        >
          Students Directory ({studentsList.length})
        </button>
      </div>

      {/* Tutors Table */}
      {activeTab === "tutors" && (
        <div className="bg-stone-900 border border-stone-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="px-6 py-4 bg-stone-950 font-serif font-bold text-sm text-white flex items-center gap-2 border-b border-stone-800">
            <ShieldCheck className="w-4 h-4 text-amber-500" /> Registered Tutors ({tutorsList.length})
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-300">
              <thead className="bg-stone-950/50 uppercase tracking-wider text-stone-400 border-b border-stone-800">
                <tr>
                  <th className="py-3 px-6">Tutor Name</th>
                  <th className="py-3 px-6">Email</th>
                  <th className="py-3 px-6">Subject & Grade</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800">
                {tutorsList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-stone-500">No users with role &quot;tutor&quot; found in database.</td>
                  </tr>
                ) : (
                  tutorsList
                    .filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()) || t.email.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((tutor) => (
                      <tr key={tutor.id} className="hover:bg-stone-950/40">
                        <td className="py-4 px-6 font-semibold text-white text-sm">{tutor.name}</td>
                        <td className="py-4 px-6 text-stone-300 font-mono">{tutor.email}</td>
                        <td className="py-4 px-6 text-stone-400 font-mono">{tutor.subject} ({tutor.gradeLevel})</td>
                        <td className="py-4 px-6">
                          <span className={`px-2.5 py-0.5 rounded-full font-semibold text-[11px] ${
                            tutor.status === "Active" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" :
                            "bg-red-500/10 text-red-400 border border-red-500/30"
                          }`}>
                            {tutor.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right space-x-2">
                          <button
                            onClick={() => handleToggleUserStatus(tutor.id, tutor.status, "tutor")}
                            title={tutor.status === "Active" ? "Suspend Tutor" : "Reactivate Tutor"}
                            className={`p-2 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition cursor-pointer ${
                              tutor.status === "Active"
                                ? "bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700"
                                : "bg-emerald-600 hover:bg-emerald-500 text-white"
                            }`}
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(tutor.id, "tutor")}
                            title="Permanently Delete Tutor"
                            className="p-2 bg-red-600/10 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* Students Directory Table */}
      {activeTab === "students" && (
        <div className="bg-stone-900 border border-stone-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="px-6 py-4 bg-stone-950 font-serif font-bold text-sm text-white flex items-center gap-2 border-b border-stone-800">
            <Users className="w-4 h-4 text-amber-500" /> Registered Students ({studentsList.length})
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-300">
              <thead className="bg-stone-950/50 uppercase tracking-wider text-stone-400 border-b border-stone-800">
                <tr>
                  <th className="py-3 px-6">Student Name</th>
                  <th className="py-3 px-6">Email</th>
                  <th className="py-3 px-6">Grade / Courses</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800">
                {studentsList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-stone-500">No users with role &quot;student&quot; found in database.</td>
                  </tr>
                ) : (
                  studentsList
                    .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.email.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((student) => (
                      <tr key={student.id} className="hover:bg-stone-950/40">
                        <td className="py-4 px-6 font-semibold text-white text-sm">{student.name}</td>
                        <td className="py-4 px-6 text-stone-300 font-mono">{student.email}</td>
                        <td className="py-4 px-6 text-stone-400 font-mono">{student.gradeLevel} ({student.enrolledCourses} Courses)</td>
                        <td className="py-4 px-6">
                          <span className={`px-2.5 py-0.5 rounded-full font-semibold text-[11px] ${
                            student.status === "Active" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" :
                            "bg-red-500/10 text-red-400 border border-red-500/30"
                          }`}>
                            {student.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right space-x-2">
                          <button
                            onClick={() => handleToggleUserStatus(student.id, student.status, "student")}
                            title={student.status === "Active" ? "Suspend Student" : "Reactivate Student"}
                            className={`p-2 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition cursor-pointer ${
                              student.status === "Active"
                                ? "bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700"
                                : "bg-emerald-600 hover:bg-emerald-500 text-white"
                            }`}
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(student.id, "student")}
                            title="Permanently Delete Student"
                            className="p-2 bg-red-600/10 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
    </div>
  );
}
